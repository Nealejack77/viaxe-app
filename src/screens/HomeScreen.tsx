import React, { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Tokens } from '../context/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { getDayWorkout } from '../data/workouts';
import { PlayIcon, CheckIcon, BellIcon, ClipboardIcon } from '../components/Icons';

function ReadinessRing({ score, t }: { score: number | null; t: Tokens }) {
  if (score === null) return null;
  const r = 50;
  const circ = 2 * Math.PI * r;
  const progress = (score / 100) * circ;

  const statusColor =
    score >= 85 ? t.green : score >= 70 ? t.gold : t.red;
  const statusLabel =
    score >= 85 ? 'OPTIMAL' : score >= 70 ? 'MODERATE' : 'REST TODAY';

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={r} fill="none" stroke={t.border} strokeWidth={10} />
        <Circle
          cx={60} cy={60} r={r} fill="none"
          stroke={t.red} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${progress} ${circ}`}
          rotation={-90} originX={60} originY={60}
        />
        <SvgText x={60} y={55} textAnchor="middle" fill={t.text} fontSize={32} fontWeight="900">{score}</SvgText>
        <SvgText x={60} y={70} textAnchor="middle" fill={t.textMuted} fontSize={9} letterSpacing={2}>READINESS</SvgText>
        <SvgText x={60} y={84} textAnchor="middle" fill={statusColor} fontSize={9} fontWeight="700" letterSpacing={2}>{statusLabel}</SvgText>
      </Svg>
    </View>
  );
}

const makeStyles = (t: Tokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  logo: { fontSize: 16, fontWeight: '700', color: t.text, letterSpacing: -0.5, fontFamily: 'Menlo' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.red, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  greetLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: t.textMuted, marginBottom: 2 },
  greetName: { fontSize: 28, fontWeight: '900', color: t.text, letterSpacing: -0.5 },
  card: { backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: t.textMuted },
  bigNum: { fontSize: 40, fontWeight: '900', color: t.text, lineHeight: 44, fontFamily: 'Menlo' },
  bigNumSub: { fontSize: 16, color: t.textMuted, fontFamily: 'Menlo' },
  sessCard: { borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sessIcon: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sessTag: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.65)', marginBottom: 2 },
  sessName: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  sessMeta: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  sessPlay: { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '700', color: t.text, fontFamily: 'Menlo' },
  statLabel: { fontSize: 8, color: t.textMuted, letterSpacing: 1, marginTop: 3 },
  ariaCard: { backgroundColor: t.redDim, borderColor: t.redBorder, borderWidth: 1, borderRadius: 16, padding: 14 },
  ariaTagWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  ariaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.red },
  ariaTag: { fontSize: 8, fontWeight: '700', letterSpacing: 2, color: t.red },
  ariaText: { fontSize: 13, color: t.textSec, lineHeight: 20, fontStyle: 'italic' },
  sessionIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: t.redDim, alignItems: 'center', justifyContent: 'center' },
  sessionName: { fontSize: 13, fontWeight: '700', color: t.text },
  sessionMeta: { fontSize: 10, color: t.textMuted },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: t.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  bellBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  missionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.glass, borderColor: t.gold, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  missionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.12)', alignItems: 'center', justifyContent: 'center' },
  missionTag: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: t.gold, marginBottom: 2 },
  missionTitle: { fontSize: 14, fontWeight: '800', color: t.text, letterSpacing: -0.2 },
  missionMeta: { fontSize: 10.5, color: t.textMuted, marginTop: 1 },
});

export default function HomeScreen() {
  const nav = useNavigation() as any;
  const { t } = useTheme();
  const store = useAppStore();
  const workout = getDayWorkout();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const s = useMemo(() => makeStyles(t), [t]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const insight = store.sessions.length === 0
    ? 'Log your first workout to get personalised AI insights.'
    : store.streak > 20 ? `${store.streak}-day training streak — elite consistency. Keep building.`
    : store.streak > 7  ? `${store.streak} days straight. Momentum is building.`
    : store.streak > 0  ? `${store.streak}-day streak. Consistency is the foundation.`
    : 'Log workouts consistently to unlock personalised coaching insights.';

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';

  const todayWorkoutExCount = store.programDays.length > 0
    ? store.programDays[0]?.exercises?.length ?? 0
    : workout.exercises.length;
  const todayWorkoutName = store.programDays.length > 0
    ? (store.assignedProgram || store.programDays[0]?.name || workout.name)
    : workout.name;

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* Header */}
            <View style={s.header}>
              <Text style={s.logo}>//VIAXE</Text>
              <View style={s.headerBtns}>
                <TouchableOpacity style={s.bellBtn} onPress={() => nav.navigate('Notifications')} activeOpacity={0.8}>
                  <BellIcon size={17} color={t.text} strokeWidth={2} />
                  {store.unreadNotifications > 0 && (
                    <View style={s.bellBadge}>
                      <Text style={s.bellBadgeTxt}>{store.unreadNotifications > 9 ? '9+' : store.unreadNotifications}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => nav.navigate('Profile')} activeOpacity={0.8}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{store.userName.charAt(0)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Greeting */}
            <View style={{ marginBottom: 16 }}>
              <Text style={s.greetLabel}>{greeting}</Text>
              <Text style={s.greetName}>{store.userName} {store.streak > 7 ? '🔥' : '👋'}</Text>
            </View>

            {/* Readiness card */}
            {store.readiness !== null ? (
              <View style={s.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <ReadinessRing score={store.readiness} t={t} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardLabel}>TODAY'S READINESS</Text>
                    <Text style={s.bigNum}>{store.readiness}<Text style={s.bigNumSub}>/100</Text></Text>
                    <Text style={{ fontSize: 11, color: t.textSec, lineHeight: 17, marginTop: 6 }}>
                      {store.sessions.length > 0
                        ? `Based on ${store.sessions.length} logged session${store.sessions.length !== 1 ? 's' : ''}.`
                        : 'Log workouts to track your training readiness.'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={s.card}>
                <Text style={s.cardLabel}>TODAY'S READINESS</Text>
                <Text style={{ fontSize: 13, color: t.textMuted, marginTop: 6, lineHeight: 18 }}>
                  Readiness not tracked yet. Connect a wearable or check in with your coach.
                </Text>
              </View>
            )}

            {/* Weekly check-in mission */}
            {store.clientId && store.checkInDue && (
              <TouchableOpacity style={s.missionCard} onPress={() => nav.navigate('CheckIn')} activeOpacity={0.85}>
                <View style={s.missionIcon}>
                  <ClipboardIcon size={18} color={t.gold} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.missionTag}>THIS WEEK'S MISSION</Text>
                  <Text style={s.missionTitle}>Weekly check-in due</Text>
                  <Text style={s.missionMeta}>2 minutes — weight, energy, photos. {store.coachName} reviews it.</Text>
                </View>
                <PlayIcon size={14} color={t.gold} />
              </TouchableOpacity>
            )}

            {/* Today's session */}
            <TouchableOpacity onPress={() => nav.navigate('Train')} activeOpacity={0.85}>
              <LinearGradient
                colors={['#E8432D', '#c73520']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.sessCard}
              >
                <View style={s.sessIcon}>
                  <Text style={{ fontSize: 22 }}>{workout.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sessTag}>TODAY'S TRAINING</Text>
                  <Text style={s.sessName}>{todayWorkoutName}</Text>
                  <Text style={s.sessMeta}>{todayWorkoutExCount} exercises · {workout.duration} min · {workout.tag}</Text>
                </View>
                <View style={s.sessPlay}>
                  <PlayIcon size={16} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={[s.statCard, { flex: 1 }]}>
                <Text style={[s.statVal, { color: t.gold }]}>{store.streak}</Text>
                <Text style={s.statLabel}>🔥 STREAK</Text>
              </View>
              <View style={[s.statCard, { flex: 1 }]}>
                <Text style={s.statVal}>{store.readiness !== null ? `${store.readiness}%` : '—'}</Text>
                <Text style={s.statLabel}>READINESS</Text>
              </View>
              <View style={[s.statCard, { flex: 1 }]}>
                <Text style={s.statVal}>{store.currentWeight}</Text>
                <Text style={s.statLabel}>KG</Text>
              </View>
            </View>

            {/* ARIA insight */}
            <View style={s.ariaCard}>
              <View style={s.ariaTagWrap}>
                <View style={s.ariaDot} />
                <Text style={s.ariaTag}>ARIA AI</Text>
              </View>
              <Text style={s.ariaText}>"{insight}"</Text>
            </View>

            {/* Recent sessions */}
            {store.sessions.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={[s.cardLabel, { marginBottom: 10 }]}>RECENT SESSIONS</Text>
                {store.sessions.slice(-3).reverse().map(sess => (
                  <View key={sess.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }]}>
                    <View style={s.sessionIconWrap}>
                      <CheckIcon size={18} color={t.red} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sessionName}>{sess.workoutName}</Text>
                      <Text style={s.sessionMeta}>{sess.date} · {sess.duration} min · {sess.setsCompleted} sets</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
