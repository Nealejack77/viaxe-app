import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Tokens } from '../context/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { requestNotificationPermission, scheduleDailyWorkoutReminder } from '../lib/notifications';
import { ZapIcon, BellIcon, UserIcon, ClipboardIcon, FlameIcon } from '../components/Icons';

interface Props {
  onDone: () => void;
}

const GOALS = [
  { id: 'Fat loss',        emoji: '⚡', desc: 'Drop body fat, keep muscle' },
  { id: 'Muscle gain',     emoji: '💪', desc: 'Build size and shape' },
  { id: 'Strength',        emoji: '🏋️', desc: 'Lift heavier, get stronger' },
  { id: 'Health & energy', emoji: '❤️', desc: 'Feel better every day' },
];

const makeStyles = (t: Tokens) => StyleSheet.create({
  container:  { flex: 1, backgroundColor: t.bg },
  inner:      { flex: 1, padding: 24, paddingTop: 12 },

  progress:   { flexDirection: 'row', gap: 5, marginBottom: 36 },
  pSeg:       { flex: 1, height: 3, borderRadius: 2, backgroundColor: t.border },
  pSegOn:     { backgroundColor: t.red },

  kicker:     { fontSize: 10, fontWeight: '700', letterSpacing: 2.5, color: t.red, marginBottom: 10 },
  title:      { fontSize: 30, fontWeight: '900', color: t.text, letterSpacing: -0.8, lineHeight: 36, marginBottom: 10 },
  desc:       { fontSize: 14.5, color: t.textSec, lineHeight: 22, marginBottom: 28 },

  goalCard:   { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, backgroundColor: t.glass, borderWidth: 1.5, borderColor: t.glassBorder, marginBottom: 10 },
  goalCardOn: { borderColor: t.red, backgroundColor: t.redDim },
  goalEmoji:  { fontSize: 26 },
  goalName:   { fontSize: 15, fontWeight: '800', color: t.text, letterSpacing: -0.2 },
  goalDesc:   { fontSize: 12, color: t.textMuted, marginTop: 2 },

  bigInput:   { fontSize: 52, fontWeight: '900', color: t.text, fontFamily: t.mono, textAlign: 'center', paddingVertical: 12 },
  unit:       { fontSize: 14, fontWeight: '700', color: t.textMuted, textAlign: 'center', letterSpacing: 2 },

  whyInput:   { fontSize: 16, color: t.text, lineHeight: 24, minHeight: 120, textAlignVertical: 'top', padding: 18, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 16 },

  infoCard:   { alignItems: 'center', padding: 28, borderRadius: 20, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, gap: 12 },
  infoIcon:   { width: 64, height: 64, borderRadius: 32, backgroundColor: t.redDim, borderWidth: 1, borderColor: t.redBorder, alignItems: 'center', justifyContent: 'center' },
  infoTitle:  { fontSize: 18, fontWeight: '900', color: t.text, letterSpacing: -0.3, textAlign: 'center' },
  infoDesc:   { fontSize: 13, color: t.textSec, textAlign: 'center', lineHeight: 20 },

  progRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: t.border, alignSelf: 'stretch' },
  progDay:    { fontSize: 12.5, fontWeight: '700', color: t.text, flex: 1 },
  progMeta:   { fontSize: 11, color: t.textMuted },

  footer:     { paddingTop: 16 },
  cta:        { borderRadius: 16, overflow: 'hidden' },
  ctaInner:   { paddingVertical: 17, alignItems: 'center' },
  ctaTxt:     { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  skip:       { alignItems: 'center', paddingVertical: 14 },
  skipTxt:    { fontSize: 12.5, fontWeight: '600', color: t.textMuted },
});

