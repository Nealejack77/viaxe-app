// VIAXE — client-side types for the v2 session contract (viaxe-os
// api/_lib/session-schema.js). Loosely typed on purpose: the SERVER is the
// validator (schemaVersion 2's validatePrescription/validateResult); these
// types exist so the app can read and render the response safely, not to
// re-implement validation. Every measure field is nullable because the
// server's own contract treats null as "not measured" and distinguishes it
// from a real zero — the app must preserve that distinction, never coerce
// a missing value to 0 when rendering.

export type V2BlockKind = 'warmup' | 'work' | 'recovery' | 'cooldown' | 'transition';
export type V2Modality =
  | 'strength' | 'run' | 'ride' | 'swim' | 'row' | 'ski' | 'sled' | 'carry' | 'other';
export type V2ResultStatus = 'completed' | 'partial' | 'skipped';

export interface V2Set {
  setNumber: number;
  reps: number | null;
  weightKg?: number | null;
  bodyweight?: boolean;
  rpe?: number | null;
  completed?: boolean;
  notes?: string;
}

export interface V2Block {
  index: number;
  kind: V2BlockKind;
  modality: V2Modality;
  name: string;
  notes?: string;
  addedByAthlete?: boolean;
  // Measure fields — every one of these means "not measured" when null or
  // absent, and a real zero when 0. Never assume a missing field is 0.
  distanceM?: number | null;
  durationSec?: number | null;
  restSec?: number | null;
  paceSecPerKm?: number | null;
  speedKph?: number | null;
  avgHrBpm?: number | null;
  avgPowerW?: number | null;
  cadenceSpm?: number | null;
  cadenceRpm?: number | null;
  loadKg?: number | null;
  poolLengthM?: number | null;
  strokeType?: string | null;
  elevationGainM?: number | null;
  sets?: V2Set[];
  repeats?: { count: number; work: V2Block; recovery?: V2Block | null };
}

export interface V2PrescriptionRef {
  programmeId: string;
  planItemId: string;
  rev: number;
}

export interface V2Prescription {
  schemaVersion: 2;
  programmeId: string;
  planItemId: string;
  rev: number;
  title: string;
  sport: string;
  sessionType: string;
  blocks: V2Block[];
  scheduledDate?: string | null;
  totals?: Record<string, number | null>;
  rpe?: number | null;
  notes?: string;
  createdAt?: string;
}

export interface V2CoachFeedback {
  text: string;
  status: string;
  coachId: string | null;
}

export interface V2Result {
  schemaVersion: 2;
  sessionId: string;
  athleteId: string;
  coachId: string | null;
  prescriptionRef: V2PrescriptionRef | null;
  sport: string;
  sessionType: string;
  date: string;
  startedAt?: string | null;
  completedAt: string | null;
  status: V2ResultStatus;
  blocks: V2Block[];
  totals?: Record<string, number | null>;
  rpe?: number | null;
  notes?: string;
  coachFeedback?: V2CoachFeedback | null;
}

export interface V2Flag {
  code: string;
  detail: string;
  path: string | null;
  fatal: boolean;
}

/**
 * One entry in a sessions-v2 list/single read. `mappable: false` means the
 * server could not produce a valid v2 session from this record (a malformed
 * legacy workout) — `session` is then null and `flags` says why; the app
 * must show that record is UNCERTAIN, never silently drop it or fabricate a
 * best-effort session.
 */
export interface V2ListItem {
  mappable: boolean;
  session: V2Result | null;
  flags: V2Flag[];
  unmapped?: unknown;
  source: { collection: string; id: string | null };
}
