import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Tokens } from '../context/ThemeContext';
import { useAppStore, WeightEntry } from '../store/useAppStore';
import { PlusIcon, ActivityIcon, CameraIcon } from '../components/Icons';
import ActivityCalendar from '../components/ActivityCalendar';

const CHART_W = 280;
const CHART_H = 80;

function WeightChart({ data, t }: { data: WeightEntry[]; t: Tokens }) {
  if (data.length < 2) {
    return (
      <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: t.textMuted, fontSize: 12 }}>Log more entries to see your trend</Text>
      </View>
    );
  }

  const weights = data.map(d => d.weight);
  const minW = Math.min(...weights) - 0.5;
  const maxW = Math.max(...weights) + 0.5;
  const range = maxW - minW || 1;

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * CHART_W,
    y: CHART_H - ((d.weight - minW) / range) * (CHART_H - 12) - 6,
  }));

  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fillD = `${lineD} L${pts[pts.length - 1].x},${CHART_H} L${pts[0].x},${CHART_H} Z`;
  const last  = pts[pts.length - 1];

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <SvgGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={t.green} stopOpacity={0.28} />
          <Stop offset="100%" stopColor={t.green} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path d={fillD} fill="url(#wfill)" />
      <Path d={lineD} fill="none" stroke={t.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last.x} cy={last.y} r={4} fill={t.green} />
    </Svg>
  );
}

const makeStyles = (t: Tokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 36, fontWeight: '900', color: t.text, letterSpacing: -1.5 },
  toggle: { flexDirection: 'row', backgroundColor: t.glass, borderRadius: 10, padding: 2 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  toggleBtnOn: { backgroundColor: t.red },
  toggleTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: t.textMuted },
  card: { backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: t.textMuted, marginBottom: 4 },
  chartTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  bigVal: { fontSize: 32, fontWeight: '700', color: t.text, fontFamily: t.mono, lineHeight: 38 },
  bigValSub: { fontSize: 14, color: t.textMuted },
  delta: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1, alignSelf: 'flex-start' },
  logRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, backgroundColor: t.inputBg, borderRadius: 12, padding: 12, fontSize: 15, color: t.text, borderWidth: 1, borderColor: t.border },
  logWeightBtn: { width: 44, height: 44, backgroundColor: t.red, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 16, padding: 14 },
  statLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 2, color: t.textMuted, marginBottom: 6 },
  statVal: { fontSize: 24, fontWeight: '700', color: t.text, fontFamily: t.mono, lineHeight: 28 },
  statUnit: { fontSize: 12, color: t.textMuted },
  statDelta: { fontSize: 10, fontWeight: '700', color: t.green, marginTop: 3 },
  achieveCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,214,10,0.08)', borderColor: 'rgba(255,214,10,0.2)', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 20 },
  achieveLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 2, color: t.gold, marginBottom: 3 },
  achieveName: { fontSize: 14, fontWeight: '800', color: t.text },
  sessionIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.redDim, alignItems: 'center', justifyContent: 'center' },
  bwEntry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.border },
  emptyTxt: { fontSize: 13, color: t.textMuted, textAlign: 'center', paddingVertical: 16 },
  feedbackPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,168,74,0.1)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 4 },
  feedbackTxt: { fontSize: 10, color: t.green, fontWeight: '700' },
  compareCol: { flex: 1, gap: 6 },
  comparePhoto: { width: '100%', aspectRatio: 3 / 4, borderRadius: 14, backgroundColor: t.glass },
  compareTag: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: t.textMuted, textAlign: 'center' },
  timelinePhoto: { width: 86, aspectRatio: 3 / 4, borderRadius: 10, backgroundColor: t.glass, marginRight: 8 },
  timelineDate: { fontSize: 9, color: t.textMuted, textAlign: 'center', marginTop: 3 },
  photoCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: t.redDim, borderWidth: 1, borderColor: t.redBorder, marginTop: 12 },
  photoCtaTxt: { fontSize: 12, fontWeight: '700', color: t.red },
});

