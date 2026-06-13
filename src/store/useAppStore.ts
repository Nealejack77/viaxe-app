import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WeightEntry {
  id?: string;
  date: string;
  weight: number;
  notes?: string;
}

export interface CompletedSet {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
  notes?: string;
}

export interface WorkoutExercise {
  name: string;
  addedByClient: boolean;
  planned: { sets?: number; reps?: string; weight?: string };
  sets: CompletedSet[];
  notes: string;
}

export interface TrainingSession {
  id: string;
  date: string;
  workoutId: string;
  workoutName: string;
  duration: number;
  setsCompleted: number;
  exercises?: WorkoutExercise[];
  notes?: string;
  rpe?: number | null;
  coachFeedback?: {
    text: string;
    status: string;
    createdAt: string;
  } | null;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ProgramExercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

export interface ProgramDay {
  label: string;
  name: string;
  type: string;
  exercises: ProgramExercise[];
}

export interface UserProfile {
  email: string;
  phone: string;
  dob: string;
  gender: string;
  heightCm: number | null;
  goalWeight: number | null;
  mainGoal: string;
  injuryNotes: string;
  nutritionNotes: string;
  trainingAvailability: string;
  onboarded?: boolean;
  whyGoal?: string;
  startWeight?: number | null;
  notificationPrefs?: Record<string, boolean>;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  readAt: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;       // deep-link key: coach | train | checkin | progress | home
  readAt: string | null;
  createdAt: string;
}

export interface CheckIn {
  id: string;
  week: number | null;
  weight: number | null;
  energy: number | null;
  sleep: number | null;
  hunger: number | null;
  stress: number | null;
  adherence: number | null;
  notes: string;
  photos?: string[];
  photoCount: number;
  coachReply: { text: string; createdAt: string } | null;
  createdAt: string;
}

export interface CheckInDraft {
  weight: number | null;
  energy: number;
  sleep: number;
  hunger: number;
  stress: number;
  adherence: number;
  notes: string;
  photos: string[];
}

const EMPTY_PROFILE: UserProfile = {
  email: '',
  phone: '',
  dob: '',
  gender: '',
  heightCm: null,
  goalWeight: null,
  mainGoal: '',
  injuryNotes: '',
  nutritionNotes: '',
  trainingAvailability: '',
};

interface AppState {
  userName: string;
  streak: number;
  lastSessionDate: string | null;
  currentWeight: number;
  weightLog: WeightEntry[];
  sessions: TrainingSession[];
  benchPR: number;
  squatPR: number;
  assignedProgram: string;
  coachName: string;
  macroTargets: MacroTargets;
  programDays: ProgramDay[];
  clientId: string | null;
  ptId: string | null;
  profile: UserProfile;
  messages: Message[];
  messagesLoaded: boolean;
  notifications: AppNotification[];
  unreadNotifications: number;
  checkIns: CheckIn[];
  checkInsLoaded: boolean;
  // loading states
  workoutsLoaded: boolean;
  bodyweightLoaded: boolean;
}

const SEED: AppState = {
  userName: 'Athlete',
  streak: 0,
  lastSessionDate: null,
  currentWeight: 0,
  weightLog: [],
  sessions: [],
  benchPR: 0,
  squatPR: 0,
  assignedProgram: '',
  coachName: 'Your Coach',
  macroTargets: { calories: 2200, protein: 175, carbs: 220, fat: 70 },
  programDays: [],
  clientId: null,
  ptId: null,
  profile: EMPTY_PROFILE,
  messages: [],
  messagesLoaded: false,
  notifications: [],
  unreadNotifications: 0,
  checkIns: [],
  checkInsLoaded: false,
  workoutsLoaded: false,
  bodyweightLoaded: false,
};

// Demo seed — used only in demo mode, no real auth
const DEMO_SEED: AppState = {
  userName: 'Jack',
  streak: 23,
  lastSessionDate: '2026-05-30',
  currentWeight: 82.4,
  weightLog: [
    { date: '2026-03-30', weight: 86.6 },
    { date: '2026-04-06', weight: 85.9 },
    { date: '2026-04-13', weight: 85.2 },
    { date: '2026-04-20', weight: 84.6 },
    { date: '2026-04-27', weight: 84.1 },
    { date: '2026-05-04', weight: 83.6 },
    { date: '2026-05-11', weight: 83.2 },
    { date: '2026-05-18', weight: 82.8 },
    { date: '2026-05-31', weight: 82.4 },
  ],
  sessions: [
    { id: 'd1', date: '2026-05-28', workoutId: 'upper-push', workoutName: 'Upper Push', duration: 48, setsCompleted: 13 },
    { id: 'd2', date: '2026-05-29', workoutId: 'upper-pull', workoutName: 'Upper Pull', duration: 44, setsCompleted: 13 },
    { id: 'd3', date: '2026-05-30', workoutId: 'lower-b', workoutName: 'Lower Body B', duration: 52, setsCompleted: 13 },
  ],
  benchPR: 102.5,
  squatPR: 140,
  assignedProgram: 'Strength Phase III',
  coachName: 'James Miller',
  macroTargets: { calories: 2600, protein: 195, carbs: 280, fat: 75 },
  clientId: null,
  ptId: null,
  profile: { ...EMPTY_PROFILE, email: 'jack@demo.com', heightCm: 180, goalWeight: 80, mainGoal: 'Muscle gain', onboarded: true },
  messages: [],
  messagesLoaded: false,
  notifications: [],
  unreadNotifications: 0,
  checkIns: [],
  checkInsLoaded: true,
  workoutsLoaded: true,
  bodyweightLoaded: true,
  programDays: [
    { label: 'Monday', name: 'Lower Body A', type: 'Strength', exercises: [
      { name: 'Back Squat', sets: '4', reps: '6–8', weight: '100kg' },
      { name: 'Romanian Deadlift', sets: '3', reps: '8–10', weight: '80kg' },
      { name: 'Leg Press', sets: '3', reps: '10–12', weight: '160kg' },
      { name: 'Walking Lunge', sets: '3', reps: '12e', weight: '20kg' },
    ]},
    { label: 'Tuesday', name: 'Upper Push', type: 'Strength', exercises: [
      { name: 'Dumbbell Bench Press', sets: '4', reps: '8–10', weight: '30kg' },
      { name: 'Dumbbell Shoulder Press', sets: '3', reps: '10–12', weight: '20kg' },
      { name: 'Incline Dumbbell Fly', sets: '3', reps: '12–15', weight: '16kg' },
      { name: 'Cable Rope Pushdown', sets: '3', reps: '15', weight: '25kg' },
    ]},
    { label: 'Wednesday', name: 'Cardio + Core', type: 'Cardio', exercises: [
      { name: 'Incline Treadmill Walk', sets: '1', reps: '40 min', weight: '—' },
      { name: 'Plank', sets: '3', reps: '45s', weight: 'BW' },
      { name: 'Cable Crunch', sets: '3', reps: '20', weight: '30kg' },
      { name: 'Dead Bug', sets: '3', reps: '10e', weight: 'BW' },
    ]},
    { label: 'Thursday', name: 'Upper Pull', type: 'Strength', exercises: [
      { name: 'Lat Pulldown', sets: '4', reps: '8–10', weight: '55kg' },
      { name: 'Seated Cable Row', sets: '3', reps: '10–12', weight: '60kg' },
      { name: 'Face Pull', sets: '3', reps: '15', weight: '20kg' },
      { name: 'Rope Hammer Curl', sets: '3', reps: '12', weight: '20kg' },
    ]},
    { label: 'Friday', name: 'Lower Body B', type: 'Strength', exercises: [
      { name: 'Hack Squat', sets: '4', reps: '8–10', weight: '80kg' },
      { name: 'Barbell Hip Thrust', sets: '3', reps: '10–12', weight: '100kg' },
      { name: 'Seated Leg Curl', sets: '3', reps: '12–15', weight: '40kg' },
      { name: 'Standing Calf Raise', sets: '4', reps: '15', weight: 'BW' },
    ]},
  ],
};

const KEY  = '@viaxe_v2';
const BASE = 'https://www.viaxe.co.uk/api';

export function useAppStore() {
  const [state, setState] = useState<AppState>(SEED);

  useEffect(() => {
    const load = async () => {
      const token = await AsyncStorage.getItem('@viaxe_token');
      const raw   = await AsyncStorage.getItem(KEY);

      // Demo mode — show rich demo data, no API calls
      if ((!token || token === 'demo') && !raw) {
        setState(DEMO_SEED);
        return;
      }

      let base: AppState = SEED;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          base = {
            ...SEED,
            ...parsed,
            profile: { ...EMPTY_PROFILE, ...(parsed.profile || {}) },
            workoutsLoaded:  false,
            bodyweightLoaded: false,
          };
        } catch {}
      }
      setState(base);

      if (!token || token === 'demo') return;

      const headers = { Authorization: `Bearer ${token}` };

      // ── Load auth profile ───────────────────────────────────────────────
      try {
        const meRes = await fetch(`${BASE}/auth?action=me`, { headers });
        if (meRes.ok) {
          const { profile } = await meRes.json();
          const updates: Partial<AppState> = {};

          if (profile?.name) updates.userName = profile.name.split(' ')[0] || profile.name;
          if (profile?.coachName) updates.coachName = profile.coachName;
          if (profile?._id) updates.clientId = String(profile._id);
          if (profile?.ptId) updates.ptId = String(profile.ptId);

          // Extended profile fields from /api/auth?action=me
          const profileUpdates: Partial<UserProfile> = {};
          if (profile?.email) profileUpdates.email = profile.email;
          if (Object.keys(profileUpdates).length) {
            updates.profile = { ...base.profile, ...profileUpdates };
          }

          setState(prev => ({ ...prev, ...updates }));
          base = { ...base, ...updates };
        }
      } catch (e) { console.warn('Auth profile load failed:', e); }

      // ── Load extended profile ───────────────────────────────────────────
      try {
        const profRes = await fetch(`${BASE}/profile`, { headers });
        if (profRes.ok) {
          const { profile: extProfile } = await profRes.json();
          if (extProfile) {
            const profileUpdates: Partial<UserProfile> = {};
            const keys: (keyof UserProfile)[] = ['phone', 'dob', 'gender', 'heightCm', 'goalWeight', 'mainGoal', 'injuryNotes', 'nutritionNotes', 'trainingAvailability', 'onboarded', 'whyGoal', 'startWeight', 'notificationPrefs'];
            for (const k of keys) {
              if (extProfile[k] != null) (profileUpdates as any)[k] = extProfile[k];
            }
            if (Object.keys(profileUpdates).length) {
              setState(prev => ({ ...prev, profile: { ...prev.profile, ...profileUpdates } }));
              base = { ...base, profile: { ...base.profile, ...profileUpdates } };
            }
          }
        }
      } catch {}

      // ── Load PT data (programs, macros) ────────────────────────────────
      const currentState = base;
      if (currentState.ptId) {
        try {
          const dataRes = await fetch(`${BASE}/data?ptId=${currentState.ptId}`, { headers });
          if (dataRes.ok) {
            const ptData = await dataRes.json();
            const clientRecord = ptData?.clients?.find(
              (c: any) =>
                c.email?.toLowerCase() === currentState.profile.email?.toLowerCase() ||
                c.clientId === currentState.clientId
            );
            const progUpdates: Partial<AppState> = {};
            const mapDays = (days: any[]) =>
              days
                .filter((d: any) => Array.isArray(d.exercises) && d.exercises.length > 0)
                .map((d: any) => ({
                  label: d.label || '',
                  name: d.name || d.label || '',
                  type: d.type || 'Strength',
                  exercises: (d.exercises as any[]).map((ex: any) => ({
                    name: ex.name || '',
                    sets: String(ex.sets || '3'),
                    reps: String(ex.reps || '10'),
                    weight: String(ex.weight || 'BW'),
                  })),
                }));
            if (clientRecord) {
              if (clientRecord.program && clientRecord.program !== 'No program assigned') {
                progUpdates.assignedProgram = clientRecord.program;
                const days = ptData?.program_days?.[clientRecord.program] ??
                  ptData?.programs?.find((p: any) => p.name === clientRecord.program)?.days;
                if (Array.isArray(days)) {
                  progUpdates.programDays = mapDays(days);
                }
              }
              const m = clientRecord.macros;
              if (m) {
                progUpdates.macroTargets = {
                  calories: m.calories?.tgt || SEED.macroTargets.calories,
                  protein:  m.protein?.tgt  || SEED.macroTargets.protein,
                  carbs:    m.carbs?.tgt    || SEED.macroTargets.carbs,
                  fat:      m.fat?.tgt      || SEED.macroTargets.fat,
                };
              }
            }
            // Fallback: search programs.assignedClients directly using the client's
            // Mongo auth ID. Handles divergence between coach_clients.program and
            // programs.assignedClients (e.g. atomic PATCH assignment without coach
            // portal sync, or clientRecord not found via email/clientId).
            if (!progUpdates.programDays?.length && currentState.clientId) {
              const fallbackProg = (ptData?.programs as any[] | undefined)?.find((p: any) =>
                Array.isArray(p.assignedClients) &&
                p.assignedClients.some((id: any) => String(id) === String(currentState.clientId))
              );
              if (fallbackProg) {
                const fallbackDays = ptData?.program_days?.[fallbackProg.name] ?? fallbackProg.days;
                if (Array.isArray(fallbackDays) && fallbackDays.length > 0) {
                  progUpdates.assignedProgram = fallbackProg.name;
                  progUpdates.programDays = mapDays(fallbackDays);
                }
              }
            }
            if (Object.keys(progUpdates).length) {
              setState(prev => ({ ...prev, ...progUpdates }));
              base = { ...base, ...progUpdates };
            }
          }
        } catch {}
      }

      // ── Load bodyweight from DB ─────────────────────────────────────────
      if (currentState.clientId || base.clientId) {
        const cid = base.clientId || currentState.clientId;
        try {
          const bwRes = await fetch(`${BASE}/bodyweight?clientId=${cid}&limit=100`, { headers });
          if (bwRes.ok) {
            const { entries } = await bwRes.json();
            const weightLog: WeightEntry[] = (entries || []).map((e: any) => ({
              id: e.id,
              date: e.date,
              weight: e.weight,
              notes: e.notes || '',
            })).reverse(); // reverse to get chronological order
            const latest = weightLog[weightLog.length - 1];
            setState(prev => ({
              ...prev,
              weightLog,
              currentWeight: latest?.weight ?? prev.currentWeight,
              bodyweightLoaded: true,
            }));
            base = { ...base, weightLog, currentWeight: latest?.weight ?? base.currentWeight, bodyweightLoaded: true };
          }
        } catch {}
        setState(prev => ({ ...prev, bodyweightLoaded: true }));
      }

      // ── Load workouts from DB ───────────────────────────────────────────
      const finalClientId = base.clientId;
      if (finalClientId) {
        try {
          const wRes = await fetch(`${BASE}/workouts?clientId=${finalClientId}&limit=50`, { headers });
          if (wRes.ok) {
            const { workouts } = await wRes.json();
            const sessions: TrainingSession[] = (workouts || []).map((w: any) => ({
              id: w.id,
              date: w.date,
              workoutId: w.planId || w.workoutName,
              workoutName: w.workoutName,
              duration: Math.floor((w.durationSecs || 0) / 60),
              setsCompleted: w.totalSets || 0,
              exercises: w.exercises || [],
              notes: w.notes || '',
              rpe: w.rpe || null,
              coachFeedback: w.coachFeedback || null,
            }));
            // Compute streak from real sessions
            const newStreak = computeStreak(sessions);
            setState(prev => ({
              ...prev,
              sessions,
              streak: newStreak,
              workoutsLoaded: true,
            }));
            base = { ...base, sessions, streak: newStreak, workoutsLoaded: true };
          }
        } catch {}
        setState(prev => ({ ...prev, workoutsLoaded: true }));
      }

      // ── Load notifications + check-ins (fire-and-forget) ────────────────
      try {
        const [nRes, cRes] = await Promise.all([
          fetch(`${BASE}/notifications?limit=50`, { headers }),
          fetch(`${BASE}/coach?entity=checkins&limit=50`, { headers }),
        ]);
        if (nRes.ok) {
          const nData = await nRes.json();
          setState(prev => ({ ...prev, notifications: nData.notifications || [], unreadNotifications: nData.unread || 0 }));
        }
        if (cRes.ok) {
          const cData = await cRes.json();
          setState(prev => ({ ...prev, checkIns: cData.checkins || [], checkInsLoaded: true }));
        } else {
          setState(prev => ({ ...prev, checkInsLoaded: true }));
        }
      } catch {
        setState(prev => ({ ...prev, checkInsLoaded: true }));
      }

      // Persist updated state
      await AsyncStorage.setItem(KEY, JSON.stringify(base));
    };

    load();
  }, []);

  const persist = useCallback(async (next: AppState) => {
    setState(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const today = () => new Date().toISOString().split('T')[0];
  const yesterday = () => new Date(Date.now() - 864e5).toISOString().split('T')[0];

  const logWeight = useCallback(async (weight: number, notes?: string) => {
    const d = today();
    const newEntry: WeightEntry = { date: d, weight, notes: notes || '' };
    const newLog = [...state.weightLog.filter(e => e.date !== d), newEntry]
      .sort((a, b) => a.date.localeCompare(b.date));

    const next = { ...state, currentWeight: weight, weightLog: newLog };
    setState(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));

    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') return;

    try {
      const res = await fetch(`${BASE}/bodyweight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight, date: d, notes: notes || '', ptId: state.ptId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          newEntry.id = data.id;
          const updatedLog = [...state.weightLog.filter(e => e.date !== d), newEntry]
            .sort((a, b) => a.date.localeCompare(b.date));
          setState(prev => ({ ...prev, weightLog: updatedLog }));
        }
      }
    } catch {}
  }, [state]);

  const saveWorkoutToDB = useCallback(async (
    workoutId: string,
    workoutName: string,
    durationSecs: number,
    exercises: WorkoutExercise[],
    notes?: string,
    rpe?: number,
  ): Promise<string | null> => {
    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') return null;

    try {
      const res = await fetch(`${BASE}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workoutName,
          planId: workoutId,
          durationSecs,
          exercises,
          notes: notes || '',
          rpe: rpe || null,
          ptId: state.ptId,
          date: today(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id || null;
      }
    } catch {}
    return null;
  }, [state.ptId]);

  const completeSession = useCallback(async (
    workoutId: string,
    workoutName: string,
    durationSecs: number,
    setsCompleted: number,
    exercises?: WorkoutExercise[],
    notes?: string,
    rpe?: number,
  ) => {
    const d = today();
    const wasYesterday = state.lastSessionDate === yesterday();
    const wasToday     = state.lastSessionDate === d;
    const newStreak    = wasToday ? state.streak : wasYesterday ? state.streak + 1 : 1;

    let dbId: string | null = null;
    if (exercises) {
      dbId = await saveWorkoutToDB(workoutId, workoutName, durationSecs, exercises, notes, rpe);
    }

    const session: TrainingSession = {
      id: dbId || Date.now().toString(),
      date: d,
      workoutId,
      workoutName,
      duration: Math.floor(durationSecs / 60),
      setsCompleted,
      exercises: exercises || [],
      notes: notes || '',
      rpe: rpe ?? null,
      coachFeedback: null,
    };

    persist({
      ...state,
      streak: newStreak,
      lastSessionDate: d,
      sessions: [session, ...state.sessions],
      workoutsLoaded: true,
    });
  }, [state, persist, saveWorkoutToDB]);

  const updateName = useCallback((name: string) => {
    persist({ ...state, userName: name });
  }, [state, persist]);

  const updateProfile = useCallback(async (profileUpdates: Partial<UserProfile>) => {
    const next: AppState = {
      ...state,
      profile: { ...state.profile, ...profileUpdates },
    };
    persist(next);

    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') return;

    try {
      await fetch(`${BASE}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileUpdates),
      });
    } catch {}
  }, [state, persist]);

  const readiness: number | null = null;

  // ── Notifications ───────────────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') return;
    try {
      const res = await fetch(`${BASE}/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({
          ...prev,
          notifications: data.notifications || [],
          unreadNotifications: data.unread || 0,
        }));
      }
    } catch {}
  }, []);

  const markNotificationsRead = useCallback(async (ids?: string[]) => {
    setState(prev => ({
      ...prev,
      unreadNotifications: ids ? Math.max(0, prev.unreadNotifications - ids.length) : 0,
      notifications: prev.notifications.map(n =>
        (!ids || ids.includes(n.id)) && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n
      ),
    }));
    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') return;
    try {
      await fetch(`${BASE}/notifications?action=read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(ids ? { ids } : {}),
      });
    } catch {}
  }, []);

  // ── Check-ins ───────────────────────────────────────────────────────────────
  const loadCheckIns = useCallback(async (withPhotos = false) => {
    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') {
      setState(prev => ({ ...prev, checkInsLoaded: true }));
      return;
    }
    try {
      const res = await fetch(`${BASE}/coach?entity=checkins&limit=50${withPhotos ? '&full=1' : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({ ...prev, checkIns: data.checkins || [], checkInsLoaded: true }));
        return;
      }
    } catch {}
    setState(prev => ({ ...prev, checkInsLoaded: true }));
  }, []);

  const submitCheckIn = useCallback(async (draft: CheckInDraft): Promise<boolean> => {
    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') return false;
    try {
      const res = await fetch(`${BASE}/coach?entity=checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        // Check-in weight doubles as a bodyweight log entry
        if (draft.weight) logWeight(draft.weight, 'Weekly check-in');
        return true;
      }
    } catch {}
    return false;
  }, [logWeight]);

  const loadMessages = useCallback(async () => {
    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo' || !state.ptId) return;
    try {
      const res = await fetch(`${BASE}/messages?withUser=${state.ptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({ ...prev, messages: data.messages || [], messagesLoaded: true }));
      }
    } catch {}
    setState(prev => ({ ...prev, messagesLoaded: true }));
  }, [state.ptId]);

  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo' || !state.ptId) return false;
    try {
      const res = await fetch(`${BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toUserId: state.ptId, text }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setState(prev => ({ ...prev, messages: [...prev.messages, data.message] }));
        }
        return true;
      }
    } catch {}
    return false;
  }, [state.ptId]);

  const todaySession = state.sessions.find(s => s.date === today());
  const caloriesBurned = todaySession ? (todaySession.duration * 8) : 0;

  // A weekly check-in is due when the latest one is 7+ days old (or none exists)
  const lastCheckIn = state.checkIns[0];
  const checkInDue = state.checkInsLoaded && (
    !lastCheckIn || (Date.now() - new Date(lastCheckIn.createdAt).getTime()) >= 7 * 864e5
  );

  return {
    ...state,
    readiness,
    caloriesBurned,
    todayDone: !!todaySession,
    checkInDue,
    logWeight,
    completeSession,
    saveWorkoutToDB,
    updateName,
    updateProfile,
    loadMessages,
    sendMessage,
    loadNotifications,
    markNotificationsRead,
    loadCheckIns,
    submitCheckIn,
    totalSessions: state.sessions.length,
  };
}

function computeStreak(sessions: TrainingSession[]): number {
  if (!sessions.length) return 0;
  const today = new Date().toISOString().split('T')[0];
  const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
  let streak = 0;
  let expected = today;
  for (const date of dates) {
    if (date === expected) {
      streak++;
      const d = new Date(expected);
      d.setDate(d.getDate() - 1);
      expected = d.toISOString().split('T')[0];
    } else if (date < expected) {
      break;
    }
  }
  return streak;
}
