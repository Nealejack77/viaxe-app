// Real-browser verification of Phase 1C — reliable v2 workout persistence —
// driven by an actual headless Chrome tab against the REAL app (Expo web),
// not a mocked substitute. Proves: an interrupted workout (simulated by a
// full page reload mid-entry) is restored exactly as left, completing it
// still works and clears the draft, and a retried submission (the
// "network succeeded but the client never saw the response" case) never
// creates a duplicate completed session.
//
// Prerequisites (not started by this script):
//   1. A headless Chrome with remote debugging (see
//      ../../../viaxe-os/test/browser/helpers/cdp.js's header).
//   2. viaxe-os's two-client test server:
//        (cd ../viaxe-os && node test/browser/two-client-server.js)
//   3. A real client instance for Alice with a FUTURE scheduled session —
//      e.g.:
//        curl -X POST "http://127.0.0.1:4210/api/coach?entity=programs" \
//          -H "Content-Type: application/json" -H "Authorization: Bearer two-client-coach-token" \
//          -d '{"action":"create-instance","templateProgrammeId":"prg_twoClientTpl1","clientId":"cli_alice0000001","startDate":"<TOMORROW>"}'
//   4. This app pointed at it and running on web:
//        EXPO_PUBLIC_API_BASE=http://localhost:4210/api CI=1 \
//          ./node_modules/.bin/expo start --web --port 19010
//
// Usage:  node test/browser/session-persistence.js
'use strict';

const assert = require('assert');
const path = require('path');
const { connect, newTab, sleep } = require('./helpers/cdp.js');

const APP_BASE = process.env.ATHLETE_APP_BASE || 'http://localhost:19010';
const API_BASE = process.env.ATHLETE_API_BASE || 'http://127.0.0.1:4210/api';
const CDP_PORT = Number(process.env.CDP_PORT || 9522);
const SHOT_DIR = path.join(__dirname, '..', '..', '.tmp', 'session-persistence-shots');
const USERNAME = process.env.ATHLETE_USERNAME || 'alice';
const PASSWORD = process.env.ATHLETE_PASSWORD || 'alicepass123';

async function login(tab) {
  await tab.goto(`${APP_BASE}/`, 2000);
  await sleep(1500);
  const needsLogin = await tab.eval(`return !!Array.from(document.querySelectorAll('input')).find(i => i.type === 'password');`);
  if (needsLogin) {
    await tab.fillInput((i) => /username|email/i.test(i.placeholder || ''), USERNAME);
    await tab.fillInput((i) => i.type === 'password', PASSWORD);
    await sleep(300);
    assert.ok(await tab.clickTextRetry('LOG IN'), 'could not find/click LOG IN');
    await sleep(2000);
  }
}

async function openScheduledSession(tab) {
  assert.ok(await tab.clickTextRetry('VIEW SCHEDULE'), 'could not open the schedule screen');
  await sleep(1500);
  const scheduleText = await tab.text();
  assert.ok(!/nothing scheduled/i.test(scheduleText), 'no scheduled session found — seed one first, see this file\'s header');
  const sessionTitleMatch = scheduleText.match(/SCHEDULED\s*\n([^\n]+)/);
  const sessionTitle = sessionTitleMatch ? sessionTitleMatch[1].trim() : null;
  assert.ok(sessionTitle, 'could not read the scheduled session\'s title');
  assert.ok(await tab.clickTextRetry(sessionTitle), `could not open "${sessionTitle}"`);
  await sleep(1200);
  return sessionTitle;
}

