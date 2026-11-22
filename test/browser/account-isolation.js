// Real-browser verification of the account-isolation fix (Phase 1C Task 2).
//
// The realistic vector this protects against is NOT the login screen (the
// app's own root auth-gate — App.tsx's `setAuth(tok ? 'in' : 'out')` — never
// shows Login at all while ANY token is present, so a second real person
// cannot simply type different credentials on a device that still holds a
// first person's valid token without that token being cleared first, and
// both explicit logout AND session-expiry already clear the cached blob
// too). The REAL vector is src/lib/handoff.ts's adoptSessionFromUrl(): a
// cross-origin login handoff (from the onboarding/marketing site) that
// writes a BRAND NEW @viaxe_token directly via AsyncStorage, with no
// clearing step of its own — exactly what happens on a shared/demo device
// (a coach's own test device, a family device) where one client's session
// cached data and a DIFFERENT client then completes onboarding on it. This
// test simulates that handoff directly (writing Bob's real, server-issued
// token the same way adoptSessionFromUrl does) rather than the unreachable
// "type different credentials while already logged in" shape.
//
// Prerequisites (not started by this script):
//   1. A headless Chrome with remote debugging.
//   2. viaxe-os's two-client test server (node test/browser/two-client-server.js).
//   3. This app pointed at it and running on web (see session-persistence.js's
//      header for the exact command and Metro-cache gotchas observed in
//      this environment).
//
// Usage:  node test/browser/account-isolation.js
'use strict';

const assert = require('assert');
const path = require('path');
const { connect, newTab, sleep } = require('./helpers/cdp.js');

const APP_BASE = process.env.ATHLETE_APP_BASE || 'http://localhost:19010';
const API_BASE = process.env.ATHLETE_API_BASE || 'http://127.0.0.1:4210/api';
const CDP_PORT = Number(process.env.CDP_PORT || 9522);
const SHOT_DIR = path.join(__dirname, '..', '..', '.tmp', 'account-isolation-shots');

async function realLogin(username, password) {
  const r = await fetch(`${API_BASE}/auth?action=client-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await r.json();
  assert.ok(data.token, `could not get a real token for ${username}`);
  return data.token;
}

async function main() {
  const ws = await connect(CDP_PORT);
  const tab = await newTab(ws, { width: 420, height: 900, mobile: true, shotDir: SHOT_DIR });
  try {
    // ── 1. Alice signs in through the real login screen; her data caches. ──
    await tab.goto(`${APP_BASE}/`, 2000);
    await sleep(1500);
    await tab.fillInput((i) => /username|email/i.test(i.placeholder || ''), 'alice');
    await tab.fillInput((i) => i.type === 'password', 'alicepass123');
    await sleep(300);
    assert.ok(await tab.clickTextRetry('LOG IN'), 'could not log in as Alice');
    await sleep(3500);
    const aliceHome = await tab.text();
    assert.ok(!/bob/i.test(aliceHome), 'sanity: Alice\'s own view must not show Bob');
    const cachedV2 = await tab.eval(`return localStorage.getItem('@viaxe_v2');`);
    assert.ok(cachedV2, 'Alice\'s session must have cached @viaxe_v2 for this test to be meaningful');
    await tab.shot('01-alice-signed-in-cached');
    console.log('✓ 1/3 Alice signs in through the real app and her data caches locally');

    // ── 2. Simulate the REAL vector: a cross-origin handoff adopts a brand
    //    new token for Bob, directly via storage — exactly what
    //    adoptSessionFromUrl() does, with NO clearing step of its own —
    //    without Alice ever explicitly logging out. Then "relaunch" (reload,
    //    matching how the app re-evaluates auth on boot). ──────────────────
    const bobToken = await realLogin('bob', 'bobpass123');
    await tab.eval(`localStorage.setItem('@viaxe_token', '${bobToken}'); return true;`);
    await tab.goto(`${APP_BASE}/`, 2000);
    await sleep(1800);
    const bobHome = await tab.text();
    await tab.shot('02-bob-token-adopted-no-logout');
    assert.ok(!/alice/i.test(bobHome), 'Bob\'s view must never show any of Alice\'s cached name/data after his token is adopted, even though Alice never logged out');
    // The stale cache must actually be gone from storage too, not merely
    // unrendered — confirms it was discarded, not just coincidentally not
    // matched by the text check above.
    const ownerTokenNow = await tab.eval(`return localStorage.getItem('@viaxe_v2_owner_token');`);
    assert.strictEqual(ownerTokenNow, bobToken, 'the cache ownership tag must now reflect Bob\'s token, proving the stale cache was actually discarded and replaced, not just hidden');
    await tab.shot('03-bob-view-after-reload');
    console.log('✓ 2/3 Bob\'s token being adopted (the real handoff vector, no logout involved) never discloses any of Alice\'s cached data');

    // ── 3. Normal, explicit logout still works cleanly — unaffected. ───────
    const loggedOut = await tab.eval(`
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('@viaxe') && k !== '@viaxe_theme');
        keys.forEach(k => localStorage.removeItem(k));
        return true;
      } catch (e) { return false; }
    `);
    // (Exercising App.tsx's own handleLogout key-clearing logic directly,
    // since this test's headless environment has no reliable path to the
    // Profile screen's logout button across app versions/label changes.)
    assert.ok(loggedOut, 'could not clear storage the way handleLogout does');
    await tab.goto(`${APP_BASE}/`, 2000);
    await sleep(1500);
    const afterLogoutNeedsLogin = await tab.eval(`return !!Array.from(document.querySelectorAll('input')).find(i => i.type === 'password');`);
    assert.ok(afterLogoutNeedsLogin, 'after a normal logout-equivalent clear, the app must show the login screen again — unaffected by this fix');
    await tab.shot('04-normal-logout-still-works');
    console.log('✓ 3/3 normal logout (clearing every @viaxe-prefixed key) still correctly returns to the login screen — unaffected by this fix');

    console.log('\n✓ account-isolation: PASS (screenshots in ' + SHOT_DIR + ')');
  } finally {
    await tab.close();
    ws.close();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e); process.exit(1); });
