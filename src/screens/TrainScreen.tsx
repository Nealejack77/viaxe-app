import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme, Tokens } from '../context/ThemeContext';
import { WORKOUTS, Workout } from '../data/workouts';
import { useAppStore, ProgramDay, WorkoutExercise, CompletedSet } from '../store/useAppStore';
import { XIcon, CheckIcon, PlusIcon } from '../components/Icons';

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function parseWeight(w: string): number {
  const n = parseFloat(w.replace(/kg$/i, '').trim());
  return isNaN(n) ? 0 : n;
}

function parseReps(r: string): number {
  const n = parseInt(r);
  return isNaN(n) ? 10 : n;
}

function dayEmoji(type: string): string {
  const tl = type.toLowerCase();
  if (tl.includes('cardio')) return '🏃';
  if (tl.includes('lower')) return '🦵';
  if (tl.includes('pull') || tl.includes('back')) return '💪';
  if (tl.includes('push') || tl.includes('chest')) return '⚡';
  return '🏋️';
}

function programDaysToWorkouts(days: ProgramDay[]): Workout[] {
  return days.map((day, i) => ({
    id: `prog-${i}`,
    name: day.name,
    tag: day.type.toUpperCase(),
    duration: Math.max(30, day.exercises.length * 8),
    emoji: dayEmoji(day.name + ' ' + day.type),
    exercises: day.exercises.map((ex, j) => ({
      id: `p${i}-${j}`,
      name: ex.name,
      sets: Math.max(1, parseInt(ex.sets) || 3),
      reps: parseReps(ex.reps),
      repsLabel: ex.reps,
      weight: parseWeight(ex.weight),
      weightLabel: ex.weight === 'BW' || ex.weight === '—' ? ex.weight : '',
      rest: 120,
      category: day.type,
    })),
  }));
}

// ─── Exercise database for "Add Exercise" modal ──────────────────────────────

const EXERCISE_DB = [
  // Chest
  'Barbell Bench Press', 'Dumbbell Bench Press', 'Incline Bench Press', 'Decline Bench Press',
  'Cable Fly', 'Dumbbell Fly', 'Push-Up', 'Dips',
  // Back
  'Deadlift', 'Barbell Row', 'Dumbbell Row', 'Lat Pulldown', 'Pull-Up', 'Chin-Up',
  'Seated Cable Row', 'Face Pull', 'T-Bar Row',
  // Shoulders
  'Barbell Overhead Press', 'Dumbbell Shoulder Press', 'Arnold Press', 'Lateral Raise',
  'Front Raise', 'Rear Delt Fly', 'Upright Row',
  // Legs
  'Back Squat', 'Front Squat', 'Romanian Deadlift', 'Leg Press', 'Hack Squat',
  'Bulgarian Split Squat', 'Walking Lunge', 'Leg Extension', 'Leg Curl',
  'Seated Leg Curl', 'Standing Calf Raise', 'Barbell Hip Thrust',
  // Arms
  'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Preacher Curl',
  'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension', 'Close-Grip Bench Press',
  // Core
  'Plank', 'Ab Wheel Rollout', 'Cable Crunch', 'Hanging Leg Raise', 'Dead Bug',
  'Russian Twist', 'Pallof Press',
  // Cardio
  'Treadmill', 'Rowing Machine', 'Assault Bike', 'Stair Climber',
  'Incline Treadmill Walk', 'Jump Rope',
].sort();

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveSet {
  reps: number;
  weight: number;
  completed: boolean;
  notes: string;
}

interface LiveExercise {
  id: string;
  name: string;
  category: string;
  planned: { sets: number; reps: string; weight: string };
  sets: LiveSet[];
  notes: string;
  addedByClient: boolean;
  rest: number;
}

