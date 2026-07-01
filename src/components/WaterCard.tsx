import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Tokens } from '../context/ThemeContext';
import { useAppStore } from '../store/useAppStore';

const today = () => new Date().toISOString().split('T')[0];

const makeStyles = (t: Tokens) => StyleSheet.create({
  card: { backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: t.textMuted },
  value: { fontSize: 26, fontWeight: '900', color: t.text, fontFamily: t.mono, letterSpacing: -1 },
  unit: { fontSize: 13, fontWeight: '600', color: t.textMuted, fontFamily: t.mono },
  goal: { fontSize: 11, color: t.textMuted, fontFamily: t.mono },
  track: { height: 8, borderRadius: 4, backgroundColor: t.border, overflow: 'hidden', marginBottom: 14 },
  fill: { height: 8, borderRadius: 4, backgroundColor: t.red },
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: t.redBorder, backgroundColor: t.redDim, alignItems: 'center' },
  btnTxt: { fontSize: 13, fontWeight: '800', color: t.red },
  undo: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: t.glassBorder, backgroundColor: t.glass, alignItems: 'center', justifyContent: 'center' },
  undoTxt: { fontSize: 13, fontWeight: '700', color: t.textSec },
});

export default function WaterCard() {
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const store = useAppStore();

  const ml = store.waterLog[today()] || 0;
  const goal = store.waterGoalMl || 2500;
  const pct = Math.min(100, Math.round((ml / goal) * 100));
  const glasses = Math.round(ml / 250);

  const add = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    store.logWater(amount);
  };

  return (
    <View style={s.card}>
      <View style={s.row}>
        <View>
          <Text style={s.label}>WATER TODAY</Text>
          <Text style={s.value}>{(ml / 1000).toFixed(2)}<Text style={s.unit}> L</Text></Text>
        </View>
        <Text style={s.goal}>{pct}% of {(goal / 1000).toFixed(1)}L · {glasses} glass{glasses !== 1 ? 'es' : ''}</Text>
      </View>
      <View style={s.track}><View style={[s.fill, { width: `${Math.max(pct, 1)}%` }]} /></View>
      <View style={s.btnRow}>
        <TouchableOpacity style={s.btn} onPress={() => add(250)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Add 250 millilitres of water"><Text style={s.btnTxt}>+250 ml</Text></TouchableOpacity>
        <TouchableOpacity style={s.btn} onPress={() => add(500)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Add 500 millilitres of water"><Text style={s.btnTxt}>+500 ml</Text></TouchableOpacity>
        <TouchableOpacity style={s.undo} onPress={() => add(-250)} activeOpacity={0.8} disabled={ml <= 0} accessibilityRole="button" accessibilityLabel="Remove 250 millilitres of water">
          <Text style={[s.undoTxt, ml <= 0 && { opacity: 0.4 }]}>Undo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
