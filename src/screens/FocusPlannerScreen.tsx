import React, { useState, useEffect } from 'react';
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

// Native modules
interface AppInfo { name: string; pkg: string; }
const { AppDetector, AppKiller, OverlayService, CurrentApp } = NativeModules;

// Days and hours constants
type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAILY_TARGET = 60;

// Apps that should never be blocked
const ALLOWED_PACKAGES = new Set<string>([
    'com.main',
    'com.android.messaging', 'com.google.android.apps.messaging',
    'com.android.dialer', 'com.google.android.dialer',
    'com.android.settings',
    'com.android.systemui',
    'com.android.launcher3', 'com.google.android.apps.nexuslauncher'
]);

export default function FocusPlannerScreen() {
    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

    // Overlay permission state
    const [overlayPermission, setOverlayPermission] = useState(false);
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

    // Compute current week range
    const [weekRange, setWeekRange] = useState<{ monday: Date; sunday: Date }>({ monday: new Date(), sunday: new Date() });
    useEffect(() => {
        const today = new Date();
        const dow = today.getDay();
        const offset = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(today);
        monday.setDate(today.getDate() + offset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        setWeekRange({ monday, sunday });
    }, []);

    // Focus timetable state
    const [timetable, setTimetable] = useState<Record<Day, Set<number>>>(() =>
        DAYS.reduce((acc, d) => ({ ...acc, [d]: new Set<number>() }), {} as Record<Day, Set<number>>)
    );
    const [focusMinutes, setFocusMinutes] = useState(0);

    // Installed apps & restrictions
    const [apps, setApps] = useState<AppInfo[]>([]);
    const [restricted, setRestricted] = useState<Set<string>>(new Set());
    useEffect(() => {
        if (Platform.OS === 'android' && AppDetector.getInstalledApps) {
            AppDetector.getInstalledApps()
                .then((list: AppInfo[]) => {
                    // Filter out system apps but keep those in ALLOWED_PACKAGES
                    const userApps = list.filter(a => !a.pkg.startsWith('com.android') && !a.pkg.startsWith('android.'));
                    setApps(userApps);
                    // Restrict all except allowed
                    const initial = new Set(userApps.filter(a => !ALLOWED_PACKAGES.has(a.pkg)).map(a => a.pkg));
                    setRestricted(initial);
                })
                .catch((e: any) => console.warn('App detection failed', e));
        }
    }, []);

    // Debug mode override
    const [debugMode, setDebugMode] = useState(false);
    const handleDebugFocus = () => {
        setDebugMode(prev => {
            const next = !prev;
            if (next) {
                OverlayService.startOverlay();
                restricted.forEach(pkg => AppKiller.killApp(pkg));
            } else {
                OverlayService.stopOverlay();
            }
            return next;
        });
    };

    // Background kill & focus counting
    useEffect(() => {
        const id = BackgroundTimer.setInterval(() => {
            const now = new Date();
            const idx = now.getDay() - 1;
            if (idx < 0) return;
            const day = DAYS[idx];
            const hour = now.getHours();
            if (debugMode || timetable[day].has(hour)) {
                restricted.forEach(pkg => AppKiller.killApp(pkg));
                setFocusMinutes(m => Math.min(m + 1, DAILY_TARGET));
            }
        }, 60000);
        return () => BackgroundTimer.clearInterval(id);
    }, [timetable, restricted, debugMode]);

    // Foreground overlay logic
    useEffect(() => {
        const id = BackgroundTimer.setInterval(async () => {
            if (debugMode) {
                OverlayService.startOverlay();
                return;
            }
            const now = new Date();
            const idx = now.getDay() - 1;
            if (idx < 0 || !timetable[DAYS[idx]].has(now.getHours())) {
                OverlayService.stopOverlay();
                return;
            }
            if (Platform.OS === 'android' && CurrentApp.getForegroundApp) {
                try {
                    const pkg: string = await CurrentApp.getForegroundApp();
                    if (restricted.has(pkg)) OverlayService.startOverlay();
                    else OverlayService.stopOverlay();
                } catch {
                    OverlayService.stopOverlay();
                }
            }
        }, 3000);
        return () => BackgroundTimer.clearInterval(id);
    }, [timetable, restricted, debugMode]);

    // Helpers to toggle
    const toggleSlot = (day: Day, hour: number) => {
        setTimetable(prev => {
            const next = { ...prev, [day]: new Set(prev[day]) };
            next[day].has(hour) ? next[day].delete(hour) : next[day].add(hour);
            return next;
        });
    };
    const toggleRestrict = (pkg: string) => {
        setRestricted(prev => {
            const next = new Set(prev);
            next.has(pkg) ? next.delete(pkg) : next.add(pkg);
            return next;
        });
    };

    // Render functions
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const renderHeader = () => (
        <View style={styles.row}>
            <Text style={[styles.hourLabel, styles.headerSpacer]} />
            {DAYS.map(day => <Text key={day} style={styles.dayLabel}>{day}</Text>)}
        </View>
    );
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

    // UI
    return (
        <SafeAreaView style={styles.container}>
            {!overlayPermission && (
                <View style={styles.permissionPrompt}>
                    <Text style={styles.permissionText}>Overlay permission required.</Text>
                    <Button title="Grant Permission" onPress={() => OverlayService.requestPermission()} />
                </View>
            )}
            <ScrollView contentContainerStyle={{ paddingTop: statusBarHeight + 16, paddingBottom: 32 }}>
                <View style={styles.debugContainer}>
                    <Button title={debugMode ? 'Stop Debug' : 'Debug Focus'} onPress={handleDebugFocus} />
                </View>
                <Text style={styles.header}>Weekly Timetable</Text>
                <Text style={styles.description}>Choose times to avoid phone use</Text>
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
    permissionPrompt: { padding: 16, backgroundColor: '#ffeeee', alignItems: 'center' },
    permissionText: { color: '#900', marginBottom: 8 },
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
