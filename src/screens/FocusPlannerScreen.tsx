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
    AppState,
} from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import ForegroundService from '@supersami/rn-foreground-service';

// Native modules
interface AppInfo { name: string; pkg: string; }
const { AppDetector, AppKiller, OverlayService, CurrentApp } = NativeModules;

// Days and hours
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
type Day = typeof DAYS[number];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAILY_TARGET = 60;

// Always-allowed packages
const ALLOWED_PACKAGES = new Set<string>([
    'com.main',
    'com.android.systemui',
    'com.android.settings',
    'com.android.messaging', 'com.google.android.apps.messaging',
    'com.android.dialer', 'com.google.android.dialer',
    'com.android.launcher3', 'com.google.android.apps.nexuslauncher',
]);

export default function FocusPlannerScreen() {
    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

    // Overlay permission
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

    // App state (background/foreground)
    const [appState, setAppState] = useState(AppState.currentState);
    useEffect(() => {
        const sub = AppState.addEventListener('change', setAppState);
        return () => sub.remove();
    }, []);

    // Week range
    const [weekRange, setWeekRange] = useState<{ monday: Date; sunday: Date }>({ monday: new Date(), sunday: new Date() });
    useEffect(() => {
        const today = new Date();
        const dow = today.getDay();
        const offset = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(today); monday.setDate(today.getDate() + offset);
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        setWeekRange({ monday, sunday });
    }, []);

    // Timetable
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
                    const userApps = list.filter(a => !a.pkg.startsWith('android.'));
                    setApps(userApps);
                    const initial = new Set(userApps.filter(a => !ALLOWED_PACKAGES.has(a.pkg)).map(a => a.pkg));
                    setRestricted(initial);
                });
        }
    }, []);

    // Debug mode override
    const [debugMode, setDebugMode] = useState(false);
    const handleDebugFocus = () => {
        setDebugMode(prev => {
            const next = !prev;
            if (next) {
                ForegroundService.start({ id: 1, title: 'Focus Mode', message: 'Blocking restricted apps' });
                OverlayService.startOverlay();
                restricted.forEach((pkg: string) => AppKiller.killApp(pkg));
            } else {
                OverlayService.stopOverlay();
                ForegroundService.stop();
            }
            return next;
        });
    };

    // Background enforcement & counting
    useEffect(() => {
        const id = BackgroundTimer.setInterval(() => {
            const now = new Date();
            const idx = now.getDay() - 1;
            if (idx < 0) return;
            const hour = now.getHours();
            if (debugMode || timetable[DAYS[idx]].has(hour)) {
                restricted.forEach((pkg: string) => AppKiller.killApp(pkg));
                setFocusMinutes(m => Math.min(m + 1, DAILY_TARGET));
            }
        }, 60000);
        return () => { BackgroundTimer.clearInterval(id); ForegroundService.stop(); };
    }, [timetable, restricted, debugMode]);

    // Foreground overlay logic
    useEffect(() => {
        const id = BackgroundTimer.setInterval(async () => {
            if (debugMode) {
                OverlayService.startOverlay(); return;
            }
            if (appState !== 'active') { OverlayService.stopOverlay(); return; }

            let pkg = '';
            try { pkg = await CurrentApp.getForegroundApp(); } catch { OverlayService.stopOverlay(); return; }

            if (ALLOWED_PACKAGES.has(pkg) || !restricted.has(pkg)) {
                OverlayService.stopOverlay();
            } else {
                const now = new Date();
                const idx = now.getDay() - 1;
                const inSlot = idx >= 0 && timetable[DAYS[idx]].has(now.getHours());
                inSlot ? OverlayService.startOverlay() : OverlayService.stopOverlay();
            }
        }, 3000);
        return () => BackgroundTimer.clearInterval(id);
    }, [timetable, restricted, debugMode, appState]);

    // UI helpers
    const toggleSlot = (day: Day, hour: number) => setTimetable(prev => {
        const next = { ...prev, [day]: new Set(prev[day]) };
        next[day].has(hour) ? next[day].delete(hour) : next[day].add(hour);
        return next;
    });
    const toggleRestrict = (pkg: string) => setRestricted(prev => {
        const next = new Set(prev);
        next.has(pkg) ? next.delete(pkg) : next.add(pkg);
        return next;
    });

    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const renderHeader = () => (
        <View style={styles.row}>
            <Text style={[styles.hourLabel, styles.headerSpacer]} />
            {DAYS.map(d => <Text key={d} style={styles.dayLabel}>{d}</Text>)}
        </View>
    );
    const renderRow = (hour: number) => (
        <View style={styles.row} key={hour}>
            <Text style={styles.hourLabel}>{hour}:00</Text>
            {DAYS.map(d => (
                <TouchableOpacity
                    key={d}
                    style={[styles.slot, timetable[d].has(hour) && styles.slotActive]}
                    onPress={() => toggleSlot(d, hour)}>
                    {timetable[d].has(hour) && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {!overlayPermission && (
                <View style={styles.permissionPrompt}>
                    <Text style={styles.permissionText}>Overlay permission required.</Text>
                    <Button title="Grant" onPress={() => OverlayService.requestPermission()} />
                </View>
            )}
            <ScrollView contentContainerStyle={{ paddingTop: statusBarHeight + 16, paddingBottom: 32 }}>
                <View style={styles.debugContainer}>
                    <Button title={debugMode ? 'Stop Debug' : 'Debug Focus'} onPress={handleDebugFocus} />
                </View>
                <Text style={styles.header}>Weekly Timetable</Text>
                <Text style={styles.description}>Choose times to avoid phone use</Text>
                <Text style={styles.weekRange}>{fmt(weekRange.monday)} – {fmt(weekRange.sunday)}</Text>
                <View style={styles.timetableWrapper}>
                    <ScrollView nestedScrollEnabled>{renderHeader()}{HOURS.map(renderRow)}</ScrollView>
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
                <Text style={styles.progressText}>{focusMinutes} / {DAILY_TARGET} min</Text>
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
    timetableWrapper: { margin: 16, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, maxHeight: 300 },
    slot: { flex: 1, height: 32, margin: 2, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
    slotActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
    check: { color: '#fff', fontWeight: 'bold' },
    appRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginHorizontal: 16 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeAllowed: { backgroundColor: '#E0F7FA' },
    badgeRestricted: { backgroundColor: '#FFCDD2' },
    badgeText: { fontSize: 12 },
    progressBarBackground: { height: 10, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden', margin: 16 },
    progressBarFill: { height: '100%', backgroundColor: '#E91E63' },
    progressText: { textAlign: 'right', fontSize: 14, marginHorizontal: 16, marginBottom: 16 },
});