export default function OnboardingScreen({ onDone }: Props) {
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const store = useAppStore();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [why, setWhy] = useState('');
  const [finishing, setFinishing] = useState(false);

  const TOTAL = 9;
  const next = () => setStep(v => Math.min(v + 1, TOTAL - 1));

  const askNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (granted) await scheduleDailyWorkoutReminder(17, 0);
    next();
  }, []);

  const finish = useCallback(async () => {
    setFinishing(true);
    const cw = parseFloat(currentWeight);
    if (!isNaN(cw) && cw > 0) await store.logWeight(cw);
    await store.updateProfile({
      mainGoal: goal || store.profile.mainGoal,
      goalWeight: targetWeight ? parseFloat(targetWeight) : store.profile.goalWeight,
      startWeight: !isNaN(cw) && cw > 0 ? cw : null,
      whyGoal: why,
      onboarded: true,
      notificationPrefs: {
        workoutReminders: true, messages: true, checkins: true,
        coachFeedback: true, streaks: true, milestones: true, program: true,
      },
    });
    setFinishing(false);
    onDone();
  }, [goal, currentWeight, targetWeight, why, store, onDone]);

  const Cta = ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
    <TouchableOpacity style={[s.cta, disabled && { opacity: 0.4 }]} onPress={onPress} disabled={disabled} activeOpacity={0.85}>
      <LinearGradient colors={['#E8432D', '#c73520']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaInner}>
        {finishing && step === TOTAL - 1 ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaTxt}>{label}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );

  const programDayCount = store.programDays.length;

  const steps: { kicker: string; title: string; body: React.ReactNode; cta: React.ReactNode }[] = [
    // 0 — Welcome
    {
      kicker: 'WELCOME TO VIAXE',
      title: `${store.userName},\nyour journey starts now.`,
      body: (
        <Text style={s.desc}>
          Viaxe means journey. Your coach builds the plan — Viaxe keeps you on it: every workout,
          every meal, every week, tracked and reviewed by a real human who's in your corner.
        </Text>
      ),
      cta: <Cta label="LET'S GO" onPress={next} />,
    },
    // 1 — Goal
    {
      kicker: 'STEP 1 OF 4',
      title: 'What are you here to do?',
      body: (
        <View>
          {GOALS.map(g => (
            <TouchableOpacity key={g.id} style={[s.goalCard, goal === g.id && s.goalCardOn]} onPress={() => setGoal(g.id)} activeOpacity={0.8}>
              <Text style={s.goalEmoji}>{g.emoji}</Text>
              <View>
                <Text style={s.goalName}>{g.id}</Text>
                <Text style={s.goalDesc}>{g.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ),
      cta: <Cta label="CONTINUE" onPress={next} disabled={!goal} />,
    },
    // 2 — Current weight
    {
      kicker: 'STEP 2 OF 4',
      title: 'Where are you starting from?',
      body: (
        <View>
          <TextInput
            style={s.bigInput} value={currentWeight} onChangeText={setCurrentWeight}
            placeholder="0.0" placeholderTextColor={t.textMuted} keyboardType="decimal-pad" maxLength={6} autoFocus
          />
          <Text style={s.unit}>CURRENT WEIGHT · KG</Text>
        </View>
      ),
      cta: <Cta label="CONTINUE" onPress={next} disabled={!parseFloat(currentWeight)} />,
    },
    // 3 — Target weight
    {
      kicker: 'STEP 3 OF 4',
      title: 'Where are you going?',
      body: (
        <View>
          <TextInput
            style={s.bigInput} value={targetWeight} onChangeText={setTargetWeight}
            placeholder="0.0" placeholderTextColor={t.textMuted} keyboardType="decimal-pad" maxLength={6} autoFocus
          />
          <Text style={s.unit}>TARGET WEIGHT · KG</Text>
        </View>
      ),
      cta: <Cta label="CONTINUE" onPress={next} disabled={!parseFloat(targetWeight)} />,
    },
    // 4 — Why
    {
      kicker: 'STEP 4 OF 4',
      title: 'Why does this matter to you?',
      body: (
        <View>
          <Text style={s.desc}>
            On the hard days, this is what keeps you going. Your coach sees it too.
          </Text>
          <TextInput
            style={s.whyInput} value={why} onChangeText={setWhy} multiline
            placeholder="I want to feel confident again. I want energy for my kids. I have a date with a finish line…"
            placeholderTextColor={t.textMuted}
          />
        </View>
      ),
      cta: <Cta label="CONTINUE" onPress={next} disabled={why.trim().length < 3} />,
    },
    // 5 — Coach intro
    {
      kicker: 'YOUR CORNER',
      title: "You're not doing this alone.",
      body: (
        <View style={s.infoCard}>
          <View style={s.infoIcon}><UserIcon size={28} color={t.red} strokeWidth={2} /></View>
          <Text style={s.infoTitle}>{store.coachName}</Text>
          <Text style={s.infoDesc}>
            {store.coachName} reviews your workouts, your weekly check-ins and your progress photos —
            and adjusts your plan as you change. Message them any time from the Coach tab.
          </Text>
        </View>
      ),
      cta: <Cta label="MEET MY PLAN" onPress={next} />,
    },
    // 6 — Programme preview
    {
      kicker: 'YOUR PLAN',
      title: store.assignedProgram || 'Your programme is coming.',
      body: programDayCount > 0 ? (
        <View style={s.infoCard}>
          <View style={s.infoIcon}><ClipboardIcon size={26} color={t.red} strokeWidth={2} /></View>
          <Text style={s.infoDesc}>{programDayCount} training days a week, built for your goal:</Text>
          {store.programDays.slice(0, 5).map(d => (
            <View key={d.label} style={s.progRow}>
              <Text style={s.progDay}>{d.name}</Text>
              <Text style={s.progMeta}>{d.exercises.length} exercises</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={s.infoCard}>
          <View style={s.infoIcon}><ClipboardIcon size={26} color={t.red} strokeWidth={2} /></View>
          <Text style={s.infoDesc}>
            {store.coachName} is building your personalised programme. You'll get a notification the
            moment it lands — usually within a day.
          </Text>
        </View>
      ),
      cta: <Cta label="CONTINUE" onPress={next} />,
    },
    // 7 — Notifications
    {
      kicker: 'STAY ON TRACK',
      title: 'The difference between a plan and a result.',
      body: (
        <View style={s.infoCard}>
          <View style={s.infoIcon}><BellIcon size={26} color={t.red} strokeWidth={2} /></View>
          <Text style={s.infoDesc}>
            Training reminders, coach messages, check-in nudges and streak alerts.
            People who turn these on complete far more of their programme. No spam — only what moves you forward.
          </Text>
        </View>
      ),
      cta: (
        <View>
          <Cta label="TURN ON NOTIFICATIONS" onPress={askNotifications} />
          <TouchableOpacity style={s.skip} onPress={next}>
            <Text style={s.skipTxt}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      ),
    },
    // 8 — First mission
    {
      kicker: 'FIRST MISSION',
      title: 'Make day one count.',
      body: (
        <View style={s.infoCard}>
          <View style={s.infoIcon}><FlameIcon size={26} color={t.red} strokeWidth={2} /></View>
          <Text style={s.infoTitle}>
            {programDayCount > 0 ? 'Complete your first session' : 'Log your first weigh-in — done ✓'}
          </Text>
          <Text style={s.infoDesc}>
            {programDayCount > 0
              ? 'It\'s loaded in the Train tab. Day one starts your streak — and your coach will see it.'
              : 'Your starting weight is logged. When your programme arrives, your first session starts the streak.'}
          </Text>
        </View>
      ),
      cta: <Cta label="START MY JOURNEY" onPress={finish} />,
    },
  ];

  const current = steps[step];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.inner}>
          <View style={s.progress}>
            {Array.from({ length: TOTAL }, (_, i) => (
              <View key={i} style={[s.pSeg, i <= step && s.pSegOn]} />
            ))}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>{current.kicker}</Text>
            <Text style={s.title}>{current.title}</Text>
            {current.body}
          </View>

          <View style={s.footer}>{current.cta}</View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
