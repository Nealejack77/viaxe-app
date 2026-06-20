import React, { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Tokens } from '../context/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { getDayWorkout } from '../data/workouts';
import { PlayIcon, BellIcon, ClipboardIcon, ActivityIcon, AwardIcon, TrendingUpIcon } from '../components/Icons';

const makeStyles = (t: Tokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  logo: { fontSize: 16, fontWeight: '700', color: t.text, letterSpacing: -0.5, fontFamily: t.mono },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.red, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  greetLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: t.textMuted, marginBottom: 2 },
  greetName: { fontSize: 28, fontWeight: '900', color: t.text, letterSpacing: -0.5 },
  card: { backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: t.textMuted },
  bigNum: { fontSize: 40, fontWeight: '900', color: t.text, lineHeight: 44, fontFamily: t.mono },
  bigNumSub: { fontSize: 16, color: t.textMuted, fontFamily: t.mono },
  sessCard: { borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sessIcon: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sessTag: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.65)', marginBottom: 2 },
  sessName: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  sessMeta: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  sessPlay: { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '700', color: t.text, fontFamily: t.mono },
  statLabel: { fontSize: 8, color: t.textMuted, letterSpacing: 1, marginTop: 3 },
  ariaCard: { backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 16, padding: 14 },
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

  // Journey card
  journeyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  journeyGoal: { fontSize: 18, fontWeight: '900', color: t.text, letterSpacing: -0.4, marginTop: 3 },
  journeyPct: { fontSize: 26, fontWeight: '900', color: t.red, fontFamily: t.mono },
  journeyPctLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: t.textMuted, textAlign: 'right' },
  journeyBarTrack: { height: 8, borderRadius: 4, backgroundColor: t.border, overflow: 'hidden', marginBottom: 8 },
  journeyBarFill: { height: 8, borderRadius: 4, backgroundColor: t.red },
  journeyEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  journeyEnd: { fontSize: 10, color: t.textMuted, fontFamily: t.mono },
  journeyWhy: { fontSize: 12, color: t.textSec, fontStyle: 'italic', lineHeight: 18, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.border },
  journeyMilestone: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  journeyMilestoneTxt: { fontSize: 11.5, color: t.textSec, flex: 1 },

  // Coach feedback card
  coachCard: { backgroundColor: 'rgba(52,199,89,0.06)', borderColor: 'rgba(52,199,89,0.2)', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  coachTag: { fontSize: 8, fontWeight: '700', letterSpacing: 2, color: t.green, marginBottom: 6 },
  coachQuote: { fontSize: 13, color: t.textSec, lineHeight: 20 },

  // Timeline
  tlRow: { flexDirection: 'row', gap: 12, marginBottom: 2 },
  tlRail: { width: 30, alignItems: 'center' },
  tlDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder },
  tlLine: { flex: 1, width: 1.5, backgroundColor: t.border, marginVertical: 3 },
  tlBody: { flex: 1, paddingBottom: 16 },
  tlTitle: { fontSize: 13, fontWeight: '700', color: t.text, letterSpacing: -0.2 },
  tlMeta: { fontSize: 10.5, color: t.textMuted, marginTop: 2 },
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

  // ── Journey math: start → current → goal weight ──────────────────────────
  const startW = store.profile.startWeight ?? store.weightLog[0]?.weight ?? null;
  const goalW  = store.profile.goalWeight ?? null;
  const curW   = store.currentWeight || null;
  const journeyPct = (startW != null && goalW != null && curW != null && startW !== goalW)
    ? Math.max(0, Math.min(100, Math.round(((startW - curW) / (startW - goalW)) * 100)))
    : null;
  const kgRemaining = (goalW != null && curW != null) ? Math.abs(curW - goalW) : null;
  const nextMilestone = journeyPct === null ? null
    : journeyPct >= 100 ? 'Goal reached — time to set the next one with your coach 🏆'
    : journeyPct >= 75 ? 'Final quarter. The last stretch is where it counts.'
    : journeyPct >= 50 ? `Next milestone: 75% of the way (${kgRemaining?.toFixed(1)}kg to goal).`
    : journeyPct >= 25 ? 'Next milestone: halfway point.'
    : 'First milestone: 25% of the way there.';

  // Latest coach voice — workout feedback or check-in reply, whichever is newer
  const fbSession = store.sessions.find(x => x.coachFeedback?.text);
  const fbCheckIn = store.checkIns.find(x => x.coachReply?.text);
  const latestCoachNote =
    fbSession && fbCheckIn
      ? (new Date(fbSession.date) >= new Date(fbCheckIn.createdAt) ? fbSession.coachFeedback!.text : fbCheckIn.coachReply!.text)
      : fbSession?.coachFeedback?.text ?? fbCheckIn?.coachReply?.text ?? null;

  // Journey timeline — workouts and check-ins merged, newest first
  type TimelineEvent = { key: string; kind: 'workout' | 'checkin' | 'milestone'; title: string; meta: string; date: string };
  const timeline: TimelineEvent[] = [
    ...store.sessions.slice(0, 6).map(sess => ({
      key: `w-${sess.id}`, kind: 'workout' as const,
      title: sess.workoutName,
      meta: `${sess.date} · ${sess.duration} min · ${sess.setsCompleted} sets${sess.coachFeedback ? ' · ✓ reviewed' : ''}`,
      date: sess.date,
    })),
    ...store.checkIns.slice(0, 3).map(ci => ({
      key: `c-${ci.id}`, kind: 'checkin' as const,
      title: 'Weekly check-in',
      meta: `${ci.createdAt.split('T')[0]}${ci.weight ? ` · ${ci.weight}kg` : ''}${ci.coachReply ? ' · coach replied' : ''}`,
      date: ci.createdAt.split('T')[0],
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

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
              <Text style={s.greetName}>{store.userName}</Text>
            </View>

            {/* Cockpit — today's session is the primary next action (the one ember surface) */}
            <TouchableOpacity onPress={() => nav.navigate('Train')} activeOpacity={0.85}>
              <LinearGradient
                colors={['#E8432D', '#c73520']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.sessCard}
              >
                <View style={s.sessIcon}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', fontFamily: t.mono, letterSpacing: -1 }}>//</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sessTag}>TODAY'S MISSION</Text>
                  <Text style={s.sessName}>{todayWorkoutName}</Text>
                  <Text style={s.sessMeta}>{todayWorkoutExCount} exercises · {workout.duration} min · {workout.tag}</Text>
                </View>
                <View style={s.sessPlay}>
                  <PlayIcon size={16} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* TRAJECTORY */}
            <Text style={[s.cardLabel, { marginBottom: 10, marginTop: 4 }]}>TRAJECTORY</Text>

            {/* Journey card — goal, progress, next milestone, your why */}
            <View style={s.card}>
              <View style={s.journeyTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardLabel}>YOUR JOURNEY</Text>
                  <Text style={s.journeyGoal}>{store.profile.mainGoal || 'Set your goal with your coach'}</Text>
                </View>
                {journeyPct !== null && (
                  <View>
                    <Text style={s.journeyPct}>{journeyPct}%</Text>
                    <Text style={s.journeyPctLabel}>COMPLETE</Text>
                  </View>
                )}
              </View>

              {journeyPct !== null ? (
                <>
                  <View style={s.journeyBarTrack}>
                    <View style={[s.journeyBarFill, { width: `${Math.max(journeyPct, 2)}%` }]} />
                  </View>
                  <View style={s.journeyEnds}>
                    <Text style={s.journeyEnd}>{startW?.toFixed(1)}kg</Text>
                    <Text style={[s.journeyEnd, { color: t.text, fontWeight: '700' }]}>{curW?.toFixed(1)}kg</Text>
                    <Text style={s.journeyEnd}>{goalW?.toFixed(1)}kg</Text>
                  </View>
                  {nextMilestone && (
                    <View style={s.journeyMilestone}>
                      <TrendingUpIcon size={13} color={t.gold} strokeWidth={2.2} />
                      <Text style={s.journeyMilestoneTxt}>{nextMilestone}</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 18 }}>
                  Log your weight and set a target to see your progress here.
                </Text>
              )}

              {store.profile.whyGoal ? (
                <Text style={s.journeyWhy}>"{store.profile.whyGoal}"</Text>
              ) : null}
            </View>

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

            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={[s.statCard, { flex: 1 }]}>
                <Text style={[s.statVal, { color: t.gold }]}>{store.streak}</Text>
                <Text style={s.statLabel}>DAY STREAK</Text>
              </View>
              <View style={[s.statCard, { flex: 1 }]}>
                <Text style={s.statVal}>{kgRemaining !== null ? kgRemaining.toFixed(1) : '—'}</Text>
                <Text style={s.statLabel}>KG TO GOAL</Text>
              </View>
              <View style={[s.statCard, { flex: 1 }]}>
                <Text style={s.statVal}>{store.currentWeight}</Text>
                <Text style={s.statLabel}>KG</Text>
              </View>
            </View>

            <Text style={[s.cardLabel, { marginBottom: 10, marginTop: 8 }]}>SIGNAL</Text>
            {/* ARIA insight */}
            <View style={s.ariaCard}>
              <View style={s.ariaTagWrap}>
                <View style={s.ariaDot} />
                <Text style={s.ariaTag}>ARIA AI</Text>
              </View>
              <Text style={s.ariaText}>"{insight}"</Text>
            </View>

            {/* Latest word from the coach */}
            {latestCoachNote && (
              <View style={[s.coachCard, { marginTop: 12 }]}>
                <Text style={s.coachTag}>FROM {store.coachName.toUpperCase()}</Text>
                <Text style={s.coachQuote}>"{latestCoachNote}"</Text>
              </View>
            )}

            {/* Journey timeline */}
            {timeline.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={[s.cardLabel, { marginBottom: 12 }]}>JOURNEY TIMELINE</Text>
                {timeline.map((ev, i) => (
                  <View key={ev.key} style={s.tlRow}>
                    <View style={s.tlRail}>
                      <View style={s.tlDot}>
                        {ev.kind === 'workout'
                          ? <ActivityIcon size={13} color={t.red} strokeWidth={2.2} />
                          : ev.kind === 'checkin'
                            ? <ClipboardIcon size={13} color={t.gold} strokeWidth={2.2} />
                            : <AwardIcon size={13} color={t.gold} strokeWidth={2.2} />}
                      </View>
                      {i < timeline.length - 1 && <View style={s.tlLine} />}
                    </View>
                    <View style={s.tlBody}>
                      <Text style={s.tlTitle}>{ev.title}</Text>
                      <Text style={s.tlMeta}>{ev.meta}</Text>
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
