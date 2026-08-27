import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Tokens } from '../context/ThemeContext';
import { Wordmark } from '../components/grit';

const API = 'https://www.viaxe.co.uk/api/auth?action=client-login';

interface Props {
  onLogin: (token?: string, username?: string) => void;
}

const makeStyles = (t: Tokens) => StyleSheet.create({
  outer: { flex: 1, backgroundColor: t.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  kickerSlash: { fontFamily: 'BarlowCondensed-Black', fontSize: 9.5, fontWeight: '700', letterSpacing: 2.5, color: t.red, marginRight: 6 },
  kicker: { fontFamily: 'BarlowCondensed-Black', fontSize: 9.5, fontWeight: '700', letterSpacing: 2.5, color: t.textMuted },
  card: { backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 4, padding: 24, marginBottom: 20, overflow: 'hidden' },
  cardRule: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: t.green },
  heading: { fontFamily: 'BarlowCondensed-Black', fontSize: 34, lineHeight: 32, color: t.text, marginBottom: 4, letterSpacing: -0.4, textTransform: 'uppercase' },
  sub: { fontSize: 12, color: t.textSec, marginBottom: 24 },
  fieldWrap: { marginBottom: 16 },
  label: { fontFamily: 'BarlowCondensed-Black', fontSize: 9.5, fontWeight: '700', letterSpacing: 1.5, color: t.textMuted, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: t.text },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 4 },
  err: { fontSize: 12, color: t.red, marginBottom: 12, textAlign: 'center' },
  loginBtn: { backgroundColor: t.green, borderRadius: 3, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  loginTxt: { fontFamily: 'IBMPlexSans-Bold', fontSize: 12, color: '#171714', letterSpacing: 1.4, textTransform: 'uppercase' },
  demoBtn: { alignItems: 'center', paddingVertical: 12 },
  demoTxt: { fontSize: 13, color: t.red, fontWeight: '600' },
  hint: { textAlign: 'center', fontSize: 11, color: t.textMuted, marginTop: 16, lineHeight: 17 },
});

export default function LoginScreen({ onLogin }: Props) {
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const handleForgot = async () => {
    const email = username.trim().toLowerCase();
    setResetMsg('');
    if (!email.includes('@')) {
      setError('Enter your account email in the field above, then tap Forgot password.');
      return;
    }
    setError('');
    try {
      await fetch('https://www.viaxe.co.uk/api/auth?action=request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch { /* still show the neutral message — never reveal existence */ }
    setResetMsg('If an account exists for that email, a reset link is on its way. Check your inbox.');
  };

  const submit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Enter your username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = data.error === 'Invalid credentials'
          ? 'Incorrect password. Try your email address if you used a username, or vice versa.'
          : (data.error || 'Login failed');
        setError(msg);
        setLoading(false);
        return;
      }
      await AsyncStorage.setItem('@viaxe_token', data.token);
      await AsyncStorage.setItem('@viaxe_username', username.trim().toLowerCase());
      onLogin(data.token, username.trim().toLowerCase());
    } catch (e: any) {
      setError(`Network error: ${e?.message || 'unknown'}. Check connection.`);
    }
    setLoading(false);
  };

  const demoLogin = async () => {
    await AsyncStorage.setItem('@viaxe_token', 'demo');
    await AsyncStorage.setItem('@viaxe_username', 'demo');
    onLogin('demo', 'demo');
  };

  return (
    <KeyboardAvoidingView style={s.outer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={s.inner}>

        <View style={s.logoWrap}>
          <Wordmark size={52} color={t.text} />
          <View style={s.kickerRow}>
            <Text style={s.kicker}>STRENGTH COACHING</Text>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.cardRule} />
          <Text style={s.heading}>Back at it.</Text>
          <Text style={s.sub}>Sign in and get to work.</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>USERNAME OR EMAIL</Text>
            <TextInput
              style={s.input}
              placeholder="yourname123 or email@example.com"
              placeholderTextColor={t.textMuted}
              value={username}
              onChangeText={v => { setUsername(v); setError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>PASSWORD</Text>
            <View style={s.pwRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={t.textMuted}
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              <TouchableOpacity onPress={() => setShowPw(p => !p)} style={s.eyeBtn} accessibilityRole="button" accessibilityLabel={showPw ? 'Hide password' : 'Show password'}>
                <Text style={{ fontSize: 16 }}>{showPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!!error && <Text style={s.err}>{error}</Text>}

          <TouchableOpacity style={s.loginBtn} onPress={submit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#171714" />
              : <Text style={s.loginTxt}>LOG IN</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgot} style={{ alignItems: 'center', paddingTop: 14 }}>
            <Text style={{ fontSize: 12, color: t.textSec, fontWeight: '600' }}>Forgot password?</Text>
          </TouchableOpacity>
          {!!resetMsg && <Text style={[s.hint, { marginTop: 8 }]}>{resetMsg}</Text>}
        </View>

        {__DEV__ && (
        <TouchableOpacity onPress={demoLogin} style={s.demoBtn}>
          <Text style={s.demoTxt}>Continue with demo account →</Text>
        </TouchableOpacity>
        )}

        <Text style={s.hint}>
          Don't have an account? Ask your coach to send you an invite link.
        </Text>

      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
