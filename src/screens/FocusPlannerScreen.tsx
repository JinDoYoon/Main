// src/screens/FocusPlannerScreen.tsx
import React, { useState, useEffect, JSX } from 'react';
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    StatusBar,
    Button,
    NativeModules,
    Linking,
} from 'react-native';
import BackgroundTimer from 'react-native-background-timer';

// Native modules for app detection, killing, and overlay control
const { AppDetector, AppKiller, OverlayService } = NativeModules;

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_v, i) => i);
const DAILY_TARGET = 60;

export default function FocusPlannerScreen() {
    // Track overlay permission state
    const [overlayPermission, setOverlayPermission] = useState(false);

    // On mount, check and request overlay permission if needed
    useEffect(() => {
        if (Platform.OS === 'android' && OverlayService.hasPermission) {
            OverlayService.hasPermission((granted: boolean) => {
                setOverlayPermission(granted);
                if (!granted && OverlayService.requestPermission) {
                    OverlayService.requestPermission();
                }
            });
        }
    }, []);
    (): JSX.Element => {
        const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

        // Compute current week range
        const [weekRange, setWeekRange] = useState<{ monday: Date; sunday: Date }>({ monday: new Date(), sunday: new Date() });
        useEffect(() => {
            const today = new Date();
            const dow = today.getDay(); // 0 = Sunday
            const offset = dow === 0 ? -6 : 1 - dow;
            const monday = new Date(today);
            monday.setDate(today.getDate() + offset);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            setWeekRange({ monday, sunday });
        }, []);

        // Timetable state: selected focus slots
        const [timetable, setTimetable] = useState<Record<Day, Set<number>>>(() =>
            DAYS.reduce((acc, d) => ({ ...acc, [d]: new Set<number>() }), {} as Record<Day, Set<number>>)
        );

        // Focus minutes counter
        const [focusMinutes, setFocusMinutes] = useState(0);

        // App detection & restriction state
        const [apps, setApps] = useState<{ name: string; pkg: string }[]>([]);
        const [restricted, setRestricted] = useState<Set<string>>(new Set());

        // Request overlay permission on mount
        useEffect(() => {
            if (Platform.OS === 'android' && OverlayService.hasPermission) {
                OverlayService.hasPermission((granted: boolean) => {
                    if (!granted) Linking.openSettings();
                });
            }
        }, []);

        // Load installed user apps & set default restrictions
        useEffect(() => {
            if (Platform.OS === 'android' && AppDetector.getInstalledApps) {
                AppDetector.getInstalledApps()
                    .then((list: { name: string; pkg: string }[]) => {
                        const userApps = list.filter(a => !a.pkg.startsWith('com.android') && !a.pkg.startsWith('android.'));
                        setApps(userApps);
                        const allowed = new Set(['com.android.messaging', 'com.android.dialer', 'com.android.settings']);
                        const initial = new Set(userApps.filter(a => !allowed.has(a.pkg)).map(a => a.pkg));
                        setRestricted(initial);
                    })
                    .catch((e: any) => console.warn('App detection failed', e));
            }
        }, []);

        // Background enforcement: kill restricted apps & count minutes every minute
        useEffect(() => {
            const id = BackgroundTimer.setInterval(() => {
                const now = new Date();
                const idx = now.getDay() - 1;
                if (idx < 0) return;
                const day = DAYS[idx];
                const hour = now.getHours();
                if (timetable[day].has(hour)) {
                    // Kill background processes
                    restricted.forEach(pkg => AppKiller.killApp(pkg));
                    // Count focus time
                    setFocusMinutes(m => Math.min(m + 1, DAILY_TARGET));
                }
            }, 60000);
            return () => BackgroundTimer.clearInterval(id);
        }, [timetable, restricted]);

        // Foreground overlay: show overlay whenever in focus slot, always
        useEffect(() => {
            const id = BackgroundTimer.setInterval(() => {
                const now = new Date();
                const idx = now.getDay() - 1;
                if (idx < 0) return;
                const day = DAYS[idx];
                const hour = now.getHours();
                if (timetable[day].has(hour)) {
                    OverlayService.startOverlay();
                } else {
                    OverlayService.stopOverlay();
                }
            }, 3000);
            return () => BackgroundTimer.clearInterval(id);
        }, [timetable]);

        // Debug: manually trigger current slot and enforcement
        const handleDebugFocus = (): void => {
            OverlayService.startOverlay();
            restricted.forEach(pkg => AppKiller.killApp(pkg));
        };

        // Toggle a time slot and enforce immediately if it's the current slot
        function toggleSlot(day: Day, hour: number): void {
            setTimetable(prev => {
                const next = { ...prev, [day]: new Set(prev[day]) };
                if (next[day].has(hour)) next[day].delete(hour);
                else next[day].add(hour);
                // If toggled for current time, enforce immediately
                const now = new Date();
                const curDay = DAYS[now.getDay() - 1];
                const curHour = now.getHours();
                if (day === curDay && hour === curHour) {
                    if (next[day].has(hour)) {
                        OverlayService.startOverlay();
                        restricted.forEach(pkg => AppKiller.killApp(pkg));
                    } else {
                        OverlayService.stopOverlay();
                    }
                }
                return next;
            });
        }

        // Toggle restriction on an app
        function toggleRestrict(pkg: string): void {
            setRestricted(prev => {
                const next = new Set(prev);
                if (next.has(pkg)) next.delete(pkg);
                else next.add(pkg);
                return next;
            });
        }

        // Render header row
        const renderHeader = () => (
            <View style={styles.row}>
                <Text style={[styles.hourLabel, styles.headerSpacer]} />
                {DAYS.map(day => <Text key={day} style={styles.dayLabel}>{day}</Text>)}
            </View>
        );

        // Render one hour row
        const renderRow = (hour: number) => (
            <View style={styles.row} key={hour}>
                <Text style={styles.hourLabel}>{hour}:00</Text>
                {DAYS.map(day => {
                    const active = timetable[day].has(hour);
                    return (
                        <TouchableOpacity
                            key={day}
                            style={[styles.slot, active && styles.slotActive]}
                            onPress={() => toggleSlot(day, hour)}
                        >
                            {active && <Text style={styles.check}>✓</Text>}
                        </TouchableOpacity>
                    );
                })}
            </View>
        );

        const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        return (
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={{ paddingTop: statusBarHeight + 16, paddingBottom: 32 }}>
                    <View style={styles.debugContainer}>
                        <Button title="Debug Focus" onPress={handleDebugFocus} />
                    </View>
                    <Text style={styles.header}>Weekly Timetable</Text>
                    <Text style={styles.description}>Choose your times to avoid phone use</Text>
                    <Text style={styles.weekRange}>{fmt(weekRange.monday)} - {fmt(weekRange.sunday)}</Text>

                    <View style={styles.timetableWrapper}>
                        <ScrollView nestedScrollEnabled>
                            {renderHeader()}
                            {HOURS.map(renderRow)}
                        </ScrollView>
                    </View>

                    <Text style={styles.subheader}>App Restrictions</Text>
                    {apps.map(app => {
                        const isRestricted = restricted.has(app.pkg);
                        return (
                            <TouchableOpacity key={app.pkg} style={styles.appRow} onPress={() => toggleRestrict(app.pkg)}>
                                <Text>{app.name}</Text>
                                <View style={[styles.badge, isRestricted ? styles.badgeRestricted : styles.badgeAllowed]}>
                                    <Text style={styles.badgeText}>{isRestricted ? 'Restricted' : 'Allowed'}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    <Text style={styles.subheader}>Daily Focus Goal</Text>
                    <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${(focusMinutes / DAILY_TARGET) * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{focusMinutes} min / {DAILY_TARGET} min</Text>
                </ScrollView>
            </SafeAreaView>
        );
    }

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: '#fff' },
        debugContainer: { margin: 16 },
        header: { fontSize: 24, fontWeight: '600', marginHorizontal: 16, marginBottom: 4 },
        description: { fontSize: 14, color: '#555', marginHorizontal: 16, marginBottom: 4 },
        weekRange: { fontSize: 14, color: '#555', marginHorizontal: 16, marginBottom: 12 },
        subheader: { fontSize: 18, fontWeight: '500', marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
        row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginHorizontal: 8 },
        hourLabel: { width: 50, fontWeight: '500' },
        headerSpacer: { backgroundColor: 'transparent' },
        dayLabel: { flex: 1, textAlign: 'center', fontWeight: '500' },
        timetableWrapper: { marginHorizontal: 16, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, maxHeight: 300 },
        slot: { flex: 1, height: 32, marginHorizontal: 2, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
        slotActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
        check: { color: '#fff', fontWeight: 'bold' },
        appRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginHorizontal: 16 },
        badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
        badgeAllowed: { backgroundColor: '#E0F7FA' },
        badgeRestricted: { backgroundColor: '#FFCDD2' },
        badgeText: { fontSize: 12 },
        progressBarBackground: { height: 10, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden', marginVertical: 8, marginHorizontal: 16 },
        progressBarFill: { height: '100%', backgroundColor: '#E91E63' },
        progressText: { textAlign: 'right', fontSize: 14, marginHorizontal: 16, marginBottom: 16 }
    });
}