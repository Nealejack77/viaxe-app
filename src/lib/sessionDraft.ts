// VIAXE — durable autosave for an in-progress v2 session completion, so an
// interrupted workout (app killed, backgrounded, network drop) never loses
// what the athlete already logged.
//
// Scoped to (athleteId, programmeId, planItemId, rev): a draft never leaks
// between athletes sharing a device (account switching), never applies to
// a different scheduled session, and is never silently carried over onto a
// LATER prescription revision once the coach has revised it — a stale
// draft for a rev that no longer applies is simply orphaned and ignored,
// never merged onto different content.
//
// Storage is injected (not a hard import of AsyncStorage) so this module's
// logic is testable in plain Node, without a React Native/Expo runtime —
// see test/session-draft.test.js.

export interface SessionDraft {
  athleteId: string;
  programmeId: string | null;
  planItemId: string | null;
  rev: number | null;
  clientRequestId: string;
  actuals: Record<number, Record<string, string>>;
  savedAt: string;
}

export interface StorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function draftKey(
  athleteId: string,
  programmeId: string | null,
  planItemId: string | null,
  rev: number | null,
): string {
  return `@viaxe_session_draft:${athleteId}:${programmeId ?? 'adhoc'}:${planItemId ?? 'adhoc'}:${rev ?? 0}`;
}

export async function saveDraft(storage: StorageLike, draft: SessionDraft): Promise<void> {
  const key = draftKey(draft.athleteId, draft.programmeId, draft.planItemId, draft.rev);
  await storage.setItem(key, JSON.stringify(draft));
}

/**
 * Load a draft for this EXACT athlete + prescription + revision. Returns
 * null for no draft, a corrupted/malformed record, or (defence in depth,
 * in case a key somehow collided) a record whose own scope doesn't match
 * what was asked for — never partially resurrects a draft outside its
 * original scope.
 */
export async function loadDraft(
  storage: StorageLike,
  athleteId: string,
  programmeId: string | null,
  planItemId: string | null,
  rev: number | null,
): Promise<SessionDraft | null> {
  const key = draftKey(athleteId, programmeId, planItemId, rev);
  const raw = await storage.getItem(key);
  if (!raw) return null;
  let parsed: SessionDraft;
  try {
    parsed = JSON.parse(raw) as SessionDraft;
  } catch {
    return null;
  }
  if (
    !parsed ||
    parsed.athleteId !== athleteId ||
    parsed.programmeId !== programmeId ||
    parsed.planItemId !== planItemId ||
    parsed.rev !== rev ||
    typeof parsed.clientRequestId !== 'string' ||
    !parsed.clientRequestId
  ) {
    return null;
  }
  return parsed;
}

export async function clearDraft(
  storage: StorageLike,
  athleteId: string,
  programmeId: string | null,
  planItemId: string | null,
  rev: number | null,
): Promise<void> {
  const key = draftKey(athleteId, programmeId, planItemId, rev);
  await storage.removeItem(key);
}

/**
 * The idempotency key for completing this exact prescription revision.
 * Deterministic and reconstructible at any time from the prescription's
 * own identity — nothing needs to be separately generated or persisted
 * just to survive a retry for a SCHEDULED session. An ad-hoc (unplanned)
 * session has no natural stable key, so the caller must mint and persist
 * one itself (inside the draft) for that case.
 */
export function prescriptionRequestId(programmeId: string, planItemId: string, rev: number): string {
  return `${programmeId}:${planItemId}:${rev}`;
}

/** A fresh, sufficiently-unique id for an ad-hoc (unplanned) session's own draft/idempotency key. */
export function newAdHocRequestId(): string {
  return `adhoc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
