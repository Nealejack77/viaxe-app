import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, Tokens } from '../context/ThemeContext';
import { useAppStore, CheckInDraft } from '../store/useAppStore';
import { XIcon, CameraIcon, CheckIcon } from '../components/Icons';
import { RootStackParamList } from '../../App';

type Props = StackScreenProps<RootStackParamList, 'CheckIn'>;

const PHOTO_SLOTS = ['Front', 'Side', 'Back'] as const;

const SCORES: { key: keyof Pick<CheckInDraft, 'energy' | 'sleep' | 'hunger' | 'stress' | 'adherence'>; label: string; low: string; high: string }[] = [
  { key: 'energy',    label: 'ENERGY',    low: 'Drained',   high: 'Charged' },
  { key: 'sleep',     label: 'SLEEP',     low: 'Poor',      high: 'Excellent' },
  { key: 'hunger',    label: 'HUNGER',    low: 'Satisfied', high: 'Starving' },
  { key: 'stress',    label: 'STRESS',    low: 'Calm',      high: 'Maxed out' },
  { key: 'adherence', label: 'ADHERENCE', low: 'Off plan',  high: 'Dialled in' },
];

const makeStyles = (t: Tokens) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: t.bg },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: t.border },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: t.text, textAlign: 'center', letterSpacing: -0.3 },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, alignItems: 'center', justifyContent: 'center' },
  scroll:      { padding: 20, paddingBottom: 40 },

  sectionLabel:{ fontSize: 9, fontWeight: '700', letterSpacing: 2, color: t.textMuted, marginBottom: 8, marginTop: 18 },
  card:        { backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 16, padding: 16 },

  weightInput: { fontSize: 34, fontWeight: '900', color: t.text, fontFamily: 'Menlo', paddingVertical: 4 },
  weightUnit:  { fontSize: 14, color: t.textMuted, fontWeight: '700' },

  scoreRow:    { marginBottom: 14 },
  scoreHead:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  scoreLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: t.textSec },
  scoreVal:    { fontSize: 12, fontWeight: '800', color: t.red, fontFamily: 'Menlo' },
  dotRow:      { flexDirection: 'row', gap: 5 },
  dot:         { flex: 1, height: 26, borderRadius: 7, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder },
  dotOn:       { backgroundColor: t.red, borderColor: t.red },
  scoreEnds:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  endLabel:    { fontSize: 9, color: t.textMuted },

  photoRow:    { flexDirection: 'row', gap: 10 },
  photoSlot:   { flex: 1, aspectRatio: 3 / 4, borderRadius: 14, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 6 },
  photoLabel:  { fontSize: 10, fontWeight: '700', color: t.textMuted, letterSpacing: 1 },
  photoImg:    { width: '100%', height: '100%' },

  notes:       { fontSize: 14, color: t.text, minHeight: 80, textAlignVertical: 'top', padding: 14, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 14 },

  submitBtn:   { backgroundColor: t.red, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitTxt:   { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  doneWrap:    { alignItems: 'center', paddingVertical: 60, gap: 14 },
  doneIcon:    { width: 72, height: 72, borderRadius: 36, backgroundColor: t.redDim, borderWidth: 1, borderColor: t.redBorder, alignItems: 'center', justifyContent: 'center' },
  doneTitle:   { fontSize: 20, fontWeight: '900', color: t.text, letterSpacing: -0.4 },
  doneDesc:    { fontSize: 13, color: t.textMuted, textAlign: 'center', lineHeight: 19, paddingHorizontal: 30 },

  histRow:     { backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  histDate:    { fontSize: 12, fontWeight: '800', color: t.text },
  histMeta:    { fontSize: 11.5, color: t.textSec, marginTop: 3, lineHeight: 17 },
  replyBox:    { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: t.redDim, borderWidth: 1, borderColor: t.redBorder },
  replyLabel:  { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: t.red, marginBottom: 3 },
  replyText:   { fontSize: 12.5, color: t.textSec, lineHeight: 18 },
});

function ScoreRow({ label, low, high, value, onChange, s }: {
  label: string; low: string; high: string; value: number;
  onChange: (v: number) => void; s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.scoreRow}>
      <View style={s.scoreHead}>
        <Text style={s.scoreLabel}>{label}</Text>
        <Text style={s.scoreVal}>{value}/10</Text>
      </View>
      <View style={s.dotRow}>
        {Array.from({ length: 10 }, (_, i) => (
          <TouchableOpacity
            key={i}
            style={[s.dot, i < value && s.dotOn]}
            onPress={() => onChange(i + 1)}
            activeOpacity={0.7}
          />
        ))}
      </View>
      <View style={s.scoreEnds}>
        <Text style={s.endLabel}>{low}</Text>
        <Text style={s.endLabel}>{high}</Text>
      </View>
    </View>
  );
}

