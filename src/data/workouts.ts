export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  repsLabel?: string;
  weight: number;
  weightLabel?: string;
  rest: number;
  category: string;
}

export interface Workout {
  id: string;
  name: string;
  tag: string;
  duration: number;
  emoji: string;
  exercises: Exercise[];
}

export const WORKOUTS: Workout[] = [
  {
    id: 'upper-power',
    name: 'Upper Body Power',
    tag: 'HIGH INTENSITY',
    duration: 45,
    emoji: '⚡',
    exercises: [
      { id: 'u1', name: 'Bench Press', sets: 5, reps: 8, weight: 80, rest: 180, category: 'Push' },
      { id: 'u2', name: 'Incline DB Press', sets: 4, reps: 10, weight: 30, rest: 120, category: 'Push' },
      { id: 'u3', name: 'Cable Fly', sets: 3, reps: 15, weight: 15, rest: 90, category: 'Push' },
      { id: 'u4', name: 'Overhead Press', sets: 4, reps: 8, weight: 60, rest: 150, category: 'Push' },
      { id: 'u5', name: 'Tricep Pushdown', sets: 3, reps: 12, weight: 25, rest: 90, category: 'Push' },
    ],
  },
  {
    id: 'leg-day',
    name: 'Leg Day Power',
    tag: 'HIGH INTENSITY',
    duration: 55,
    emoji: '🦵',
    exercises: [
      { id: 'l1', name: 'Back Squat', sets: 5, reps: 5, weight: 100, rest: 240, category: 'Legs' },
      { id: 'l2', name: 'Romanian Deadlift', sets: 4, reps: 8, weight: 80, rest: 180, category: 'Legs' },
      { id: 'l3', name: 'Leg Press', sets: 3, reps: 12, weight: 140, rest: 120, category: 'Legs' },
      { id: 'l4', name: 'Walking Lunges', sets: 3, reps: 10, weight: 20, rest: 90, category: 'Legs' },
      { id: 'l5', name: 'Leg Curl', sets: 3, reps: 12, weight: 35, rest: 90, category: 'Legs' },
    ],
  },
  {
    id: 'pull-day',
    name: 'Pull Day Hypertrophy',
    tag: 'MODERATE INTENSITY',
    duration: 50,
    emoji: '💪',
    exercises: [
      { id: 'p1', name: 'Deadlift', sets: 4, reps: 6, weight: 120, rest: 300, category: 'Pull' },
      { id: 'p2', name: 'Barbell Row', sets: 4, reps: 8, weight: 80, rest: 180, category: 'Pull' },
      { id: 'p3', name: 'Pull-Ups', sets: 4, reps: 8, weight: 0, rest: 120, category: 'Pull' },
      { id: 'p4', name: 'Face Pull', sets: 3, reps: 15, weight: 20, rest: 90, category: 'Pull' },
      { id: 'p5', name: 'Bicep Curl', sets: 3, reps: 12, weight: 15, rest: 90, category: 'Pull' },
    ],
  },
];

export function getDayWorkout(): Workout {
  const day = new Date().getDay(); // 0–6
  return WORKOUTS[day % WORKOUTS.length];
}
