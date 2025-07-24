import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Platform,
    NativeModules,
    StyleSheet,
    SafeAreaView,
} from 'react-native';

// native modules: kill apps and list installed apps
const { AppKiller, AppDetector } = NativeModules;

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS: number[] = Array.from({ length: 24 }, (_v, i) => i);

export default function FocusPlannerScreen() {
    // timetable: selected focus hours per day
    const [timetable, setTimetable] = useState<Record<Day, Set<number>>>(() =>
        DAYS.reduce((acc, d) => { acc[d] = new Set<number>(); return acc; }, {} as Record<Day, Set<number>>)
    );

    // list of installed apps and restricted set
    const [apps, setApps] = useState<{ name: string; pkg: string }[]>([]);
    const [restricted, setRestricted] = useState<Set<string>>(new Set());

    // daily focus minutes
    const [focusMinutes, setFocusMinutes] = useState(0);
    const DAILY_TARGET = 60;

    // load installed apps on mount (Android only)
    useEffect(() => {
        if (Platform.OS === 'android' && AppDetector?.getInstalledApps) {
            AppDetector.getInstalledApps()
                .then((list: { name: string; pkg: string }[]) => {
                    setApps(list);
                    // by default, restrict all detected apps
                    setRestricted(new Set(list.map(app => app.pkg)));
                })
                .catch((err: string) => console.warn('App detection failed', err));
        }
    }, []);

    // toggle focus slot
    const toggleSlot = (day: Day, hour: number) => {
        setTimetable(ts => {
            const next = { ...ts, [day]: new Set(ts[day]) };
            if (next[day].has(hour)) next[day].delete(hour);
            else next[day].add(hour);
            return next;
        });
    };

    // toggle app restriction
    const toggleRestrict = (pkg: string) => {
        setRestricted(r => {
            const next = new Set(r);
            if (next.has(pkg)) next.delete(pkg);
            else next.add(pkg);
            return next;
        });
    };

    // every minute, check if in focus slot and kill restricted
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const dayIndex = now.getDay() - 1;
            if (dayIndex < 0) return; // Sunday maps to index -1
            const day = DAYS[dayIndex];
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

    // render hour row
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
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Weekly Timetable</Text>
            <FlatList
                data={HOURS}
                keyExtractor={h => h.toString()}
                renderItem={({ item }) => renderRow(item)}
            />

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
                        <View style={[
                            styles.badge,
                            isRestricted ? styles.badgeRestricted : styles.badgeAllowed
                        ]}>
                            <Text style={styles.badgeText}>
                                {isRestricted ? 'Restricted' : 'Allowed'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}

            <Text style={styles.subheader}>Daily Focus Goal</Text>
            <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${(focusMinutes / DAILY_TARGET) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
                {focusMinutes} min / {DAILY_TARGET} min
            </Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    header: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
    subheader: { fontSize: 18, fontWeight: '500', marginTop: 20, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    hourLabel: { width: 50 },
    slot: {
        flex: 1,
        height: 32,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    slotActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
    check: { color: '#fff', fontWeight: 'bold' },

    appRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeAllowed: { backgroundColor: '#E0F7FA' },
    badgeRestricted: { backgroundColor: '#FFCDD2' },
    badgeText: { fontSize: 12 },

    progressBarBackground: {
        height: 10,
        backgroundColor: '#eee',
        borderRadius: 5,
        overflow: 'hidden',
        marginVertical: 8,
    },
    progressBarFill: { height: '100%', backgroundColor: '#E91E63' },
    progressText: { textAlign: 'right', fontSize: 14 },
});
