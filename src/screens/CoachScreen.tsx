import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Tokens } from '../context/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { VideoIcon } from '../components/Icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://www.viaxe.co.uk/api';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  readAt: string | null;
}

const makeStyles = (t: Tokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  coachHdr: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: t.border },
  coachAvWrap: { position: 'relative' },
  coachAv: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#667EEA', alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, backgroundColor: t.green, borderRadius: 6, borderWidth: 2.5, borderColor: t.bg },
  coachName: { fontSize: 16, fontWeight: '800', color: t.text, letterSpacing: -0.3 },
  coachRole: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: t.textMuted, marginTop: 1 },
  coachSub: { fontSize: 10, color: t.textMuted, marginTop: 1 },
  callBtn: { width: 40, height: 40, backgroundColor: t.redDim, borderRadius: 12, borderWidth: 1, borderColor: t.redBorder, alignItems: 'center', justifyContent: 'center' },
  chatArea: { flex: 1 },
  chatContent: { padding: 16, gap: 12 },
  msgWrap: { gap: 3 },
  bubble: { maxWidth: '82%', borderRadius: 16, padding: 10 },
  bubbleIn: { backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderBottomLeftRadius: 4 },
  bubbleOut: { backgroundColor: t.red, borderBottomRightRadius: 4 },
  bubbleTxt: { fontSize: 13, color: t.textSec, lineHeight: 20 },
  bubbleTxtOut: { fontSize: 13, color: '#fff', lineHeight: 20 },
  msgTime: { fontSize: 9, color: t.textMuted, marginHorizontal: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.bg },
  textIn: { flex: 1, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: t.text, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, backgroundColor: t.red, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: t.text, marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 13, color: t.textMuted, textAlign: 'center', lineHeight: 19 },
  noPtWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});

export default function CoachScreen() {
  const store = useAppStore();
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const coachName = store.coachName || 'Your Coach';
  const coachInitials = coachName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const ptId = store.ptId;

  const loadMessages = useCallback(async () => {
    if (!ptId) return;
    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/messages?withUser=${ptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }, [ptId]);

  useEffect(() => {
    AsyncStorage.getItem('@viaxe_username').then(u => setMyId(u));
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !ptId) return;
    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const res = await fetch(`${BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toUserId: ptId, text }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    } catch {}
    setSending(false);
  };

  // No coach assigned
  if (!ptId) {
    return (
      <View style={s.container}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={s.coachHdr}>
            <View style={{ flex: 1 }}>
              <Text style={s.coachName}>Messages</Text>
            </View>
          </View>
          <View style={s.noPtWrap}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyTitle}>No coach assigned</Text>
            <Text style={s.emptySub}>Your coach will appear here once they've set up your account in the Viaxe coaching portal.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>

        <View style={s.coachHdr}>
          <View style={s.coachAvWrap}>
            <View style={s.coachAv}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>{coachInitials}</Text>
            </View>
            <View style={s.onlineDot} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.coachName}>{coachName}</Text>
            <Text style={s.coachRole}>PERFORMANCE COACH</Text>
            <TouchableOpacity onPress={loadMessages}>
              <Text style={s.coachSub}>Tap to refresh messages</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.callBtn}>
            <VideoIcon size={16} color={t.red} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.emptyWrap}>
            <ActivityIndicator color={t.red} />
          </View>
        ) : messages.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyTitle}>No messages yet</Text>
            <Text style={s.emptySub}>Send {coachName.split(' ')[0]} a message to start the conversation.</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={s.chatArea}
            contentContainerStyle={s.chatContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map(msg => {
              const isMe = msg.senderId !== ptId;
              return (
                <View key={msg.id} style={[s.msgWrap, isMe && { alignItems: 'flex-end' }]}>
                  <View style={[s.bubble, isMe ? s.bubbleOut : s.bubbleIn]}>
                    <Text style={isMe ? s.bubbleTxtOut : s.bubbleTxt}>{msg.text}</Text>
                  </View>
                  <Text style={[s.msgTime, isMe && { textAlign: 'right' }]}>
                    {formatTime(msg.timestamp)}{isMe && msg.readAt ? ' ✓✓' : ''}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={s.inputRow}>
          <TextInput
            style={s.textIn}
            placeholder={`Message ${coachName.split(' ')[0]}...`}
            placeholderTextColor={t.textMuted}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            multiline
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={[s.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
            disabled={!input.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ fontSize: 16, color: '#fff' }}>↑</Text>}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
