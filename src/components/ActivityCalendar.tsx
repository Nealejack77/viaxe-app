import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Tokens } from '../context/ThemeContext';
import { useAppStore } from '../store/useAppStore';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const makeStyles = (t: Tokens) => StyleSheet.create({
  card: { backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 18, padding: 16 },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  month: { fontSize: 15, fontWeight: '800', color: t.text, letterSpacing: -0.2 },
  nav: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: t.glassBorder, alignItems: 'center', justifyContent: 'center' },
  navTxt: { fontSize: 16, color: t.textSec, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekCell: { flex: 1, alignItems: 'center' },
  weekTxt: { fontSize: 9, fontWeight: '700', color: t.textMuted, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  dayDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayTxt: { fontSize: 13, color: t.textSec, fontFamily: t.mono },
  active: { backgroundColor: t.redDim, borderWidth: 1, borderColor: t.redBorder },
  activeTxt: { color: t.red, fontWeight: '800' },
  todayRing: { borderWidth: 1.5, borderColor: t.text },
  checkDot: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: t.gold },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendTxt: { fontSize: 10, color: t.textMuted },
});

export default function ActivityCalendar() {
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const store = useAppStore();

  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const { workoutDays, checkinDays } = useMemo(() => {
    const w = new Set<string>();
    for (const sess of store.sessions) if (sess.date) w.add(sess.date);
    const c = new Set<string>();
    for (const ci of store.checkIns) if (ci.createdAt) c.add(String(ci.createdAt).split('T')[0]);
    return { workoutDays: w, checkinDays: c };
  }, [store.sessions, store.checkIns]);

  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  // JS getDay: 0=Sun..6=Sat → shift to Mon=0..Sun=6
  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const shift = (delta: number) => {
    setView(v => {
      const nm = v.m + delta;
      return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  };

  return (
    <View style={s.card}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.nav} onPress={() => shift(-1)}><Text style={s.navTxt}>‹</Text></TouchableOpacity>
        <Text style={s.month}>{MONTHS[view.m]} {view.y}</Text>
        <TouchableOpacity style={s.nav} onPress={() => shift(1)}><Text style={s.navTxt}>›</Text></TouchableOpacity>
      </View>

      <View style={s.weekRow}>
        {WEEKDAYS.map((w, i) => <View key={i} style={s.weekCell}><Text style={s.weekTxt}>{w}</Text></View>)}
      </View>

      <View style={s.grid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={s.cell} />;
          const date = iso(view.y, view.m, d);
          const isWorkout = workoutDays.has(date);
          const isCheckin = checkinDays.has(date);
          const isToday = date === todayIso;
          return (
            <View key={date} style={s.cell}>
              <View style={[s.dayDot, isWorkout && s.active, isToday && s.todayRing]}>
                <Text style={[s.dayTxt, isWorkout && s.activeTxt]}>{d}</Text>
                {isCheckin && !isWorkout && <View style={s.checkDot} />}
              </View>
            </View>
          );
        })}
      </View>

      <View style={s.legend}>
        <View style={s.legendItem}><View style={[s.dayDot, s.active, { width: 12, height: 12, borderRadius: 6 }]} /><Text style={s.legendTxt}>Workout</Text></View>
        <View style={s.legendItem}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.gold }} /><Text style={s.legendTxt}>Check-in</Text></View>
      </View>
    </View>
  );
}