function buildLiveExercises(workout: Workout): LiveExercise[] {
  return workout.exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    category: ex.category,
    planned: {
      sets: ex.sets,
      reps: (ex as any).repsLabel || String(ex.reps),
      weight: ex.weight > 0 ? `${ex.weight}kg` : ((ex as any).weightLabel || 'BW'),
    },
    sets: Array.from({ length: ex.sets }, () => ({
      reps: ex.reps,
      weight: ex.weight,
      completed: false,
      notes: '',
    })),
    notes: '',
    addedByClient: false,
    rest: ex.rest,
  }));
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: Tokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  selectorTitle: { fontSize: 48, fontWeight: '900', color: t.text, letterSpacing: -2, lineHeight: 50, marginBottom: 8 },
  planTag: { backgroundColor: t.redDim, borderWidth: 1, borderColor: t.redBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 6 },
  planTagTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: t.red },
  selectorSub: { fontSize: 14, color: t.textSec, marginBottom: 28 },
  workoutCard: { borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: t.glassBorder, overflow: 'hidden' },
  workoutCardInner: { padding: 20 },
  workoutTagBg: { backgroundColor: t.glassEl, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  workoutName: { fontSize: 22, fontWeight: '900', color: t.text, letterSpacing: -0.5, marginBottom: 4 },
  workoutMeta: { fontSize: 13, color: t.textSec, marginBottom: 16 },
  startBtn: { backgroundColor: t.redDim, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: t.redBorder },
  startBtnTxt: { fontSize: 12, fontWeight: '800', color: t.red, letterSpacing: 1 },
  trainHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  trainTitle: { fontSize: 11, fontWeight: '800', color: t.text, letterSpacing: 0.5 },
  timerTxt: { fontSize: 22, fontWeight: '700', fontFamily: t.mono, marginTop: 2, color: t.red },
  liveBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginHorizontal: 20, backgroundColor: t.redDim, borderColor: t.redBorder, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  lmItem: { alignItems: 'center' },
  lmVal: { fontSize: 18, fontWeight: '700', color: t.text, fontFamily: t.mono },
  lmLabel: { fontSize: 8, letterSpacing: 1.5, color: t.red, fontWeight: '700', marginTop: 1 },
  lmDiv: { width: 1, height: 30, backgroundColor: t.border },
  restOverlay: { position: 'absolute', inset: 0, backgroundColor: t.scheme === 'dark' ? 'rgba(8,8,8,0.96)' : 'rgba(247,247,248,0.97)', zIndex: 50, alignItems: 'center', justifyContent: 'center' },
  restLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 4, color: t.textMuted, marginBottom: 8 },
  restCount: { fontSize: 80, fontWeight: '900', color: t.text, fontFamily: t.mono, letterSpacing: -3 },
  restSkip: { marginTop: 32, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: t.glass, borderRadius: 12, borderWidth: 1, borderColor: t.glassBorder },
  restSkipTxt: { fontSize: 13, fontWeight: '700', color: t.textSec, letterSpacing: 1 },
  exCard: { backgroundColor: t.glass, borderColor: t.glassBorder, borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 14 },
  exLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 2, color: t.red, marginBottom: 4 },
  exName: { fontSize: 24, fontWeight: '900', color: t.text, letterSpacing: -0.5, marginBottom: 4 },
  exPlanned: { fontSize: 11, color: t.textMuted, marginBottom: 14 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, backgroundColor: t.elevated, borderRadius: 12, padding: 10 },
  setNum: { fontSize: 12, fontWeight: '700', color: t.textMuted, width: 20, fontFamily: t.mono },
  setNumActive: { color: t.red },
  setNumDone: { color: t.green },
  setInput: { flex: 1, backgroundColor: t.inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 15, color: t.text, borderWidth: 1, borderColor: t.border, textAlign: 'center' },
  setInputLabel: { fontSize: 8, color: t.textMuted, textAlign: 'center', marginTop: 2 },
  logSetBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: t.redDim, borderWidth: 1, borderColor: t.redBorder, alignItems: 'center', justifyContent: 'center' },
  logSetBtnDone: { backgroundColor: 'rgba(52,199,89,0.12)', borderColor: 'rgba(52,199,89,0.35)' },
  nextExBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 6 },
  nextExBtnInner: { padding: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: t.red, backgroundColor: t.glass },
  nextExBtnTxt: { fontSize: 14, fontWeight: '800', color: t.red, letterSpacing: 1 },
  logBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  logBtnInner: { padding: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  logBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  addExBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.glass, marginBottom: 8 },
  addExTxt: { fontSize: 13, fontWeight: '700', color: t.textSec },
  queueItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.glass, borderRadius: 12, padding: 12, marginBottom: 6 },
  queueNum: { fontSize: 10, color: t.textMuted, width: 18, fontFamily: t.mono },
  queueName: { flex: 1, fontSize: 13, fontWeight: '600', color: t.textSec },
  queueMeta: { fontSize: 10, color: t.textMuted, fontFamily: t.mono },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, width: '100%', maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: t.text, letterSpacing: -0.5, marginBottom: 4 },
  modalSub: { fontSize: 13, color: t.textSec, marginBottom: 16 },
  modalClose: { position: 'absolute', top: 20, right: 20 },
  searchInput: { backgroundColor: t.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: t.text, borderWidth: 1, borderColor: t.border, marginBottom: 12 },
  exListItem: { paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: t.border },
  exListItemTxt: { fontSize: 15, color: t.text, fontWeight: '500' },
  completionCard: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, alignItems: 'center', width: '100%' },
  completionTitle: { fontSize: 36, fontWeight: '900', color: t.text, letterSpacing: -1.5, textAlign: 'center', marginBottom: 8 },
  completionSub: { fontSize: 14, color: t.textSec, textAlign: 'center', marginBottom: 6 },
  rpeRow: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' },
  rpeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: t.border, backgroundColor: t.glass },
  rpeChipActive: { backgroundColor: t.red, borderColor: t.red },
  rpeChipTxt: { fontSize: 13, color: t.textSec, fontWeight: '600' },
  rpeChipTxtActive: { color: '#fff' },
  notesInput: { backgroundColor: t.inputBg, borderRadius: 12, padding: 12, fontSize: 14, color: t.text, borderWidth: 1, borderColor: t.border, marginBottom: 16, minHeight: 60 },
  addExConfigCard: { gap: 12, marginBottom: 16 },
  configRow: { flexDirection: 'row', gap: 10 },
  configInput: { flex: 1, backgroundColor: t.inputBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: t.text, borderWidth: 1, borderColor: t.border },
  configLabel: { fontSize: 9, color: t.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  // Exercise selector chips (non-linear navigation)
  chipBar: { paddingHorizontal: 20, paddingBottom: 10, gap: 8, flexDirection: 'row' },
  chip: { minWidth: 40, height: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: t.glassBorder, backgroundColor: t.glass, alignItems: 'center', justifyContent: 'center' },
  chipActive: { borderColor: t.red, backgroundColor: t.redDim },
  chipDone: { borderColor: 'rgba(52,199,89,0.35)', backgroundColor: 'rgba(52,199,89,0.10)' },
  chipTxt: { fontSize: 13, fontWeight: '800', color: t.textMuted, fontFamily: t.mono },
  chipTxtActive: { color: t.red },
  chipTxtDone: { color: t.green },
  // Exit confirmation modal
  exitCard: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, width: '100%' },
  exitBtn: { padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  exitBtnTxt: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  finishBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4, marginBottom: 8 },
  finishBtnInner: { padding: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: t.green, backgroundColor: t.glass },
  finishBtnTxt: { fontSize: 13, fontWeight: '800', color: t.green, letterSpacing: 1 },
});