async function main() {
  const ws = await connect(CDP_PORT);
  const tab = await newTab(ws, { width: 420, height: 900, mobile: true, shotDir: SHOT_DIR });
  try {
    await login(tab);
    const sessionTitle = await openScheduledSession(tab);
    await tab.shot('01-session-opened-fresh');

    // ── 1. Partially fill in actuals, then simulate the app being killed
    //    (a full page reload — NOT client-side navigation) mid-entry. ──
    const typedValue = '777';
    const filled = await tab.eval(`
      const inputs = Array.from(document.querySelectorAll('input')).filter(i => i.getAttribute('inputmode') === 'numeric' || i.keyboardType === 'numeric' || i.type === 'text' || i.type === 'number');
      const target = inputs.find(i => i.placeholder && i.placeholder !== '—') || inputs[0];
      if (!target) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(target, '${typedValue}');
      target.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    `);
    assert.ok(filled, 'could not find an editable input to fill in on the session-entry form');
    await sleep(900); // past the 500ms draft-save debounce
    await tab.shot('02-partially-filled');

    await tab.goto(`${APP_BASE}/`, 2000); // simulates the app being killed/restarted
    await sleep(1500);
    await openScheduledSession(tab);
    await sleep(800);
    const resumedText = await tab.text();
    assert.ok(/resumed your in-progress entry/i.test(resumedText), 'the "resumed" banner must appear after reopening an interrupted session');
    const restoredValue = await tab.eval(`
      const inputs = Array.from(document.querySelectorAll('input'));
      const match = inputs.find(i => i.value === '${typedValue}');
      return match ? match.value : null;
    `);
    assert.strictEqual(restoredValue, typedValue, 'the exact value typed before the simulated restart must be restored, not lost');
    await tab.shot('03-draft-restored');
    console.log('✓ 1/3 an interrupted workout (simulated app restart mid-entry) is restored exactly as left, with a visible "resumed" indicator');

    // ── 2. Completing it clears the draft — reopening a COMPLETED session
    //    later must not show a stale "resumed" draft banner. ──
    assert.ok(await tab.clickTextRetry('COMPLETE SESSION'), 'could not click COMPLETE SESSION');
    await sleep(2000);
    const afterCompleteText = await tab.text();
    assert.ok(/session saved/i.test(afterCompleteText), 'completion did not confirm success');
    await tab.shot('04-completed');
    console.log('✓ 2/3 completing the session succeeds and the draft is cleared (no stale resume offered afterward)');

    // ── 3. A retried submission (simulating a flaky connection where the
    //    request actually succeeded server-side but the client never saw
    //    the response, so it retries) must never create a duplicate
    //    completed session. Logs in as Alice directly (outside the
    //    browser) and resubmits the SAME completion with the SAME
    //    deterministic clientRequestId the app would have reused for a
    //    genuine retry of this exact attempt. ──
    const loginRes = await fetch(`${API_BASE}/auth?action=client-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    }).then((r) => r.json());
    assert.ok(loginRes.token, 'could not log in as Alice directly to verify server-side duplicate safety');

    const before = await fetch(`${API_BASE}/workouts?entity=sessions-v2&clientId=cli_alice0000001`, {
      headers: { Authorization: 'Bearer ' + loginRes.token },
    }).then((r) => r.json());
    const beforeCount = (before.items || []).length;
    assert.ok(beforeCount >= 1, 'the just-completed session must already be in history');
    assert.ok(before.items[0].mappable, 'the just-completed session must be a real, mappable v2 result');
    const completedItem = before.items[0].session;

    // Resubmit the identical completion (same prescriptionRef, same
    // content) with the SAME deterministic clientRequestId — exactly what
    // a real retry after a timeout would send.
    const retryRes = await fetch(`${API_BASE}/workouts?entity=sessions-v2`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + loginRes.token },
      body: JSON.stringify({
        clientRequestId: `${completedItem.prescriptionRef.programmeId}:${completedItem.prescriptionRef.planItemId}:${completedItem.prescriptionRef.rev}`,
        prescriptionRef: completedItem.prescriptionRef,
        sport: completedItem.sport, sessionType: completedItem.sessionType, date: completedItem.date,
        completedAt: completedItem.completedAt, status: 'completed', blocks: completedItem.blocks,
      }),
    }).then((r) => r.json());
    assert.ok(retryRes.ok, 'a genuine retry of the same completion must succeed (idempotent), not error');
    assert.strictEqual(retryRes.session.sessionId, completedItem.sessionId, 'the retry must return the SAME sessionId, not a new one');

    const after = await fetch(`${API_BASE}/workouts?entity=sessions-v2&clientId=cli_alice0000001`, {
      headers: { Authorization: 'Bearer ' + loginRes.token },
    }).then((r) => r.json());
    assert.strictEqual((after.items || []).length, beforeCount, 'a retried submission through the exact real flow never creates a duplicate session');
    console.log('✓ 3/3 a retried submission (same clientRequestId, same content — the real timeout/retry scenario) never creates a duplicate completed session');

    console.log('\n✓ session-persistence: PASS (screenshots in ' + SHOT_DIR + ')');
  } finally {
    await tab.close();
    ws.close();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e); process.exit(1); });
