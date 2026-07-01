import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleDailyWorkoutReminder, cancelDailyWorkoutReminder } from '../lib/notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { useTheme, Tokens, ThemeMode } from '../context/ThemeContext';
import { useAppStore, UserProfile } from '../store/useAppStore';
import { XIcon } from '../components/Icons';
import { RootStackParamList } from '../../App';
import { confirm } from '../utils/confirm';

const API_BASE = 'https://www.viaxe.co.uk/api';

type Props = StackScreenProps<RootStackParamList, 'Profile'> & { onLogout: () => void };

// ── Styles ─────────────────────────────────────────────────────────────────────

const makeStyles = (t: Tokens) => StyleSheet.create({
  container:    { flex: 1, backgroundColor: t.bg },
  header:       { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: t.border },
  headerTitle:  { flex: 1, fontSize: 17, fontWeight: '800', color: t.text, textAlign: 'center', letterSpacing: -0.3 },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, alignItems: 'center', justifyContent: 'center' },

  // Avatar
  avatarWrap:   { alignItems: 'center', paddingVertical: 28 },
  avatar:       { width: 80, height: 80, borderRadius: 40, backgroundColor: t.red, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarTxt:    { fontSize: 30, fontWeight: '900', color: '#fff' },
  avatarName:   { fontSize: 18, fontWeight: '800', color: t.text, letterSpacing: -0.3 },
  avatarEmail:  { fontSize: 13, color: t.textMuted, marginTop: 3 },

  // Section
  section:      { marginBottom: 8 },
  sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: t.textMuted, paddingHorizontal: 20, paddingVertical: 10, paddingBottom: 6 },
  card:         { backgroundColor: t.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.border },

  // Row
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.border },
  rowLast:      { borderBottomWidth: 0 },
  rowLabel:     { fontSize: 15, color: t.text, flex: 1 },
  rowValue:     { fontSize: 15, color: t.textMuted, marginRight: 6 },
  rowChevron:   { fontSize: 14, color: t.textMuted },

  // Input
  inputCard:    { backgroundColor: t.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.border },
  inputRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border },
  inputLabel:   { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: t.textMuted, width: 100 },
  textInput:    { flex: 1, fontSize: 15, color: t.text, paddingVertical: 2 },
  textArea:     { flex: 1, fontSize: 14, color: t.text, paddingVertical: 4, minHeight: 60, textAlignVertical: 'top' },
  input:        { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: t.text },

  // Theme toggle
  themePicker:  { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  themeBtn:     { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: t.glassBorder, backgroundColor: t.glass, alignItems: 'center' },
  themeBtnOn:   { backgroundColor: t.redDim, borderColor: t.redBorder },
  themeTxt:     { fontSize: 12, fontWeight: '700', color: t.textSec },
  themeTxtOn:   { color: t.red },

  // Save / action buttons
  saveBtn:      { backgroundColor: t.red, borderRadius: 12, marginHorizontal: 20, marginTop: 20, marginBottom: 8, paddingVertical: 15, alignItems: 'center' },
  saveBtnTxt:   { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  dangerBtn:    { borderRadius: 12, marginHorizontal: 20, marginBottom: 8, paddingVertical: 15, alignItems: 'center', backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder },
  dangerBtnTxt: { fontSize: 14, fontWeight: '700', color: t.red },

  // Billing
  billingBox:   { backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 16, margin: 20, marginBottom: 0, padding: 20, alignItems: 'center', gap: 8 },
  billingIcon:  { fontSize: 32 },
  billingTitle: { fontSize: 15, fontWeight: '800', color: t.text, letterSpacing: -0.2 },
  billingDesc:  { fontSize: 13, color: t.textMuted, textAlign: 'center', lineHeight: 19 },
});

// ── Helper components ──────────────────────────────────────────────────────────

