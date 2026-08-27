import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { getDayWorkout } from '../data/workouts';
import { BellIcon, CheckIcon } from '../components/Icons';
import { colors, spacing, radii, motion } from '../theme/grit';
import { GritText, Wordmark } from '../components/grit';
import PressableScale from '../components/motion/PressableScale';
import AnimatedNumber from '../components/motion/AnimatedNumber';
import Reveal from '../components/motion/Reveal';
import { localDateKey } from '../lib/date';

const DAY = 86400000;
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export default function HomeScreen() {
  const nav = useNavigation() as any;
  const store = useAppStore();
  const workout = getDayWorkout();

  const now = new Date();
  const today0 = startOfDay(now);
  const sessionDates = new Set(store.sessions.map((x) => x.date));

  // Context label
  const dayName = now.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const weekNo = store.profile.startWeight != null && store.weightLog[0]
    ? Math.max(1, Math.ceil((today0.getTime() - startOfDay(new Date(store.sessions[store.sessions.length - 1]?.date || now)).getTime()) / (7 * DAY)) || 1)
    : Math.max(1, Math.floor((store.sessions.length) / 3) + 1);

  // Today's work
  const hasProgram = store.programDays.length > 0;
  const workoutName = (hasProgram ? (store.assignedProgram || store.programDays[0]?.name) : workout.name) || workout.name;
  const exCount = hasProgram ? (store.programDays[0]?.exercises?.length ?? workout.exercises.length) : workout.exercises.length;

  // Hero — never frame a genuine rest day as failure.
  const heroRecovery = !hasProgram;

  // Week cadence (Mon-first)
  const dow = (now.getDay() + 6) % 7;
  const monday = startOfDay(now); monday.setDate(now.getDate() - dow);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const key = localDateKey(d);
    const done = sessionDates.has(key);
    const isToday = i === dow;
    const future = d.getTime() > today0.getTime();
    return { label: 'MTWTFSS'[i], done, isToday, state: done ? 'done' : isToday ? 'today' : future ? 'scheduled' : 'rest' as const };
  });

  // Metrics (honest, from store data)
  const streak = store.streak;
  const startW = store.profile.startWeight ?? store.weightLog[0]?.weight ?? null;
  const curW = store.currentWeight || null;
  const kgMoved = startW != null && curW != null ? Math.abs(startW - curW) : null;
  const sessions28 = store.sessions.filter((x) => now.getTime() - new Date(x.date).getTime() < 28 * DAY).length;
  const consistency = Math.min(100, Math.round((sessions28 / 16) * 100)); // vs a 4/week baseline

  const fbSession = store.sessions.find((x) => x.coachFeedback?.text);
  const fbCheckIn = store.checkIns.find((x) => x.coachReply?.text);
  const coachNote =
    (fbSession && fbCheckIn
      ? (new Date(fbSession.date) >= new Date(fbCheckIn.createdAt) ? fbSession.coachFeedback!.text : fbCheckIn.coachReply!.text)
      : fbSession?.coachFeedback?.text ?? fbCheckIn?.coachReply?.text) || 'Motivation is optional. The session still gets done.';

  const s = useMemo(() => makeStyles(), []);

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* 1 · Header */}
          <View style={s.header}>
            <Wordmark size={24} color={colors.chalk} />
            <View style={s.headerR}>
              <PressableScale onPress={() => nav.navigate('Notifications')} accessibilityLabel={store.unreadNotifications > 0 ? `Notifications, ${store.unreadNotifications} unread` : 'Notifications'} style={s.iconBtn}>
                <BellIcon size={17} color={colors.muted} strokeWidth={2} />
                {store.unreadNotifications > 0 && <View style={s.badge} />}
              </PressableScale>
              <PressableScale onPress={() => nav.navigate('Profile')} accessibilityLabel="Profile" style={s.avatar}>
                <Text style={s.avatarTxt}>{store.userName.charAt(0).toUpperCase()}</Text>
              </PressableScale>
            </View>
          </View>

          {/* 2 · Context + 3 · Hero */}
          <Reveal duration={motion.entrance} delay={0}>
            <GritText variant="label" style={s.context}>{dayName} · WEEK {weekNo}</GritText>
            {heroRecovery ? (
              <Text style={s.hero}>RECOVERY{'\n'}<Text style={{ color: colors.acid }}>IS WORK.</Text></Text>
            ) : (
              <Text style={s.hero}>NO ZERO{'\n'}<Text style={{ color: colors.acid }}>DAYS.</Text></Text>
            )}
          </Reveal>

          {/* 4 · Primary session module — the dominant action */}
          <Reveal duration={motion.entrance} delay={motion.stagger}>
            <PressableScale onPress={() => nav.navigate('Train')} haptic="heavy" scaleTo={motion.pressScale} accessibilityLabel={`Today's work: ${workoutName}. Open.`} style={s.session}>
              <View style={{ flex: 1 }}>
                <Text style={s.sessionKicker}>TODAY’S WORK</Text>
                <GritText variant="displaySmall" style={s.sessionTitle}>{workoutName}</GritText>
                <Text style={s.sessionMeta}>{workout.duration} MIN · {exCount} MOVEMENTS</Text>
              </View>
              <View style={s.sessionGo}><Text style={s.sessionArrow}>→</Text></View>
            </PressableScale>
          </Reveal>

          {/* 5 · Training week */}
          <Reveal duration={motion.entrance} delay={motion.stagger * 2}>
            <GritText variant="label" style={s.blockLabel}>TRAINING WEEK</GritText>
            <View style={s.week}>
              {week.map((d, i) => (
                <View key={i} style={s.weekCell}>
                  <View style={[
                    s.mark,
                    d.state === 'done' && s.markDone,
                    d.state === 'today' && s.markToday,
                    d.state === 'scheduled' && s.markScheduled,
                    d.state === 'rest' && s.markRest,
                  ]}>
                    {d.state === 'done' && <CheckIcon size={13} color={colors.asphalt} strokeWidth={3} />}
                  </View>
                  <Text style={[s.weekLbl, d.isToday && { color: colors.chalk }]}>{d.label}</Text>
                </View>
              ))}
            </View>
          </Reveal>

          {/* 6 · Coach says */}
          <Reveal duration={motion.entrance} delay={motion.stagger * 3}>
            <GritText variant="label" style={s.blockLabel}>COACH SAYS</GritText>
            <View style={s.coach}>
              <View style={s.coachBang}><Text style={s.coachBangTxt}>!</Text></View>
              <GritText variant="bodyStrong" style={s.coachTxt}>{coachNote}</GritText>
            </View>
          </Reveal>

          {/* 7 · Secondary metrics */}
          <Reveal duration={motion.entrance} delay={motion.stagger * 4}>
            <View style={s.metrics}>
              <View style={s.metric}>
                <AnimatedNumber value={streak} duration={motion.countUp} style={s.metricNum} />
                <Text style={s.metricLbl}>DAYS{'\n'}SHOWING UP</Text>
              </View>
              <View style={s.metricDivider} />
              <View style={s.metric}>
                <Text style={s.metricNum}>{kgMoved != null ? kgMoved.toFixed(0) : '—'}<Text style={s.metricUnit}> KG</Text></Text>
                <Text style={s.metricLbl}>CLOSER{'\n'}TO GOAL</Text>
              </View>
              <View style={s.metricDivider} />
              <View style={s.metric}>
                <AnimatedNumber value={consistency} duration={motion.countUp} suffix="%" style={s.metricNum} />
                <Text style={s.metricLbl}>SESSIONS{'\n'}COMPLETED</Text>
              </View>
            </View>
          </Reveal>

          <View style={{ height: spacing[10] }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.asphalt },
  scroll: { padding: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[8] },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[6] },
  headerR: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  iconBtn: { width: 38, height: 38, borderRadius: radii.control, backgroundColor: colors.iron, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.ember },
  avatar: { width: 38, height: 38, borderRadius: radii.control, backgroundColor: colors.acid, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontFamily: 'BarlowCondensed-Black', fontSize: 20, color: colors.asphalt },

  context: { color: colors.muted, marginBottom: spacing[2] },
  hero: { fontFamily: 'BarlowCondensed-Black', fontSize: 64, lineHeight: 56, letterSpacing: -1, color: colors.chalk, textTransform: 'uppercase', marginBottom: spacing[6] },

  session: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ember, borderRadius: radii.card, padding: spacing[5], gap: spacing[4], marginBottom: spacing[8] },
  sessionKicker: { fontFamily: 'IBMPlexSans-Bold', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(9,9,8,0.7)', marginBottom: spacing[2] },
  sessionTitle: { color: colors.black },
  sessionMeta: { fontFamily: 'IBMPlexSans-Bold', fontSize: 12, letterSpacing: 0.6, color: 'rgba(9,9,8,0.75)', marginTop: spacing[2] },
  sessionGo: { width: 52, height: 52, borderRadius: radii.control, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  sessionArrow: { fontFamily: 'BarlowCondensed-Black', fontSize: 30, lineHeight: 34, color: colors.chalk },

  blockLabel: { color: colors.muted, marginBottom: spacing[3] },

  week: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[8] },
  weekCell: { alignItems: 'center', gap: spacing[2], flex: 1 },
  mark: { width: 34, height: 34, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  markDone: { backgroundColor: colors.chalk },
  markToday: { backgroundColor: colors.acid },
  markScheduled: { borderColor: colors.line, backgroundColor: 'transparent' },
  markRest: { borderColor: 'rgba(233,229,218,0.10)', backgroundColor: 'transparent' },
  weekLbl: { fontFamily: 'IBMPlexSans-Bold', fontSize: 11, letterSpacing: 0.8, color: colors.concrete },

  coach: { flexDirection: 'row', gap: spacing[3], backgroundColor: colors.iron, borderRadius: radii.card, padding: spacing[4], marginBottom: spacing[8], alignItems: 'flex-start' },
  coachBang: { width: 26, height: 26, borderRadius: radii.sharp, backgroundColor: colors.acid, alignItems: 'center', justifyContent: 'center' },
  coachBangTxt: { fontFamily: 'BarlowCondensed-Black', fontSize: 18, lineHeight: 20, color: colors.asphalt },
  coachTxt: { color: colors.chalk, flex: 1, lineHeight: 20 },

  metrics: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.iron, borderRadius: radii.card, paddingVertical: spacing[5], paddingHorizontal: spacing[3] },
  metric: { flex: 1, alignItems: 'center', gap: spacing[1] },
  metricDivider: { width: 1, height: 44, backgroundColor: colors.line },
  metricNum: { fontFamily: 'BarlowCondensed-Black', fontSize: 40, lineHeight: 40, color: colors.chalk, textAlign: 'center' },
  metricUnit: { fontFamily: 'BarlowCondensed-Bold', fontSize: 20, color: colors.muted },
  metricLbl: { fontFamily: 'IBMPlexSans-Bold', fontSize: 10, lineHeight: 13, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.concrete, textAlign: 'center' },
});