// ─── Workout Selector ─────────────────────────────────────────────────────────

function WorkoutSelector({ workouts, programName, onSelect }: {
  workouts: Workout[];
  programName: string;
  onSelect: (w: Workout) => void;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const store = useAppStore();

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.selectorTitle}>Today's{'\n'}Plan.</Text>
          {programName ? (
            <View style={s.planTag}><Text style={s.planTagTxt}>{programName.toUpperCase()}</Text></View>
          ) : null}
          <Text style={s.selectorSub}>Select a session to begin</Text>

          {workouts.map((w, i) => (
            <TouchableOpacity key={w.id} onPress={() => onSelect(w)} activeOpacity={0.85} style={s.workoutCard}>
              {i === 0 ? (
                <LinearGradient colors={['#E8432D', '#c73520']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={s.workoutCardInner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: t.text, fontFamily: t.mono, letterSpacing: -1 }}>//</Text>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.9)' }}>{w.tag}</Text>
                      </View>
                    </View>
                    <Text style={[s.workoutName, { color: '#fff' }]}>{w.name}</Text>
                    <Text style={[s.workoutMeta, { color: 'rgba(255,255,255,0.75)' }]}>{w.exercises.length} exercises · ~{w.duration} min</Text>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 1 }}>START →</Text>
                    </View>
                  </View>
                </LinearGradient>
              ) : (
                <View style={[s.workoutCardInner, { backgroundColor: t.glass }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: t.text, fontFamily: t.mono, letterSpacing: -1 }}>//</Text>
                    <View style={s.workoutTagBg}>
                      <Text style={{ fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: t.textMuted }}>{w.tag}</Text>
                    </View>
                  </View>
                  <Text style={s.workoutName}>{w.name}</Text>
                  <Text style={s.workoutMeta}>{w.exercises.length} exercises · ~{w.duration} min</Text>
                  <View style={s.startBtn}><Text style={s.startBtnTxt}>START →</Text></View>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Recent sessions */}
          {store.sessions.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, color: t.textMuted, marginBottom: 10 }}>RECENT SESSIONS</Text>
              {store.sessions.slice(0, 5).map(sess => (
                <View key={sess.id} style={[s.queueItem, { marginBottom: 8 }]}>
                  <Text style={{ fontSize: 18 }}>🏋️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: t.text }}>{sess.workoutName}</Text>
                    <Text style={{ fontSize: 10, color: t.textMuted }}>{sess.date} · {sess.duration} min · {sess.setsCompleted} sets</Text>
                    {sess.coachFeedback && (
                      <Text style={{ fontSize: 10, color: t.green, marginTop: 2 }}>✓ Coach reviewed</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {!store.workoutsLoaded && (
            <Text style={{ fontSize: 12, color: t.textMuted, textAlign: 'center', marginTop: 16 }}>Loading your workout history...</Text>
          )}
          {store.workoutsLoaded && store.sessions.length === 0 && (
            <Text style={{ fontSize: 12, color: t.textMuted, textAlign: 'center', marginTop: 16 }}>No workouts logged yet. Start your first session above.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Add Exercise Modal ────────────────────────────────────────────────────────

function AddExerciseModal({ visible, onClose, onAdd }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (ex: LiveExercise) => void;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [numSets, setNumSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('0');

  const filtered = EXERCISE_DB.filter(e =>
    !search.trim() || e.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleAdd = () => {
    if (!selected) return;
    const setsCount = Math.max(1, parseInt(numSets) || 3);
    const ex: LiveExercise = {
      id: `added-${Date.now()}`,
      name: selected,
      category: 'Added',
      planned: { sets: setsCount, reps, weight: weight !== '0' ? `${weight}kg` : 'BW' },
      sets: Array.from({ length: setsCount }, () => ({
        reps: parseInt(reps) || 10,
        weight: parseFloat(weight) || 0,
        completed: false,
        notes: '',
      })),
      notes: '',
      addedByClient: true,
      rest: 90,
    };
    onAdd(ex);
    setSearch('');
    setSelected(null);
    setNumSets('3');
    setReps('10');
    setWeight('0');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { paddingBottom: 40 }]}>
            <Text style={s.modalTitle}>Add Exercise</Text>
            <Text style={s.modalSub}>{selected ? `Selected: ${selected}` : 'Search and select an exercise'}</Text>
            <TouchableOpacity style={s.modalClose} onPress={onClose}>
              <XIcon size={20} color={t.textSec} />
            </TouchableOpacity>

            {!selected ? (
              <>
                <TextInput
                  style={s.searchInput}
                  placeholder="Search exercises..."
                  placeholderTextColor={t.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
                <FlatList
                  data={filtered.slice(0, 40)}
                  keyExtractor={item => item}
                  style={{ maxHeight: 340 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={s.exListItem} onPress={() => setSelected(item)}>
                      <Text style={s.exListItemTxt}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : (
              <View style={s.addExConfigCard}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: t.text, marginBottom: 8 }}>{selected}</Text>
                <View style={s.configRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.configLabel}>SETS</Text>
                    <TextInput style={s.configInput} keyboardType="number-pad" value={numSets} onChangeText={setNumSets} placeholder="3" placeholderTextColor={t.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.configLabel}>REPS</Text>
                    <TextInput style={s.configInput} keyboardType="number-pad" value={reps} onChangeText={setReps} placeholder="10" placeholderTextColor={t.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.configLabel}>WEIGHT (kg)</Text>
                    <TextInput style={s.configInput} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="0" placeholderTextColor={t.textMuted} />
                  </View>
                </View>
                <TouchableOpacity onPress={handleAdd}>
                  <LinearGradient colors={['#E8432D', '#c73520']} style={s.logBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={s.logBtnTxt}>ADD TO WORKOUT</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelected(null)} style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ color: t.textSec, fontSize: 13 }}>← Back to search</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Active Workout ────────────────────────────────────────────────────────────

function ActiveWorkout({ workout, onComplete, onExit }: {
  workout: Workout;
  onComplete: (durationSecs: number, exercises: WorkoutExercise[], notes: string, rpe: number | undefined) => void;
  onExit: () => void;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const [exercises, setExercises] = useState<LiveExercise[]>(() => buildLiveExercises(workout));
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [restCount, setRestCount] = useState<number | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [showAddEx, setShowAddEx] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [rpe, setRpe] = useState<number | undefined>(undefined);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const ex = exercises[exerciseIdx];
  const allSetsThisExDone = ex?.sets.every(s => s.completed) ?? false;
  const isLastExercise = exerciseIdx === exercises.length - 1;

  const updateSet = useCallback((exIdx: number, setIdx: number, field: keyof LiveSet, value: any) => {
    setExercises(prev => {
      const next = [...prev];
      const ex = { ...next[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      ex.sets = sets;
      next[exIdx] = ex;
      return next;
    });
  }, []);

  const logSet = useCallback((setIdx: number) => {
    const set = exercises[exerciseIdx]?.sets[setIdx];
    if (!set || set.completed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateSet(exerciseIdx, setIdx, 'completed', true);

    setRestCount(ex.rest);
    if (restRef.current) clearInterval(restRef.current);
    const ri = setInterval(() => {
      setRestCount(c => {
        if (c === null || c <= 1) { clearInterval(ri); return null; }
        return c - 1;
      });
    }, 1000);
    restRef.current = ri;
  }, [exercises, exerciseIdx, ex, updateSet]);

  const nextExercise = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLastExercise) { setShowComplete(true); }
    else { setExerciseIdx(i => i + 1); scrollRef.current?.scrollTo({ y: 0, animated: true }); }
  }, [isLastExercise]);

  // Non-linear navigation: jump straight to any exercise in any order.
  const jumpToExercise = useCallback((i: number) => {
    Haptics.selectionAsync();
    setExerciseIdx(i);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const buildPayload = useCallback((): WorkoutExercise[] => (
    exercises.map(ex => ({
      name: ex.name,
      addedByClient: ex.addedByClient,
      planned: ex.planned,
      sets: ex.sets.map((s, i) => ({ setNumber: i + 1, reps: s.reps, weight: s.weight, completed: s.completed, notes: s.notes })),
      notes: ex.notes,
    }))
  ), [exercises]);

  const handleFinish = useCallback(() => {
    const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const exercisePayload: WorkoutExercise[] = exercises.map(ex => ({
      name: ex.name,
      addedByClient: ex.addedByClient,
      planned: ex.planned,
      sets: ex.sets.map((s, i) => ({
        setNumber: i + 1,
        reps: s.reps,
        weight: s.weight,
        completed: s.completed,
        notes: s.notes,
      })),
      notes: ex.notes,
    }));

    onComplete(elapsed, exercisePayload, workoutNotes, rpe);
  }, [exercises, elapsed, workoutNotes, rpe, onComplete]);

  const handleAddExercise = useCallback((newEx: LiveExercise) => {
    setExercises(prev => [...prev, newEx]);
  }, []);

  const completedSets = exercises.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0);

  // Open a real in-app modal — Alert.alert buttons are a no-op on web, which is
  // why the client previously could not exit a started workout at all.
  const handleExit = useCallback(() => {
    Haptics.selectionAsync();
    setShowExit(true);
  }, []);

  const saveAndExit = useCallback(() => {
    setShowExit(false);
    onComplete(elapsed, buildPayload(), 'Exited early', undefined);
  }, [elapsed, buildPayload, onComplete]);

  const discardAndExit = useCallback(() => {
    setShowExit(false);
    onExit();
  }, [onExit]);

  const activeSetIdx = ex?.sets.findIndex(s => !s.completed) ?? -1;

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']}>
        <View style={s.trainHeader}>
          <TouchableOpacity onPress={handleExit} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Exit workout">
            <XIcon size={22} color={t.textSec} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.trainTitle}>{workout.name.toUpperCase()}</Text>
            <Text style={s.timerTxt}>{formatTime(elapsed)}</Text>
          </View>
          <View style={{ width: 22 }} />
        </View>

        <View style={s.liveBar}>
          <View style={s.lmItem}>
            <Text style={s.lmVal}>{exerciseIdx + 1}/{exercises.length}</Text>
            <Text style={s.lmLabel}>EXERCISE</Text>
          </View>
          <View style={s.lmDiv} />
          <View style={s.lmItem}>
            <Text style={s.lmVal}>{exercises.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0)}</Text>
            <Text style={s.lmLabel}>SETS DONE</Text>
          </View>
          <View style={s.lmDiv} />
          <View style={s.lmItem}>
            <Text style={[s.lmVal, { color: t.red }]}>{formatTime(elapsed)}</Text>
            <Text style={s.lmLabel}>ELAPSED</Text>
          </View>
        </View>

        {/* Exercise selector — tap any exercise, in any order */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipBar}>
          {exercises.map((e, i) => {
            const done = e.sets.length > 0 && e.sets.every(st => st.completed);
            const active = i === exerciseIdx;
            return (
              <TouchableOpacity
                key={e.id}
                onPress={() => jumpToExercise(i)}
                style={[s.chip, done && s.chipDone, active && s.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[s.chipTxt, done && s.chipTxtDone, active && s.chipTxtActive]}>
                  {done ? '✓' : i + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {restCount !== null && (
        <View style={s.restOverlay}>
          <Text style={s.restLabel}>REST</Text>
          <Text style={s.restCount}>{formatTime(restCount)}</Text>
          <TouchableOpacity onPress={() => setRestCount(null)} style={s.restSkip}>
            <Text style={s.restSkipTxt}>SKIP →</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Current exercise */}
        {ex && (
          <View style={s.exCard}>
            <Text style={s.exLabel}>{ex.addedByClient ? 'ADDED BY YOU · ' : ''}{ex.category.toUpperCase()} · EXERCISE {exerciseIdx + 1}/{exercises.length}</Text>
            <Text style={s.exName}>{ex.name}</Text>
            <Text style={s.exPlanned}>
              Planned: {ex.planned.sets} sets × {ex.planned.reps} reps @ {ex.planned.weight}
            </Text>

            {/* Per-set rows */}
            {ex.sets.map((set, setIdx) => {
              const isActive = setIdx === activeSetIdx;
              const isDone   = set.completed;
              return (
                <View key={setIdx} style={s.setRow}>
                  <Text style={[s.setNum, isDone && s.setNumDone, isActive && s.setNumActive]}>
                    {isDone ? '✓' : isActive ? '▶' : String(setIdx + 1)}
                  </Text>

                  {/* Weight input */}
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[s.setInput, { opacity: isDone ? 0.5 : 1 }]}
                      keyboardType="decimal-pad"
                      value={set.weight === 0 ? '' : String(set.weight)}
                      onChangeText={v => {
                        const n = parseFloat(v);
                        updateSet(exerciseIdx, setIdx, 'weight', isNaN(n) ? 0 : n);
                      }}
                      placeholder="BW"
                      placeholderTextColor={t.textMuted}
                      editable={!isDone}
                    />
                    <Text style={s.setInputLabel}>kg</Text>
                  </View>

                  {/* Reps input */}
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[s.setInput, { opacity: isDone ? 0.5 : 1 }]}
                      keyboardType="number-pad"
                      value={String(set.reps)}
                      onChangeText={v => {
                        const n = parseInt(v);
                        updateSet(exerciseIdx, setIdx, 'reps', isNaN(n) ? 0 : n);
                      }}
                      editable={!isDone}
                    />
                    <Text style={s.setInputLabel}>reps</Text>
                  </View>

                  {/* Log set button */}
                  <TouchableOpacity
                    onPress={() => logSet(setIdx)}
                    style={[s.logSetBtn, isDone && s.logSetBtnDone]}
                    disabled={isDone}
                  >
                    {isDone
                      ? <CheckIcon size={16} color={t.green} strokeWidth={2.5} />
                      : <Text style={{ fontSize: 16, color: isActive ? t.red : t.textMuted }}>✓</Text>
                    }
                  </TouchableOpacity>
                </View>
              );
            })}

            {allSetsThisExDone && (
              <TouchableOpacity onPress={nextExercise} style={s.nextExBtn} activeOpacity={0.85}>
                <View style={s.nextExBtnInner}>
                  <Text style={s.nextExBtnTxt}>
                    {isLastExercise ? 'FINISH WORKOUT →' : 'NEXT EXERCISE →'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* All exercises — tap to jump to any, in any order */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[s.exLabel, { marginBottom: 8 }]}>ALL EXERCISES</Text>
          {exercises.map((qEx, i) => {
            if (i === exerciseIdx) return null;
            const qDone = qEx.sets.length > 0 && qEx.sets.every(st => st.completed);
            const setsDone = qEx.sets.filter(st => st.completed).length;
            return (
              <TouchableOpacity key={qEx.id} style={s.queueItem} onPress={() => jumpToExercise(i)} activeOpacity={0.8}>
                <Text style={[s.queueNum, qDone && { color: t.green }]}>{qDone ? '✓' : i + 1}</Text>
                <Text style={s.queueName}>{qEx.name}{qEx.addedByClient ? ' ✦' : ''}</Text>
                <Text style={s.queueMeta}>{setsDone}/{qEx.sets.length} · {qEx.planned.weight}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Add exercise */}
        <TouchableOpacity style={s.addExBtn} onPress={() => setShowAddEx(true)}>
          <PlusIcon size={16} color={t.textSec} />
          <Text style={s.addExTxt}>Add Exercise</Text>
        </TouchableOpacity>

        {/* Finish anytime — not gated on linear completion */}
        <TouchableOpacity style={s.finishBtn} onPress={() => { Haptics.selectionAsync(); setShowComplete(true); }} activeOpacity={0.85}>
          <View style={s.finishBtnInner}>
            <Text style={s.finishBtnTxt}>FINISH WORKOUT{completedSets > 0 ? ` · ${completedSets} SETS` : ''}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <AddExerciseModal
        visible={showAddEx}
        onClose={() => setShowAddEx(false)}
        onAdd={handleAddExercise}
      />

      {/* Exit confirmation — real modal (Alert.alert buttons don't work on web) */}
      <Modal visible={showExit} transparent animationType="slide" onRequestClose={() => setShowExit(false)}>
        <View style={s.modalOverlay}>
          <View style={s.exitCard}>
            <Text style={s.modalTitle}>Exit Workout?</Text>
            <Text style={s.modalSub}>
              {completedSets > 0
                ? `You have ${completedSets} set${completedSets !== 1 ? 's' : ''} logged. Save your progress or discard this session.`
                : 'No sets logged yet. You can exit without saving.'}
            </Text>

            {completedSets > 0 && (
              <TouchableOpacity onPress={saveAndExit} style={[s.exitBtn, { backgroundColor: t.red }]} activeOpacity={0.85}>
                <Text style={[s.exitBtnTxt, { color: '#fff' }]}>Save progress & exit</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={discardAndExit} style={[s.exitBtn, { backgroundColor: t.glass, borderWidth: 1, borderColor: t.redBorder }]} activeOpacity={0.85}>
              <Text style={[s.exitBtnTxt, { color: t.red }]}>{completedSets > 0 ? 'Discard workout' : 'Exit without saving'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowExit(false)} style={[s.exitBtn, { backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder }]} activeOpacity={0.85}>
              <Text style={[s.exitBtnTxt, { color: t.textSec }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Completion modal */}
      <Modal visible={showComplete} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
              <View style={s.completionCard}>
                <Text style={{ fontSize: 48, marginBottom: 8 }}>🏆</Text>
                <Text style={s.completionTitle}>Workout{'\n'}Complete!</Text>
                <Text style={s.completionSub}>
                  {formatTime(elapsed)} · {exercises.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0)} sets · {exercises.length} exercises
                </Text>

                <Text style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1.5, marginTop: 16, marginBottom: 8 }}>HOW HARD WAS IT?</Text>
                <View style={s.rpeRow}>
                  {[6, 7, 8, 9, 10].map(r => (
                    <TouchableOpacity key={r} style={[s.rpeChip, rpe === r && s.rpeChipActive]} onPress={() => setRpe(r)}>
                      <Text style={[s.rpeChipTxt, rpe === r && s.rpeChipTxtActive]}>{r}/10</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1.5, marginBottom: 8 }}>NOTES (OPTIONAL)</Text>
                <TextInput
                  style={s.notesInput}
                  multiline
                  placeholder="How did it feel? Any adjustments needed?"
                  placeholderTextColor={t.textMuted}
                  value={workoutNotes}
                  onChangeText={setWorkoutNotes}
                />

                <TouchableOpacity onPress={handleFinish} style={[s.logBtn, { width: '100%' }]}>
                  <LinearGradient colors={['#E8432D', '#c73520']} style={s.logBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={s.logBtnTxt}>SAVE & FINISH</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function TrainScreen() {
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const store = useAppStore();

  const workouts = store.programDays.length > 0
    ? programDaysToWorkouts(store.programDays)
    : WORKOUTS;

  const handleComplete = useCallback(async (
    durationSecs: number,
    exercises: WorkoutExercise[],
    notes: string,
    rpe: number | undefined,
  ) => {
    const totalSets = exercises.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0);
    await store.completeSession(
      activeWorkout!.id,
      activeWorkout!.name,
      durationSecs,
      totalSets,
      exercises,
      notes,
      rpe,
    );
    setActiveWorkout(null);
  }, [activeWorkout, store]);

  if (activeWorkout) {
    return (
      <ActiveWorkout
        workout={activeWorkout}
        onComplete={handleComplete}
        onExit={() => setActiveWorkout(null)}
      />
    );
  }

  return (
    <WorkoutSelector
      workouts={workouts}
      programName={store.assignedProgram}
      onSelect={setActiveWorkout}
    />
  );
}