export default function ProgressScreen() {
  const store = useAppStore();
  const { t } = useTheme();
  const nav = useNavigation() as any;
  const s = useMemo(() => makeStyles(t), [t]);

  const [view, setView] = useState<'4w' | '8w' | 'all'>('8w');
  const [weightInput, setWeightInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // Photos live on check-ins; pull the full payload once for this tab
  useEffect(() => {
    if (store.clientId) store.loadCheckIns(true);
  }, [store.clientId]);

  // Chronological check-ins that actually carry photos
  const photoCheckIns = useMemo(
    () => store.checkIns.filter(c => c.photos && c.photos.length > 0).slice().reverse(),
    [store.checkIns],
  );
  const firstPhotos = photoCheckIns[0];
  const latestPhotos = photoCheckIns[photoCheckIns.length - 1];
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const sliceMap = { '4w': 4, '8w': 8, all: 999 };
  const chartData = store.weightLog.slice(-sliceMap[view]);

  const firstWeight = chartData[0]?.weight;
  const currentWeight = store.currentWeight;
  const delta = firstWeight ? (currentWeight - firstWeight).toFixed(1) : '0.0';
  const deltaPositive = parseFloat(delta) > 0;

  const handleLogWeight = async () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w < 30 || w > 250) {
      Alert.alert('Invalid weight', 'Enter a weight between 30 and 250 kg.');
      return;
    }
    await store.logWeight(w, notesInput.trim() || undefined);
    setWeightInput('');
    setNotesInput('');
  };

  const hasBW = store.weightLog.length > 0;
  const hasSessions = store.sessions.length > 0;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Progress.</Text>
            <View style={s.toggle}>
              {(['4w', '8w', 'all'] as const).map(v => (
                <TouchableOpacity key={v} onPress={() => setView(v)} style={[s.toggleBtn, view === v && s.toggleBtnOn]}>
                  <Text style={[s.toggleTxt, view === v && { color: '#fff' }]}>{v === 'all' ? 'ALL' : v.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Weight chart */}
          <View style={s.card}>
            <View style={s.chartTop}>
              <View>
                <Text style={s.cardLabel}>BODY WEIGHT</Text>
                {!store.bodyweightLoaded ? (
                  <ActivityIndicator size="small" color={t.red} style={{ marginTop: 4 }} />
                ) : currentWeight > 0 ? (
                  <>
                    <Text style={s.bigVal}>{currentWeight.toFixed(1)}<Text style={s.bigValSub}> kg</Text></Text>
                    {firstWeight && (
                      <Text style={[s.delta, { color: deltaPositive ? t.red : t.green }]}>
                        {deltaPositive ? '↑' : '↓'} {Math.abs(parseFloat(delta))}kg this period
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>No weight logged yet</Text>
                )}
              </View>
              {hasBW && firstWeight && (
                <View style={[s.badge, {
                  backgroundColor: deltaPositive ? t.redDim : 'rgba(52,199,89,0.1)',
                  borderColor: deltaPositive ? t.redBorder : 'rgba(52,199,89,0.25)'
                }]}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: deltaPositive ? t.red : t.green }}>
                    {deltaPositive ? 'GAINING' : 'ON TRACK'}
                  </Text>
                </View>
              )}
            </View>
            {hasBW && chartData.length >= 2 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <WeightChart data={chartData} t={t} />
              </ScrollView>
            )}
          </View>

          {/* Log weight */}
          <View style={s.card}>
            <Text style={s.cardLabel}>LOG WEIGHT</Text>
            <View style={[s.logRow, { marginTop: 8 }]}>
              <TextInput
                style={s.input}
                placeholder="Today's weight (kg)"
                placeholderTextColor={t.textMuted}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleLogWeight}
              />
              <TouchableOpacity onPress={handleLogWeight} style={s.logWeightBtn} accessibilityRole="button" accessibilityLabel="Log today's weight">
                <PlusIcon size={18} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bodyweight history */}
          {hasBW && (
            <View style={s.card}>
              <Text style={s.cardLabel}>WEIGHT HISTORY</Text>
              {store.weightLog.slice().reverse().slice(0, 10).map((entry, i) => (
                <View key={`${entry.date}-${i}`} style={s.bwEntry}>
                  <Text style={{ fontSize: 13, color: t.textMuted, width: 90, fontFamily: t.mono }}>{entry.date}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: t.text, flex: 1, fontFamily: t.mono }}>{entry.weight.toFixed(1)} kg</Text>
                  {entry.notes ? <Text style={{ fontSize: 10, color: t.textMuted }}>{entry.notes}</Text> : null}
                </View>
              ))}
            </View>
          )}

          {/* Stats grid */}
          <View style={s.statsGrid}>
            <View style={s.statCard}>
              <Text style={s.statLabel}>BENCH PRESS PR</Text>
              <Text style={s.statVal}>{store.benchPR > 0 ? store.benchPR : '—'}<Text style={s.statUnit}>{store.benchPR > 0 ? 'kg' : ''}</Text></Text>
              <Text style={s.statDelta}>{store.benchPR > 0 ? '↑ Personal best' : 'Not logged yet'}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>SESSIONS</Text>
              <Text style={s.statVal}>{store.totalSessions}</Text>
              <Text style={s.statDelta}>{store.totalSessions > 0 ? '↑ All time' : 'No sessions yet'}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>SQUAT PR</Text>
              <Text style={s.statVal}>{store.squatPR > 0 ? store.squatPR : '—'}<Text style={s.statUnit}>{store.squatPR > 0 ? 'kg' : ''}</Text></Text>
              <Text style={s.statDelta}>{store.squatPR > 0 ? '↑ Personal best' : 'Not logged yet'}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>STREAK</Text>
              <Text style={[s.statVal, { color: t.gold }]}>{store.streak}<Text style={[s.statUnit, { color: t.gold }]}> d</Text></Text>
              <Text style={s.statDelta}>Days consecutive</Text>
            </View>
          </View>

          {/* Achievement */}
          <View style={s.achieveCard}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: t.gold, fontFamily: t.mono, letterSpacing: -1 }}>//</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.achieveLabel}>MILESTONE</Text>
              <Text style={s.achieveName}>
                {store.benchPR >= 100 ? 'Bench Press 100kg Club' :
                 store.streak >= 30  ? '30-Day Warrior' :
                 store.totalSessions >= 50 ? '50 Sessions Strong' :
                 store.totalSessions > 0   ? 'First session logged — keep going!' :
                 'Complete your first workout to unlock milestones'}
              </Text>
            </View>
          </View>

          {/* Progress photos */}
          <View style={s.card}>
            <Text style={s.cardLabel}>PROGRESS PHOTOS</Text>
            {photoCheckIns.length === 0 ? (
              <>
                <Text style={{ fontSize: 13, color: t.textMuted, marginTop: 6, lineHeight: 19 }}>
                  Photos are the progress the scale can't show. Add them to your weekly check-in.
                </Text>
                {store.clientId ? (
                  <TouchableOpacity style={s.photoCta} onPress={() => nav.navigate('CheckIn')} activeOpacity={0.8}>
                    <CameraIcon size={15} color={t.red} strokeWidth={2.2} />
                    <Text style={s.photoCtaTxt}>Add photos in this week's check-in</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <>
                {/* Then vs now */}
                {firstPhotos && latestPhotos && firstPhotos.id !== latestPhotos.id ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <View style={s.compareCol}>
                      <Image source={{ uri: firstPhotos.photos![0] }} style={s.comparePhoto} resizeMode="cover" />
                      <Text style={s.compareTag}>
                        DAY ONE · {fmtDate(firstPhotos.createdAt)}{firstPhotos.weight ? ` · ${firstPhotos.weight}KG` : ''}
                      </Text>
                    </View>
                    <View style={s.compareCol}>
                      <Image source={{ uri: latestPhotos.photos![0] }} style={s.comparePhoto} resizeMode="cover" />
                      <Text style={s.compareTag}>
                        NOW · {fmtDate(latestPhotos.createdAt)}{latestPhotos.weight ? ` · ${latestPhotos.weight}KG` : ''}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Timeline */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
                  {photoCheckIns.flatMap(ci =>
                    (ci.photos || []).map((p, i) => (
                      <View key={`${ci.id}-${i}`}>
                        <Image source={{ uri: p }} style={s.timelinePhoto} resizeMode="cover" />
                        <Text style={s.timelineDate}>{fmtDate(ci.createdAt)}</Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </View>

          {/* Session history */}
          {!store.workoutsLoaded && (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <ActivityIndicator color={t.red} />
              <Text style={[s.emptyTxt, { marginTop: 8 }]}>Loading workout history...</Text>
            </View>
          )}
          {store.workoutsLoaded && hasSessions && (
            <View>
              <Text style={[s.cardLabel, { marginBottom: 10 }]}>SESSION HISTORY</Text>
              {store.sessions.slice(0, 20).map(sess => (
                <View key={sess.id} style={[s.card, { flexDirection: 'column', gap: 8, marginBottom: 8, padding: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={s.sessionIconWrap}>
                      <ActivityIcon size={18} color={t.red} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: t.text }}>{sess.workoutName}</Text>
                      <Text style={{ fontSize: 10, color: t.textMuted }}>
                        {sess.date} · {sess.duration} min · {sess.setsCompleted} sets
                        {sess.rpe ? ` · RPE ${sess.rpe}/10` : ''}
                      </Text>
                    </View>
                  </View>
                  {sess.exercises && sess.exercises.filter(e => e.addedByClient).length > 0 && (
                    <Text style={{ fontSize: 10, color: t.textSec }}>
                      + {sess.exercises.filter(e => e.addedByClient).map(e => e.name).join(', ')} (added by you)
                    </Text>
                  )}
                  {sess.notes ? (
                    <Text style={{ fontSize: 11, color: t.textSec, fontStyle: 'italic' }}>"{sess.notes}"</Text>
                  ) : null}
                  {sess.coachFeedback ? (
                    <View>
                      <View style={s.feedbackPill}>
                        <Text style={s.feedbackTxt}>✓ Coach reviewed</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: t.textSec, marginTop: 6 }}>
                        "{sess.coachFeedback.text}"
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
          {store.workoutsLoaded && !hasSessions && (
            <Text style={s.emptyTxt}>No workouts logged yet. Start your first session in the Train tab.</Text>
          )}

          {/* Activity calendar */}
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, color: t.textMuted, marginTop: 24, marginBottom: 12 }}>ACTIVITY CALENDAR</Text>
          <ActivityCalendar />

        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
