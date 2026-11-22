// VIAXE — the pure decision logic behind useAppStore's account-isolation
// check, extracted so it's directly testable in plain Node (no React/RN
// runtime needed) — see test/account-isolation.test.js.
//
// The cached app-state blob (`@viaxe_v2`) is tagged with the session token
// that last wrote it. A fresh login always mints a brand-new, unguessable
// token (api/_lib/core.js's createSession), so comparing the CURRENT token
// against that tag is a reliable, instantly-available-offline signal for
// "is this still the same athlete's own continued session" — with no
// network round trip needed to decide, and critically, with no dependency
// on an explicit logout ever having run: closing the app without logging
// out and a DIFFERENT athlete then logging in always mints a token that
// cannot match what's recorded here.

/**
 * True when a cached blob must be discarded before anything derived from
 * it is ever shown — the mismatch case: a real (non-demo) session is
 * currently authenticated, a cached blob exists, but it was tagged under a
 * DIFFERENT token than the one currently authenticated.
 *
 * False (safe to use the cache) for: no cached blob at all, a demo/no
 * session (demo mode has its own separate seed path), or the tag matching
 * the current token exactly (the same athlete's own continued session).
 */
export function shouldDiscardCachedState(params: {
  hasCachedBlob: boolean;
  currentToken: string | null;
  cachedOwnerToken: string | null;
}): boolean {
  const { hasCachedBlob, currentToken, cachedOwnerToken } = params;
  if (!hasCachedBlob) return false;
  if (!currentToken || currentToken === 'demo') return false;
  return cachedOwnerToken !== currentToken;
}
