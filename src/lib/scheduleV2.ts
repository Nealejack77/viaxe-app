// VIAXE — client for the v2 session endpoints (viaxe-os ARCHITECTURE.md
// §8.2 steps 2-4, 10). Thin wrappers over apiFetch; the server validates and
// authorises everything, these functions just shape the request. Two
// behaviours on a non-OK response, by what the caller needs to tell apart:
// fetchMyUpcoming/fetchV2Sessions THROW — a real empty list (200, "nothing
// scheduled") and a failed request (500, network error) must stay
// distinguishable so a screen can show a genuine empty state for one and a
// load error with retry for the other. fetchPrescription/fetchV2SessionById/
// completeV2Session still degrade to null/a typed failure — their callers
// (CompleteSessionScreen, SessionResultScreen) already branch on that shape.

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
 *
 * Throws on a non-OK response — a real empty schedule (200, `prescriptions:
 * []`) and a failed request (500, network error) must stay distinguishable
 * to the caller, so ScheduleScreen can show "Nothing scheduled" for the
 * former and a load error with retry for the latter, instead of both
 * silently collapsing into the same empty list.
 */
export async function fetchMyUpcoming(
  opts: { limit?: number; includePast?: boolean } = {},
): Promise<MyUpcomingResult> {
  const params = new URLSearchParams({ entity: 'plan-items', scope: 'mine' });
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.includePast) params.set('includePast', 'true');

  const res = await apiFetch(`/coach?${params.toString()}`);
  if (!res.ok) throw new Error(`fetchMyUpcoming failed: ${res.status}`);
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
 *
 * Throws on a non-OK response — see fetchMyUpcoming's doc comment for why:
 * a real empty history must stay distinguishable from a failed request.
 */
export async function fetchV2Sessions(
  clientId: string, opts: { limit?: number; before?: string; beforeNative?: string } = {},
): Promise<V2SessionsPage> {
  const params = new URLSearchParams({ entity: 'sessions-v2', clientId });
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.before) params.set('before', opts.before);
  if (opts.beforeNative) params.set('beforeNative', opts.beforeNative);

  const res = await apiFetch(`/workouts?${params.toString()}`);
  if (!res.ok) throw new Error(`fetchV2Sessions failed: ${res.status}`);
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
  // Makes a retry (timeout, flaky connection, double-tap) safe: the server
  // returns the already-stored result instead of creating a duplicate
  // session, and refuses outright (409 REQUEST_ID_REUSED) if the same id is
  // ever resubmitted with materially different content.
  clientRequestId?: string;
}

export interface CompleteV2SessionResult {
  ok: boolean;
  session?: V2Result;
  error?: string;
  code?: string;
}

async function postCompletion(input: CompleteV2SessionInput) {
  const res = await apiFetch('/workouts?entity=sessions-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/** True only for the exact "server doesn't know this field yet" shape — never a generic validation failure. */
function isUnrecognisedRequestIdField(data: any): boolean {
  return data?.code === 'INVALID_RESULT' && Array.isArray(data.errors)
    && data.errors.some((e: any) => e?.path === 'clientRequestId');
}

/**
 * Complete a scheduled (or ad-hoc) v2 session. The server derives
 * athleteId/coachId itself and verifies a given prescriptionRef both exists
 * and is actually assigned to this athlete — this function does not and
 * cannot bypass either check, it only shapes the request.
 */
export async function completeV2Session(input: CompleteV2SessionInput): Promise<CompleteV2SessionResult> {
  let { res, data } = await postCompletion(input);

  // An OLDER server (deployed before idempotency support, or rolled back to
  // one) rejects clientRequestId outright as an unknown field — this is the
  // ONE specific, detectable shape that means "this server doesn't support
  // it yet," never a genuine validation problem with the submission itself.
  // Retrying once WITHOUT it keeps completion working (no duplicate
  // protection against that older server, which is the best available —
  // it has none either way) instead of failing every single submission
  // for the whole deployment window.
  if (!res.ok && isUnrecognisedRequestIdField(data) && input.clientRequestId) {
    const { clientRequestId, ...withoutRequestId } = input;
    ({ res, data } = await postCompletion(withoutRequestId));
  }

  if (!res.ok) return { ok: false, error: data.error, code: data.code };
  return { ok: true, session: data.session };
}