export default function CheckInScreen({ navigation }: Props) {
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const store = useAppStore();

  const [weight, setWeight] = useState(store.currentWeight ? String(store.currentWeight) : '');
  const [scores, setScores] = useState({ energy: 6, sleep: 6, hunger: 5, stress: 4, adherence: 7 });
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { store.loadCheckIns(); }, []);

  const pickPhoto = useCallback(async (slot: number) => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.3,
        base64: true,
        allowsEditing: true,
        aspect: [3, 4],
      });
      if (res.canceled || !res.assets?.[0]?.base64) return;
      const uri = `data:image/jpeg;base64,${res.assets[0].base64}`;
      if (uri.length > 850000) {
        Alert.alert('Photo too large', 'Please pick a smaller photo.');
        return;
      }
      setPhotos(prev => prev.map((p, i) => (i === slot ? uri : p)));
    } catch {}
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    const ok = await store.submitCheckIn({
      weight: weight ? parseFloat(weight) : null,
      ...scores,
      notes,
      photos: photos.filter(Boolean) as string[],
    });
    setSubmitting(false);
    if (ok) {
      setDone(true);
      store.loadCheckIns();
    } else {
      Alert.alert('Could not submit', 'Check your connection and try again.');
    }
  }, [weight, scores, notes, photos, store]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={s.headerTitle}>Weekly Check-in</Text>
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
          <XIcon size={14} color={t.text} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {done ? (
          <View style={s.doneWrap}>
            <View style={s.doneIcon}>
              <CheckIcon size={32} color={t.red} strokeWidth={2.5} />
            </View>
            <Text style={s.doneTitle}>Check-in sent</Text>
            <Text style={s.doneDesc}>
              {store.coachName} has been notified and will review it. You'll get a notification when they reply.
            </Text>
            <TouchableOpacity style={[s.submitBtn, { alignSelf: 'stretch' }]} onPress={() => navigation.goBack()}>
              <Text style={s.submitTxt}>DONE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Weight */}
            <Text style={[s.sectionLabel, { marginTop: 0 }]}>CURRENT WEIGHT</Text>
            <View style={[s.card, { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }]}>
              <TextInput
                style={[s.weightInput, { flex: 1 }]}
                value={weight}
                onChangeText={setWeight}
                placeholder="0.0"
                placeholderTextColor={t.textMuted}
                keyboardType="decimal-pad"
                maxLength={6}
              />
              <Text style={[s.weightUnit, { marginBottom: 10 }]}>KG</Text>
            </View>

            {/* Scores */}
            <Text style={s.sectionLabel}>HOW WAS YOUR WEEK?</Text>
            <View style={s.card}>
              {SCORES.map(sc => (
                <ScoreRow
                  key={sc.key}
                  label={sc.label} low={sc.low} high={sc.high}
                  value={scores[sc.key]}
                  onChange={v => setScores(prev => ({ ...prev, [sc.key]: v }))}
                  s={s}
                />
              ))}
            </View>

            {/* Photos */}
            <Text style={s.sectionLabel}>PROGRESS PHOTOS (OPTIONAL)</Text>
            <View style={s.photoRow}>
              {PHOTO_SLOTS.map((label, i) => (
                <TouchableOpacity key={label} style={s.photoSlot} onPress={() => pickPhoto(i)} activeOpacity={0.8}>
                  {photos[i] ? (
                    <Image source={{ uri: photos[i]! }} style={s.photoImg} resizeMode="cover" />
                  ) : (
                    <>
                      <CameraIcon size={20} color={t.textMuted} strokeWidth={1.8} />
                      <Text style={s.photoLabel}>{label.toUpperCase()}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={s.sectionLabel}>NOTES FOR YOUR COACH</Text>
            <TextInput
              style={s.notes}
              value={notes}
              onChangeText={setNotes}
              placeholder="Wins, struggles, questions — anything your coach should know…"
              placeholderTextColor={t.textMuted}
              multiline
            />

            <TouchableOpacity style={s.submitBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>SUBMIT CHECK-IN</Text>}
            </TouchableOpacity>

            {/* History */}
            {store.checkIns.length > 0 && (
              <>
                <Text style={s.sectionLabel}>PREVIOUS CHECK-INS</Text>
                {store.checkIns.slice(0, 8).map(ci => (
                  <View key={ci.id} style={s.histRow}>
                    <Text style={s.histDate}>
                      {new Date(ci.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <Text style={s.histMeta}>
                      {ci.weight ? `${ci.weight}kg · ` : ''}Energy {ci.energy ?? '–'}/10 · Sleep {ci.sleep ?? '–'}/10 · Adherence {ci.adherence ?? '–'}/10
                      {ci.photoCount ? ` · 📷 ${ci.photoCount}` : ''}
                    </Text>
                    {ci.coachReply ? (
                      <View style={s.replyBox}>
                        <Text style={s.replyLabel}>{store.coachName.toUpperCase()}</Text>
                        <Text style={s.replyText}>{ci.coachReply.text}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
