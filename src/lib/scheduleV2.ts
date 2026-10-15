// VIAXE — client for the v2 session endpoints (viaxe-os ARCHITECTURE.md
// §8.2 steps 2-4, 10). Thin wrappers over apiFetch; the server validates and
// authorises everything, these functions just shape the request and degrade
// to an empty/null result on a non-OK response rather than throwing, so a
// screen can render an honest empty state instead of crashing.

import { apiFetch } from './api';
import type { V2Prescription, V2ListItem, V2Result, V2PrescriptionRef } from '../types/sessionV2';

export interface MyUpcomingResult {
  prescriptions: V2Prescription[];
  limit: number;
  includePast: boolean;
}

/**
 * The athlete's own assigned plan items — bounded, "upcoming" (today or
 * later, or unscheduled) by default. Requires an athlete (client) session;
 * the server 400s a coach session calling this (coach.js?scope=mine).
 */
export async function fetchMyUpcoming(
  opts: { limit?: number; includePast?: boolean } = {},
): Promise<MyUpcomingResult> {
  const params = new URLSearchParams({ entity: 'plan-items', scope: 'mine' });
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.includePast) params.set('includePast', 'true');

  const res = await apiFetch(`/coach?${params.toString()}`);
  if (!res.ok) return { prescriptions: [], limit: opts.limit ?? 20, includePast: !!opts.includePast };
  const data = await res.json();
  return { prescriptions: data.prescriptions || [], limit: data.limit, includePast: data.includePast };
}

/** One specific prescription revision (defaults to latest when `rev` omitted). */
export async function fetchPrescription(
  programmeId: string, planItemId: string, rev?: number,
): Promise<V2Prescription | null> {
  const params = new URLSearchParams({ entity: 'plan-items', programmeId, planItemId });
  if (rev) params.set('rev', String(rev));
  const res = await apiFetch(`/coach?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.prescription || null;
}

export interface V2SessionsPage {
  items: V2ListItem[];
  nextCursor: string | null;
  nextCursorNative: string | null;
}

/**
 * This athlete's session history — legacy `workouts` adapted on read AND
 * native v2 results, merged by real chronological time, one list. This is
 * deliberately the SAME endpoint (and the same merge) the legacy workout
 * history already relies on — a legacy record's uncertainty flags (e.g.
 * missing prescription link, unverified weight unit) come through exactly
 * as the adapter produced them, never hidden or smoothed over.
 */
export async function fetchV2Sessions(
  clientId: string, opts: { limit?: number; before?: string; beforeNative?: string } = {},
): Promise<V2SessionsPage> {
  const params = new URLSearchParams({ entity: 'sessions-v2', clientId });
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.before) params.set('before', opts.before);
  if (opts.beforeNative) params.set('beforeNative', opts.beforeNative);

  const res = await apiFetch(`/workouts?${params.toString()}`);
  if (!res.ok) return { items: [], nextCursor: null, nextCursorNative: null };
  const data = await res.json();
  return { items: data.items || [], nextCursor: data.nextCursor ?? null, nextCursorNative: data.nextCursorNative ?? null };
}

/** One session (legacy-adapted or native) by its id — `ses_…` for native, a legacy Mongo id otherwise. */
export async function fetchV2SessionById(id: string): Promise<V2ListItem | null> {
  const res = await apiFetch(`/workouts?entity=sessions-v2&id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  return res.json();
}

export interface CompleteV2SessionInput {
  prescriptionRef?: V2PrescriptionRef | null;
  sport: string;
  sessionType: string;
  date: string;
  completedAt: string;
  status: 'completed' | 'partial' | 'skipped';
  blocks: unknown[];
  rpe?: number | null;
  notes?: string;
}

export interface CompleteV2SessionResult {
  ok: boolean;
  session?: V2Result;
  error?: string;
  code?: string;
}

/**
 * Complete a scheduled (or ad-hoc) v2 session. The server derives
 * athleteId/coachId itself and verifies a given prescriptionRef both exists
 * and is actually assigned to this athlete — this function does not and
 * cannot bypass either check, it only shapes the request.
 */
export async function completeV2Session(input: CompleteV2SessionInput): Promise<CompleteV2SessionResult> {
  const res = await apiFetch('/workouts?entity=sessions-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error, code: data.code };
  return { ok: true, session: data.session };
}