function SectionLabel({ label, s }: { label: string; s: ReturnType<typeof makeStyles> }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function FieldRow({
  label, value, onChangeText, placeholder, keyboardType, multiline, s, last,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
  s: ReturnType<typeof makeStyles>; last?: boolean;
}) {
  return (
    <View style={[s.inputRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        style={multiline ? s.textArea : s.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? '—'}
        placeholderTextColor="rgba(128,128,128,0.4)"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        scrollEnabled={false}
      />
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ProfileSettingsScreen({ navigation, onLogout }: Props) {
  const { t, mode, setMode } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const store = useAppStore();

  // Local editable state
  const [name, setName]             = useState(store.userName || '');
  const [email, setEmail]           = useState(store.profile.email || '');
  const [phone, setPhone]           = useState(store.profile.phone || '');
  const [dob, setDob]               = useState(store.profile.dob || '');
  const [gender, setGender]         = useState(store.profile.gender || '');
  const [heightCm, setHeightCm]     = useState(store.profile.heightCm ? String(store.profile.heightCm) : '');
  const [goalWeight, setGoalWeight] = useState(store.profile.goalWeight ? String(store.profile.goalWeight) : '');
  const [mainGoal, setMainGoal]     = useState(store.profile.mainGoal || '');
  const [injuries, setInjuries]     = useState(store.profile.injuryNotes || '');
  const [nutrition, setNutrition]   = useState(store.profile.nutritionNotes || '');
  const [availability, setAvailability] = useState(store.profile.trainingAvailability || '');
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  const initials = name.trim()
    ? name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (store.userName[0] ?? 'U').toUpperCase();

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    const updates: Partial<UserProfile> = {
      email,
      phone,
      dob,
      gender,
      heightCm:   heightCm ? parseFloat(heightCm) : null,
      goalWeight: goalWeight ? parseFloat(goalWeight) : null,
      mainGoal,
      injuryNotes:          injuries,
      nutritionNotes:       nutrition,
      trainingAvailability: availability,
    };
    await store.updateProfile(updates);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [email, phone, dob, gender, heightCm, goalWeight, mainGoal, injuries, nutrition, availability]);

  const handleLogout = async () => {
    // confirm() works on web (where Alert.alert buttons are a no-op) and native.
    const ok = await confirm('Log out', 'Are you sure you want to log out?', 'Log out', 'Cancel', true);
    if (ok) onLogout();
  };

  // ── Change password (real, in-app) ─────────────────────────────────────────
  const [pwModal, setPwModal] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState(false);

  const isDemo = store.userName === 'Jack' && !store.clientId; // demo has no real session

  const openPwModal = () => {
    setCurPw(''); setNewPw(''); setNewPw2(''); setPwErr(''); setPwOk(false); setPwModal(true);
  };

  const submitPassword = async () => {
    setPwErr('');
    if (!curPw || !newPw) { setPwErr('Fill in every field.'); return; }
    if (newPw.length < 8) { setPwErr('New password must be at least 8 characters.'); return; }
    if (newPw !== newPw2) { setPwErr('New passwords do not match.'); return; }
    setPwBusy(true);
    try {
      const token = await AsyncStorage.getItem('@viaxe_token');
      const r = await fetch(`${API_BASE}/auth?action=client-change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setPwErr(d.error || 'Could not change password.'); setPwBusy(false); return; }
      setPwOk(true);
      setTimeout(() => setPwModal(false), 1200);
    } catch (e: any) {
      setPwErr('Network error. Please try again.');
    }
    setPwBusy(false);
  };

  // ── Delete account (Apple 5.1.1(v)) ─────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (isDemo) { await confirm('Demo account', 'Account deletion is not available in demo mode.', 'OK', 'OK', false); return; }
    const ok = await confirm(
      'Delete account',
      'This permanently deletes your account and all your data — workouts, progress, photos and messages. This cannot be undone.',
      'Delete account', 'Cancel', true,
    );
    if (!ok) return;
    try {
      const token = await AsyncStorage.getItem('@viaxe_token');
      const r = await fetch(`${API_BASE}/auth?action=delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        await confirm('Could not delete', d.error || 'Something went wrong. Please try again.', 'OK', 'OK', false);
        return;
      }
      // Account is gone server-side — clear local state and return to login.
      onLogout();
    } catch (e) {
      await confirm('Could not delete', 'Network error. Please check your connection and try again.', 'OK', 'OK', false);
    }
  };

  const [prefs, setPrefs] = useState<Record<string, boolean>>(store.profile.notificationPrefs || {});

  const togglePref = useCallback((key: string, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    store.updateProfile({ notificationPrefs: next });
    // The daily local reminder follows the workoutReminders preference
    if (key === 'workoutReminders') {
      if (value) scheduleDailyWorkoutReminder(17, 0);
      else cancelDailyWorkoutReminder();
    }
  }, [prefs, store]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={s.headerTitle}>Profile & Settings</Text>
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
          <XIcon size={14} color={t.text} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <Text style={s.avatarName}>{name || store.userName}</Text>
          {email ? <Text style={s.avatarEmail}>{email}</Text> : null}
        </View>

        {/* Profile fields */}
        <View style={s.section}>
          <SectionLabel label="PROFILE" s={s} />
          <View style={s.inputCard}>
            <FieldRow label="FULL NAME"  value={name}   onChangeText={setName}   placeholder="Your name" s={s} />
            <FieldRow label="EMAIL"      value={email}  onChangeText={setEmail}  placeholder="email@example.com" keyboardType="email-address" s={s} />
            <FieldRow label="PHONE"      value={phone}  onChangeText={setPhone}  placeholder="+44 7xxx xxxxxx" keyboardType="phone-pad" s={s} />
            <FieldRow label="DATE OF BIRTH" value={dob} onChangeText={setDob}   placeholder="DD/MM/YYYY" s={s} />
            <FieldRow label="GENDER"     value={gender} onChangeText={setGender} placeholder="e.g. Male / Female" s={s} last />
          </View>
        </View>

        {/* Body stats */}
        <View style={s.section}>
          <SectionLabel label="BODY & GOALS" s={s} />
          <View style={s.inputCard}>
            <FieldRow label="HEIGHT (cm)"    value={heightCm}    onChangeText={setHeightCm}    placeholder="175" keyboardType="decimal-pad" s={s} />
            <FieldRow label="GOAL WEIGHT"    value={goalWeight}  onChangeText={setGoalWeight}  placeholder="75" keyboardType="decimal-pad" s={s} />
            <FieldRow label="MAIN GOAL"      value={mainGoal}    onChangeText={setMainGoal}     placeholder="e.g. Muscle gain, fat loss…" s={s} last />
          </View>
        </View>

        {/* Health notes */}
        <View style={s.section}>
          <SectionLabel label="HEALTH & AVAILABILITY" s={s} />
          <View style={s.inputCard}>
            <FieldRow label="INJURIES"       value={injuries}    onChangeText={setInjuries}     placeholder="Any injuries or limitations…" multiline s={s} />
            <FieldRow label="NUTRITION"      value={nutrition}   onChangeText={setNutrition}    placeholder="Dietary preferences, allergies…" multiline s={s} />
            <FieldRow label="TRAINING DAYS"  value={availability} onChangeText={setAvailability} placeholder="e.g. Mon, Wed, Fri, Sat" multiline s={s} last />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.saveBtnTxt}>{saved ? '✓ SAVED' : 'SAVE CHANGES'}</Text>}
        </TouchableOpacity>

        {/* Account settings */}
        <View style={s.section}>
          <SectionLabel label="APPEARANCE" s={s} />
          <View style={s.card}>
            <View style={[s.row, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <Text style={[s.rowLabel, { marginBottom: 8 }]}>Theme</Text>
              <View style={s.themePicker}>
                {(['dark', 'light', 'system'] as ThemeMode[]).map(m => (
                  <TouchableOpacity key={m} style={[s.themeBtn, mode === m && s.themeBtnOn]} onPress={() => setMode(m)}>
                    <Text style={[s.themeTxt, mode === m && s.themeTxtOn]}>
                      {m === 'dark' ? '🌙 Dark' : m === 'light' ? '☀️ Light' : '⚙️ System'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <SectionLabel label="ACCOUNT" s={s} />
          <View style={s.card}>
            <TouchableOpacity style={s.row} onPress={openPwModal}>
              <Text style={s.rowLabel}>Change Password</Text>
              <Text style={s.rowChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.row, s.rowLast]} onPress={handleDeleteAccount}>
              <Text style={[s.rowLabel, { color: t.red }]}>Delete Account</Text>
              <Text style={s.rowChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification preferences */}
        <View style={s.section}>
          <SectionLabel label="NOTIFICATIONS" s={s} />
          <View style={s.card}>
            {([
              ['workoutReminders', 'Workout reminders'],
              ['messages',         'Coach messages'],
              ['checkins',         'Check-in reminders'],
              ['coachFeedback',    'Coach feedback'],
              ['streaks',          'Streak alerts'],
              ['milestones',       'Milestones & achievements'],
            ] as [string, string][]).map(([key, label], i, arr) => (
              <View key={key} style={[s.row, i === arr.length - 1 && s.rowLast]}>
                <Text style={s.rowLabel}>{label}</Text>
                <Switch
                  value={prefs[key] !== false}
                  onValueChange={v => togglePref(key, v)}
                  trackColor={{ true: t.red, false: t.border }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Billing */}
        <View style={s.section}>
          <SectionLabel label="BILLING" s={s} />
          <View style={s.billingBox}>
            <Text style={s.billingIcon}>💳</Text>
            <Text style={s.billingTitle}>No billing connected</Text>
            <Text style={s.billingDesc}>
              Billing is managed by your coach through the Viaxe coaching portal. Contact your coach if you have billing questions.
            </Text>
          </View>
        </View>

        {/* Logout */}
        <View style={{ marginTop: 24, marginBottom: 8 }}>
          <TouchableOpacity style={s.dangerBtn} onPress={handleLogout}>
            <Text style={s.dangerBtnTxt}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Change password modal */}
      <Modal visible={pwModal} transparent animationType="fade" onRequestClose={() => setPwModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
            <View style={{ backgroundColor: t.surface, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: t.text, marginBottom: 4 }}>Change password</Text>
              <Text style={{ fontSize: 12.5, color: t.textSec, marginBottom: 16 }}>Enter your current password and a new one (min 8 characters).</Text>
              <TextInput style={s.input} placeholder="Current password" placeholderTextColor={t.textMuted} secureTextEntry value={curPw} onChangeText={setCurPw} autoCapitalize="none" />
              <TextInput style={[s.input, { marginTop: 10 }]} placeholder="New password" placeholderTextColor={t.textMuted} secureTextEntry value={newPw} onChangeText={setNewPw} autoCapitalize="none" />
              <TextInput style={[s.input, { marginTop: 10 }]} placeholder="Confirm new password" placeholderTextColor={t.textMuted} secureTextEntry value={newPw2} onChangeText={setNewPw2} autoCapitalize="none" />
              {!!pwErr && <Text style={{ color: t.red, fontSize: 12.5, marginTop: 10 }}>{pwErr}</Text>}
              {pwOk && <Text style={{ color: t.green, fontSize: 12.5, marginTop: 10 }}>Password updated.</Text>}
              <TouchableOpacity style={[s.saveBtn, { marginHorizontal: 0, marginTop: 16, opacity: pwBusy ? 0.6 : 1 }]} onPress={submitPassword} disabled={pwBusy}>
                {pwBusy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>UPDATE PASSWORD</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 12 }} onPress={() => setPwModal(false)} disabled={pwBusy}>
                <Text style={{ color: t.textSec, fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
