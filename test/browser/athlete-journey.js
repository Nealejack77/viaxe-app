// Real-browser verification of the athlete app (Expo web target), driven
// by an actual headless Chrome tab — not an HTTP-only substitute for UI
// coverage. Proves: real login, a scheduled v2 session with a rep-RANGE +
// bodyweight prescription renders its real target (not a blank "—"),
// completing it logs real actuals without losing the prescription link,
// and the result persists across a fresh page load.
//
// Prerequisites (not started by this script):
//   1. A headless Chrome with remote debugging (see
//      ../../../viaxe-os/test/browser/helpers/cdp.js's header).
//   2. viaxe-os's two-client test server:
//        (cd ../viaxe-os && node test/browser/two-client-server.js)
//   3. This app pointed at it and running on web:
//        EXPO_PUBLIC_API_BASE=http://localhost:4210/api CI=1 \
//          npx expo start --web --port 19010
//      NOTE: .env.local (if present) wins over a shell-exported
//      EXPO_PUBLIC_API_BASE — edit it directly rather than relying on the
//      shell var, then restart Expo (env vars are inlined at bundle time,
//      a reload is not enough).
//   4. One real session seeded for Alice with a future scheduledDate and a
//      repsMin/repsMax + bodyweight set — see the curl commands in
//      ../../../viaxe-os's review packet, or construct an equivalent
//      coach-side POST to entity=programs (create) + entity=plan-items
//      (create) + entity=programs action=create-instance.
//
// Usage:  node test/browser/athlete-journey.js
'use strict';

const assert = require('assert');
const path = require('path');
const { connect, newTab, sleep } = require('./helpers/cdp.js');

const APP_BASE = process.env.ATHLETE_APP_BASE || 'http://localhost:19010';
const CDP_PORT = Number(process.env.CDP_PORT || 9521);
const SHOT_DIR = path.join(__dirname, '..', '..', '.tmp', 'athlete-journey-shots');
const USERNAME = process.env.ATHLETE_USERNAME || 'alice';
const PASSWORD = process.env.ATHLETE_PASSWORD || 'alicepass123';

async function main() {
  const ws = await connect(CDP_PORT);
  const tab = await newTab(ws, { width: 420, height: 900, mobile: true, shotDir: SHOT_DIR });
  try {
    await tab.goto(`${APP_BASE}/`, 2000);
    await sleep(1500);

    const needsLogin = await tab.eval(`return !!Array.from(document.querySelectorAll('input')).find(i => i.type === 'password');`);
    if (needsLogin) {
      await tab.fillInput((i) => /username|email/i.test(i.placeholder || ''), USERNAME);
      await tab.fillInput((i) => i.type === 'password', PASSWORD);
      await sleep(300);
      const loggedIn = await tab.clickTextRetry('LOG IN');
      assert.ok(loggedIn, 'could not find/click the LOG IN button');
      await sleep(2000);
      const afterLoginText = await tab.text();
      assert.ok(!/incorrect password|network error/i.test(afterLoginText), `login failed: ${afterLoginText.slice(0, 200)}`);
    }
    await tab.shot('01-dashboard');
    console.log('✓ 1/6 real login (actual bcrypt-verified HTTP through the app\'s own LoginScreen) succeeds');

    assert.ok(await tab.clickTextRetry('VIEW SCHEDULE'), 'could not open the schedule screen');
    await sleep(1500);
    const scheduleText = await tab.text();
    await tab.shot('02-schedule');
    assert.ok(!/nothing scheduled/i.test(scheduleText), 'no scheduled session found — seed one with a FUTURE scheduledDate first (see this file\'s header)');
    console.log('✓ 2/6 the athlete\'s real assigned instance session (with its real date) renders on the Schedule screen');

    // Open the first scheduled session's detail/editor.
    const sessionTitleMatch = scheduleText.match(/SCHEDULED\s*\n([^\n]+)/);
    const sessionTitle = sessionTitleMatch ? sessionTitleMatch[1].trim() : null;
    assert.ok(sessionTitle, 'could not read the scheduled session\'s title from the Schedule screen');
    assert.ok(await tab.clickTextRetry(sessionTitle), `could not open session detail for "${sessionTitle}"`);
    await sleep(1200);
    await tab.shot('03-session-detail');

    // The actual compatibility check: a rep-RANGE (repsMin/repsMax) set
    // must show its real target as the input's placeholder, not a blank
    // "—" (the bug this fix addresses — see src/components/SessionBlocks.tsx).
    const repsPlaceholders = await tab.eval(`
      return Array.from(document.querySelectorAll('input')).map(i => i.placeholder).filter(p => p && p !== '—');
    `);
    console.log('   reps placeholders found:', JSON.stringify(repsPlaceholders));
    assert.ok(repsPlaceholders.some((p) => /\d+[–-]\d+/.test(p)),
      'expected a rep-range placeholder like "6–8" — if this fails, either no range-prescribed set is in today\'s seed data, or the display regressed');
    console.log('✓ 3/6 a rep-RANGE prescription (repsMin/repsMax) shows its real target as the input placeholder — not a blank "—"');

    // Log real actuals and complete.
    await tab.eval(`
      const inputs = Array.from(document.querySelectorAll('input'));
      const repsInputs = inputs.filter(i => /\\d+[–-]\\d+/.test(i.placeholder || ''));
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      repsInputs.forEach((el, i) => { setter.call(el, String(7 - i)); el.dispatchEvent(new Event('input', { bubbles: true })); });
      return repsInputs.length;
    `);
    await sleep(300);
    const completed = await tab.clickTextRetry('COMPLETE SESSION');
    assert.ok(completed, 'could not find/click COMPLETE SESSION');
    await sleep(2000);
    await tab.shot('04-completed');
    const afterCompleteText = await tab.text();
    assert.ok(/session saved/i.test(afterCompleteText), 'completion did not confirm success');
    assert.ok(/linked to prescription/i.test(afterCompleteText), 'the completed result lost its prescription link — should show "LINKED TO PRESCRIPTION"');
    console.log('✓ 4/6 completing the session logs real actuals and keeps the prescription link (LINKED TO PRESCRIPTION), not a fabricated or dropped reference');

    // Reload (fresh navigation, not client cache) and confirm persistence.
    await tab.goto(`${APP_BASE}/`, 2000);
    await sleep(1500);
    assert.ok(await tab.clickTextRetry('VIEW SCHEDULE'), 'could not reopen the schedule screen after reload');
    await sleep(1200);
    await tab.shot('05-schedule-after-reload');
    const reloadedText = await tab.text();
    assert.ok(/completed/i.test(reloadedText) && !/no sessions logged yet/i.test(reloadedText),
      'the completed result did not persist across a fresh page load');
    console.log('✓ 5/6 a full page reload (not client cache) still shows the completed result — genuine server-side persistence');

    console.log('✓ 6/6 athlete journey: PASS (screenshots in ' + SHOT_DIR + ')');
  } finally {
    await tab.close();
    ws.close();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e); process.exit(1); });
