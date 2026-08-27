import {
  createContext,
  createElement,
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../lib/api';

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
  localClientId: string | null;
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
  // Water tracker (local-first: date 'YYYY-MM-DD' -> ml)
  waterLog: Record<string, number>;
  waterGoalMl: number;
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
  localClientId: null,
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
  waterLog: {},
  waterGoalMl: 2500,
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
  localClientId: null,
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
  waterLog: { [new Date().toISOString().split('T')[0]]: 1500 },
  waterGoalMl: 2500,
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
function useCreateAppStore() {
  const [state, setState] = useState<AppState>(SEED);
  const stateRef = useRef<AppState>(SEED);
  const persistenceQueue = useRef<Promise<void>>(Promise.resolve());

  const replaceState = useCallback((next: AppState | ((prev: AppState) => AppState)) => {
    const resolved = typeof next === 'function' ? next(stateRef.current) : next;
    stateRef.current = resolved;
    setState(resolved);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const load = async () => {
      const token = await AsyncStorage.getItem('@viaxe_token');
      const raw   = await AsyncStorage.getItem(KEY);

      // Demo mode — show rich demo data, no API calls
      if ((!token || token === 'demo') && !raw) {
        replaceState(DEMO_SEED);
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
      replaceState(base);

      if (!token || token === 'demo') return;

      // ── Load auth profile ───────────────────────────────────────────────
      try {
        const meRes = await apiFetch('/auth?action=me');
        if (meRes.status === 401) {
          // apiFetch clears the expired session and routes back to Login.
          return;
        }
        if (meRes.ok) {
          const { profile } = await meRes.json();
          const updates: Partial<AppState> = {};

          if (profile?.name) updates.userName = profile.name.split(' ')[0] || profile.name;
          if (profile?.coachName) updates.coachName = profile.coachName;
          if (profile?._id) updates.clientId = String(profile._id);
          if (profile?.localId != null) updates.localClientId = String(profile.localId);
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
        const profRes = await apiFetch('/profile');
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
          const dataRes = await apiFetch(`/data?ptId=${encodeURIComponent(currentState.ptId)}`);
          if (dataRes.ok) {
            const ptData = await dataRes.json();
            const roster: any[] = Array.isArray(ptData?.clients) ? ptData.clients : [];
            const clientRecord =
              roster.find(
                (c: any) =>
                  c.email?.toLowerCase() === currentState.profile.email?.toLowerCase() ||
                  (currentState.clientId && c.clientId && String(c.clientId) === String(currentState.clientId)) ||
                  (currentState.localClientId != null && c.id != null && String(c.id) === String(currentState.localClientId))
              ) ||
              // The server already redacts a client's /api/data response down to their
              // OWN record, so if exactly one record comes back it is definitively
              // theirs. This keeps macros/nutrition syncing even when the id-bridge
              // (clientId/localId/email) drifts and the explicit match above misses.
              (roster.length === 1 ? roster[0] : undefined);
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
              // Secondary fallback: clientRecord found but program name lookup missed.
              // Search programs.assignedClients for the client's local numeric id
              // (portal stores numeric local IDs, not Mongo auth _id).
              if (!progUpdates.programDays?.length) {
                const byIdProg = (ptData?.programs as any[] | undefined)?.find((p: any) =>
                  Array.isArray(p.assignedClients) && (
                    (clientRecord.id != null && p.assignedClients.some((id: any) => String(id) === String(clientRecord.id))) ||
                    (clientRecord.clientId && p.assignedClients.some((id: any) => String(id) === String(clientRecord.clientId)))
                  )
                );
                if (byIdProg) {
                  const byIdDays = ptData?.program_days?.[byIdProg.name] ?? byIdProg.days;
                  if (Array.isArray(byIdDays) && byIdDays.length > 0) {
                    progUpdates.assignedProgram = byIdProg.name;
                    progUpdates.programDays = mapDays(byIdDays);
                  }
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
            // Fallback: clientRecord not found — search programs.assignedClients directly.
            // Server enriches assignedClients with both numeric local IDs and Mongo auth _ids,
            // so either currentState.clientId or a numeric match will hit.
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
          const bwRes = await apiFetch(`/bodyweight?clientId=${encodeURIComponent(String(cid))}&limit=100`);
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
          const wRes = await apiFetch(`/workouts?clientId=${encodeURIComponent(finalClientId)}&limit=50`);
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
          apiFetch('/notifications?limit=50'),
          apiFetch('/coach?entity=checkins&limit=50'),
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
  }, [replaceState]);

  const persist = useCallback(async (update: AppState | ((prev: AppState) => AppState)) => {
    const previous = stateRef.current;
    const next = typeof update === 'function' ? update(previous) : update;
    replaceState(next);
    const write = persistenceQueue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)));
    persistenceQueue.current = write;
    await write;
  }, [replaceState]);

  const today = () => new Date().toISOString().split('T')[0];
  const yesterday = () => new Date(Date.now() - 864e5).toISOString().split('T')[0];

  const logWeight = useCallback(async (weight: number, notes?: string) => {
    const d = today();
    const newEntry: WeightEntry = { date: d, weight, notes: notes || '' };
    const current = stateRef.current;
    const newLog = [...current.weightLog.filter(e => e.date !== d), newEntry]
      .sort((a, b) => a.date.localeCompare(b.date));

    await persist(prev => ({ ...prev, currentWeight: weight, weightLog: newLog }));

    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') return;

    try {
      const res = await apiFetch('/bodyweight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight, date: d, notes: notes || '', ptId: stateRef.current.ptId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          newEntry.id = data.id;
          const updatedLog = [...stateRef.current.weightLog.filter(e => e.date !== d), newEntry]
            .sort((a, b) => a.date.localeCompare(b.date));
          replaceState(prev => ({ ...prev, weightLog: updatedLog }));
        }
      }
    } catch {}
  }, [persist]);

  // ── Water tracker (local-first) ─────────────────────────────────────────────
  const logWater = useCallback((ml: number) => {
    const d = today();
    persist(prev => {
      const cur = prev.waterLog[d] || 0;
      const nextMl = Math.max(0, Math.min(20000, cur + ml)); // clamp: no negative / absurd
      return { ...prev, waterLog: { ...prev.waterLog, [d]: nextMl } };
    });
  }, [persist]);

  const setWaterGoal = useCallback((ml: number) => {
    const g = Math.round(ml);
    if (isNaN(g)) return;
    persist(prev => ({ ...prev, waterGoalMl: Math.max(500, Math.min(6000, g)) }));
  }, [persist]);

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
      const res = await apiFetch('/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutName,
          planId: workoutId,
          durationSecs,
          exercises,
          notes: notes || '',
          rpe: rpe || null,
          ptId: stateRef.current.ptId,
          date: today(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id || null;
      }
    } catch {}
    return null;
  }, []);

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
    const current = stateRef.current;
    const wasYesterday = current.lastSessionDate === yesterday();
    const wasToday     = current.lastSessionDate === d;
    const newStreak    = wasToday ? current.streak : wasYesterday ? current.streak + 1 : 1;

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

    await persist(prev => ({
      ...prev,
      streak: newStreak,
      lastSessionDate: d,
      sessions: [session, ...prev.sessions],
      workoutsLoaded: true,
    }));
  }, [persist, saveWorkoutToDB]);

  const updateName = useCallback((name: string) => {
    persist(prev => ({ ...prev, userName: name }));
  }, [persist]);

  const updateProfile = useCallback(async (profileUpdates: Partial<UserProfile> & { name?: string }): Promise<boolean> => {
    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') {
      await persist(prev => ({
        ...prev,
        userName: profileUpdates.name?.trim() || prev.userName,
        profile: { ...prev.profile, ...profileUpdates },
      }));
      return true;
    }

    try {
      const res = await apiFetch('/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileUpdates),
      });
      if (!res.ok) return false;
      await persist(prev => ({
        ...prev,
        userName: profileUpdates.name?.trim() || prev.userName,
        profile: { ...prev.profile, ...profileUpdates },
      }));
      return true;
    } catch {
      return false;
    }
  }, [persist]);

  const readiness: number | null = null;

  // ── Notifications ───────────────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    const token = await AsyncStorage.getItem('@viaxe_token');
    if (!token || token === 'demo') return;
    try {
      const res = await apiFetch('/notifications?limit=50');
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
      await apiFetch('/notifications?action=read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await apiFetch(`/coach?entity=checkins&limit=50${withPhotos ? '&full=1' : ''}`);
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
      const res = await apiFetch('/coach?entity=checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    const ptId = stateRef.current.ptId;
    if (!token || token === 'demo' || !ptId) return;
    try {
      const res = await apiFetch(`/messages?withUser=${encodeURIComponent(ptId)}`);
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({ ...prev, messages: data.messages || [], messagesLoaded: true }));
      }
    } catch {}
    setState(prev => ({ ...prev, messagesLoaded: true }));
  }, []);

  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    const token = await AsyncStorage.getItem('@viaxe_token');
    const ptId = stateRef.current.ptId;
    if (!token || token === 'demo' || !ptId) return false;
    try {
      const res = await apiFetch('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: ptId, text }),
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
  }, []);

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
    logWater,
    setWaterGoal,
    totalSessions: state.sessions.length,
  };
}

export type AppStore = ReturnType<typeof useCreateAppStore>;

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const store = useCreateAppStore();
  return createElement(AppStoreContext.Provider, { value: store }, children);
}

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error('useAppStore must be used within AppStoreProvider');
  return store;
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
