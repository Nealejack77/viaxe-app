import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Tokens } from '../context/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { ArrowUpIcon } from '../components/Icons';

interface ChatMsg {
  id: string;
  role: 'aria' | 'user';
  text: string;
}

function buildInitialMsg(store: ReturnType<typeof useAppStore>): ChatMsg {
  let text = "I'm ARIA, your AI coach. Ask me anything about training, nutrition, recovery, or performance.";
  if (store.streak > 10) {
    text = `${store.streak}-day training streak — you're building something serious. What would you like to work on today?`;
  } else if (store.streak > 0) {
    text = `${store.streak} days in a row. Consistency is the foundation. What can I help you with?`;
  }
  return { id: '0', role: 'aria', text };
}

const PROMPT_CHIPS = [
  'Should I train today?',
  'Why am I plateauing?',
  'Fix my bench press',
  "How's my nutrition?",
  'Best recovery tips?',
  'Improve my sleep',
];

function buildAriaResponse(input: string, store: ReturnType<typeof useAppStore>): string {
  const lower = input.toLowerCase();
  const hasWorkouts = store.sessions.length > 0;
  const hasWeight   = store.weightLog.length > 0;
  const hasAnyData  = hasWorkouts || hasWeight;

  if (!hasAnyData) {
    return "I need more real data before I can give useful feedback. Log a workout and your bodyweight to get started.";
  }

  const latestWeight  = hasWeight  ? store.weightLog[store.weightLog.length - 1].weight : null;
  const firstWeight   = hasWeight  ? store.weightLog[0].weight : null;
  const totalSessions = store.sessions.length;
  const streak        = store.streak;
  const lastSession   = store.sessions[0] ?? null;

  if (lower.includes('weight') || lower.includes('progress') || lower.includes('fat') || lower.includes('heavy')) {
    if (latestWeight && firstWeight) {
      const change = latestWeight - firstWeight;
      return `Your latest logged weight is ${latestWeight}kg. Since your first entry (${firstWeight}kg), that's ${change > 0 ? '+' : ''}${change.toFixed(1)}kg over ${store.weightLog.length} weigh-in${store.weightLog.length !== 1 ? 's' : ''}. Keep logging daily for the clearest trend.`;
    }
    if (latestWeight) return `Your last logged weight is ${latestWeight}kg. Log regularly to track your trend over time.`;
    return "No bodyweight data yet. Log your weight in the Progress tab.";
  }

  if (lower.includes('workout') || lower.includes('train') || lower.includes('session') || lower.includes('lift')) {
    if (lastSession) {
      return `You've completed ${totalSessions} workout${totalSessions !== 1 ? 's' : ''}${streak > 0 ? ` and you're on a ${streak}-day streak` : ''}. Last session: ${lastSession.workoutName} — ${lastSession.duration} min, ${lastSession.setsCompleted} sets completed.`;
    }
    return "No workouts logged yet. Head to the Train tab to start your first session.";
  }

  if (lower.includes('streak') || lower.includes('consistent') || lower.includes('habit')) {
    if (streak > 0) return `You're on a ${streak}-day training streak across ${totalSessions} total session${totalSessions !== 1 ? 's' : ''}. Consistency is building — keep it going.`;
    return `${totalSessions} total session${totalSessions !== 1 ? 's' : ''} logged. No current streak — train today to start one.`;
  }

  if (lower.includes('nutrition') || lower.includes('food') || lower.includes('eat') || lower.includes('diet') || lower.includes('protein') || lower.includes('macro')) {
    return "Use the Nutrition tab to log your food. Once you have a few days of data I can give you specific feedback on your intake.";
  }

  if (lower.includes('sleep') || lower.includes('recover') || lower.includes('rest') || lower.includes('hrv')) {
    return "I don't have sleep or HRV data for you yet — that requires a connected wearable. Focus on what we know: consistent training and logged bodyweight.";
  }

  if (lower.includes('coach') || lower.includes('feedback') || lower.includes('program') || lower.includes('plan')) {
    return store.assignedProgram
      ? `You're on the "${store.assignedProgram}" program. Check the Train tab for your sessions. Message your coach in the Coach tab for specific feedback.`
      : "You don't have a program assigned yet. Your coach can set this up through the coaching portal.";
  }

  // Default: summarise what real data exists
  if (streak > 0 && latestWeight) {
    return `You have a ${streak}-day streak, ${totalSessions} session${totalSessions !== 1 ? 's' : ''} logged, and your latest weight is ${latestWeight}kg. What would you like to focus on?`;
  }
  if (hasWorkouts) {
    return `${totalSessions} session${totalSessions !== 1 ? 's' : ''} logged${streak > 0 ? `, ${streak}-day streak` : ''}. Ask me about your training, weight progress, or program.`;
  }
  return "I can see your account but don't have enough data yet. Log a workout or bodyweight to get started.";
}


