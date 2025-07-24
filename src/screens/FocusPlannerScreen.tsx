// src/screens/FocusPlannerScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Platform,
    NativeModules,
    StyleSheet,
    SafeAreaView,
    StatusBar,
} from 'react-native';

const { AppKiller, AppDetector } = NativeModules;

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS: number[] = Array.from({ length: 24 }, (_v, i) => i);

export default function FocusPlannerScreen() {
    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
    const [timetable, setTimetable] = useState<Record<Day, Set<number>>>(() =>
        DAYS.reduce((acc, d) => { acc[d] = new Set<number>(); return acc; }, {} as Record<Day, Set<number>>)
    );
    const [apps, setApps] = useState<{ name: string; pkg: string }[]>([]);
    const [restricted, setRestricted] = useState<Set<string>>(new Set());
    const [focusMinutes, setFocusMinutes] = useState(0);
    const DAILY_TARGET = 60;

    useEffect(() => {
        if (Platform.OS === 'android' && AppDetector?.getInstalledApps) {
            AppDetector.getInstalledApps()
                .then((list: { name: string; pkg: string }[]) => {
                    const userApps = list.filter(app =>
                        !app.pkg.startsWith('com.android') && !app.pkg.startsWith('android.')
                    );
                    setApps(userApps);
                    setRestricted(new Set(userApps.map(app => app.pkg)));
                })
                .catch((err: String) => console.warn('App detection failed', err));
        }
    }, []);

    const toggleSlot = (day: Day, hour: number) => {
        console.log(`toggle ${day} ${hour}`);
        setTimetable(ts => {
            const next = { ...ts, [day]: new Set(ts[day]) };
            next[day].has(hour) ? next[day].delete(hour) : next[day].add(hour);
            return next;
        });
    };

    const toggleRestrict = (pkg: string) => {
        setRestricted(r => {
            const next = new Set(r);
            next.has(pkg) ? next.delete(pkg) : next.add(pkg);
            return next;
        });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const idx = now.getDay() - 1;
            if (idx < 0) return;
            const day = DAYS[idx];
            const hour = now.getHours();
            if (timetable[day].has(hour)) {
                if (Platform.OS === 'android' && AppKiller?.killApp) {
                    restricted.forEach(pkg => AppKiller.killApp(pkg));
                }
                setFocusMinutes(m => Math.min(m + 1, DAILY_TARGET));
            }
        }, 60_000);
        return () => clearInterval(interval);
    }, [timetable, restricted]);

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

    return (
        <SafeAreaView style={[styles.container, { paddingTop: statusBarHeight + 8 }]}>
            <Text style={styles.header}>Weekly Timetable</Text>
            <View style={styles.timetableWrapper}>
                <ScrollView
                    contentContainerStyle={styles.timetableContainer}
                    style={styles.timetableScroll}
                    nestedScrollEnabled
                >
                    {HOURS.map(hour => renderRow(hour))}
                </ScrollView>
            </View>

            <Text style={styles.subheader}>App Restrictions</Text>
            {apps.map(app => {
                const isRestricted = restricted.has(app.pkg);
                return (
                    <TouchableOpacity
                        key={app.pkg}
                        style={styles.appRow}
                        onPress={() => toggleRestrict(app.pkg)}
                    >
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#fff' },
    header: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
    timetableWrapper: { height: 360, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, marginBottom: 16 },
    timetableScroll: { flex: 1 },
    timetableContainer: { paddingVertical: 8 },
    subheader: { fontSize: 18, fontWeight: '500', marginTop: 20, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
    hourLabel: { width: 50 },
    slot: { flex: 1, height: 32, marginHorizontal: 4, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
    slotActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
    check: { color: '#fff', fontWeight: 'bold' },
    appRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }, badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeAllowed: { backgroundColor: '#E0F7FA' }, badgeRestricted: { backgroundColor: '#FFCDD2' }, badgeText: { fontSize: 12 },
    progressBarBackground: { height: 10, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden', marginVertical: 8 },
    progressBarFill: { height: '100%', backgroundColor: '#E91E63' }, progressText: { textAlign: 'right', fontSize: 14 }
});
