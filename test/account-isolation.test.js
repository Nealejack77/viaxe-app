// Plain-Node regression tests for src/lib/accountIsolation.ts — the pure
// decision logic behind useAppStore's account-isolation fix. Runs the REAL
// TypeScript module directly (Node 24's native type-stripping) — no React/
// React Native runtime needed to test this part of the fix.
//
// The full, real-app proof of the actual scenarios (Athlete A caches data,
// app closes without logout, Athlete B signs in, isolation holds, Athlete A
// signs back in, normal logout still works) is
// test/browser/account-isolation.js — a real-browser E2E test, since that
// is the only way to faithfully exercise useAppStore's AsyncStorage +
// React lifecycle together, consistent with how this project tests
// hook/screen behaviour elsewhere.
//
// Usage:  node --experimental-strip-types test/account-isolation.test.js
'use strict';

const assert = require('assert');
const path = require('path');

async function main() {
  const { shouldDiscardCachedState } = await import(path.join(__dirname, '..', 'src', 'lib', 'accountIsolation.ts'));

  // ── 1. No cached blob at all — nothing to discard. ──────────────────────
  assert.strictEqual(
    shouldDiscardCachedState({ hasCachedBlob: false, currentToken: 'tok-b', cachedOwnerToken: 'tok-a' }),
    false,
    'no cached blob means nothing to discard, regardless of any stale owner tag',
  );
  console.log('✓ 1/6 no cached blob at all is never discarded (nothing to discard)');

  // ── 2. Demo mode / no real session — the demo seed path is separate. ────
  assert.strictEqual(
    shouldDiscardCachedState({ hasCachedBlob: true, currentToken: null, cachedOwnerToken: 'tok-a' }),
    false,
    'no current token (logged out / not yet authenticated) is not this check\'s concern',
  );
  assert.strictEqual(
    shouldDiscardCachedState({ hasCachedBlob: true, currentToken: 'demo', cachedOwnerToken: 'tok-a' }),
    false,
    'demo mode is never discarded by this check — it has its own separate seed path',
  );
  console.log('✓ 2/6 demo mode and the logged-out state are left alone by this check');

  // ── 3. THE core scenario — Athlete A caches data, closes the app without
  //    logging out, Athlete B signs in. B's fresh token never matches A's
  //    cached tag, so A's cache must be discarded before B ever sees it. ──
  assert.strictEqual(
    shouldDiscardCachedState({ hasCachedBlob: true, currentToken: 'tok-athlete-b', cachedOwnerToken: 'tok-athlete-a' }),
    true,
    'a different athlete\'s fresh login must discard a cache tagged under someone else\'s token — no explicit logout required for this to trigger',
  );
  console.log('✓ 3/6 a different athlete logging in (no prior logout) correctly discards the previous athlete\'s cache');

  // ── 4. Athlete A signing in AGAIN (same token as last time, e.g. simply
  //    reopening the app) must NOT discard their own valid offline state. ─
  assert.strictEqual(
    shouldDiscardCachedState({ hasCachedBlob: true, currentToken: 'tok-athlete-a', cachedOwnerToken: 'tok-athlete-a' }),
    false,
    'the SAME athlete continuing their own session must keep using their cached offline state',
  );
  console.log('✓ 4/6 the same athlete\'s own continued session (matching token) preserves their valid cached state');

  // ── 5. A cache with no owner tag recorded at all (e.g. upgrading from a
  //    build before this fix existed) is treated as untrusted — never
  //    assumed to belong to whoever is currently logged in. ──────────────
  assert.strictEqual(
    shouldDiscardCachedState({ hasCachedBlob: true, currentToken: 'tok-athlete-a', cachedOwnerToken: null }),
    true,
    'an untagged pre-existing cache must not be trusted just because someone is currently logged in',
  );
  console.log('✓ 5/6 a pre-existing cache with no owner tag at all (e.g. from before this fix) is never trusted blindly');

  // ── 6. Logout clears the cached blob entirely (App.tsx's handleLogout,
  //    unchanged by this fix) — confirm the check is a no-op once there is
  //    truly nothing cached, which is what a normal logout leaves behind. ─
  assert.strictEqual(
    shouldDiscardCachedState({ hasCachedBlob: false, currentToken: 'tok-athlete-a', cachedOwnerToken: null }),
    false,
    'after a normal logout (no cached blob, no owner tag), there is nothing for this check to do — logout behaviour is untouched',
  );
  console.log('✓ 6/6 normal logout leaves nothing for this check to discard — logout behaviour is unaffected by this fix');

  console.log('\n✓ account-isolation: PASS');
}

main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e); process.exit(1); });