const makeStyles = (t: Tokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  ariaHdr: { alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.border },
  ariaPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: t.redDim, borderColor: t.redBorder, borderWidth: 1, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 4 },
  ariaDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: t.red },
  ariaTag: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: t.red },
  ariaSub: { fontSize: 10, color: t.textMuted, letterSpacing: 0.5 },
  chat: { flex: 1 },
  chatContent: { padding: 16, gap: 12 },
  msgRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  ariaAvSmall: { width: 24, height: 24, borderRadius: 12, backgroundColor: t.redDim, borderWidth: 1, borderColor: t.redBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble: { maxWidth: '86%', borderRadius: 14, padding: 10 },
  ariaBubble: { backgroundColor: t.redDim, borderWidth: 1, borderColor: t.redBorder, borderTopLeftRadius: 3 },
  userBubble: { backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderBottomRightRadius: 3 },
  bubbleTxt: { fontSize: 13, color: t.textSec, lineHeight: 20 },
  userBubbleTxt: { fontSize: 13, color: t.text, lineHeight: 20 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, gap: 6 },
  chip: { backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7 },
  chipTxt: { fontSize: 12, color: t.textSec, letterSpacing: 0.2 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.bg },
  textIn: { flex: 1, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: t.text, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, backgroundColor: t.red, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

export default function ARIAScreen() {
  const store = useAppStore();
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [messages, setMessages] = useState<ChatMsg[]>(() => [buildInitialMsg(store)]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = () => {
    if (!input.trim() || typing) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const response = buildAriaResponse(userMsg.text, store);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'aria', text: response }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1400);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>

        <View style={s.ariaHdr}>
          <View style={s.ariaPill}>
            <View style={s.ariaDot} />
            <Text style={s.ariaTag}>ARIA · AI COACH</Text>
          </View>
          <Text style={s.ariaSub}>
            {store.sessions.length + store.weightLog.length > 0
              ? `Analysing ${store.sessions.length + store.weightLog.length} data points`
              : 'Log workouts and weight to get personalised insights'}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={s.chat}
          contentContainerStyle={s.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map(msg => (
            <View key={msg.id} style={[s.msgRow, msg.role === 'user' && { justifyContent: 'flex-end' }]}>
              {msg.role === 'aria' && (
                <View style={s.ariaAvSmall}>
                  <Text style={{ fontSize: 11, color: t.red }}>⚡</Text>
                </View>
              )}
              <View style={[s.bubble, msg.role === 'user' ? s.userBubble : s.ariaBubble]}>
                <Text style={msg.role === 'user' ? s.userBubbleTxt : s.bubbleTxt}>{msg.text}</Text>
              </View>
            </View>
          ))}

          {typing && (
            <View style={s.msgRow}>
              <View style={s.ariaAvSmall}>
                <Text style={{ fontSize: 11, color: t.red }}>⚡</Text>
              </View>
              <View style={s.ariaBubble}>
                <Text style={{ fontSize: 13, color: t.textMuted, padding: 10 }}>ARIA is analysing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={s.chipsWrap}>
          {PROMPT_CHIPS.map(chip => (
            <TouchableOpacity key={chip} onPress={() => setInput(chip)} style={s.chip}>
              <Text style={s.chipTxt}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.inputRow}>
          <TextInput
            style={s.textIn}
            placeholder="Ask ARIA anything..."
            placeholderTextColor={t.textMuted}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={send}
            multiline
          />
          <TouchableOpacity onPress={send} style={[s.sendBtn, (!input.trim() || typing) && { opacity: 0.4 }]}>
            <ArrowUpIcon size={18} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
