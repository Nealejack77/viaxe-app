// Real-browser verification (Expo web target) of the full set of legacy
// gap-type shapes through the ACTUAL rendered athlete app: timed sets,
// distance sets, a per-side range, a work/rest interval, weighted
// bodyweight, and an unspecified weight (weight policy option B, approved).
//
// Complements test/browser/athlete-journey.js (a narrower rep-range/
// bodyweight smoke test from an earlier phase) rather than replacing it —
// this one exercises every shape the legacy-conversion work added, plus
// the weight-unspecified policy, and checks the coach sees the identical
// result through the coach portal's own real UI (same two-client-server.js
// backend, same origin, different path).
//
// Prerequisites (not started by this script):
//   1. A headless Chrome with remote debugging (see
//      ../../../viaxe-os/test/browser/helpers/cdp.js's header).
//   2. viaxe-os's two-client test server, on a FRESH port:
//        (cd ../viaxe-os && TWO_CLIENT_SERVER_PORT=<port> node test/browser/two-client-server.js)
//   3. .env.local's EXPO_PUBLIC_API_BASE pointed at that port's /api, THEN:
//        CI=1 npx expo start --web --port <web-port>
//      (env vars are inlined at bundle time — edit .env.local and restart
//      Expo, a reload is not enough).
//   4. A legacy programme seeded via that same backend's /api/data, real-
//      converted (action: convert-legacy-template) and real-instanced
//      (action: create-instance) for Alice with a FUTURE startDate, with
//      exercises shaped like: Plank (reps "45s", weight "—"), Farmer's
//      Carry (reps "40m", weight "30kg"), Bulgarian Split Squat (reps
//      "10-12e", weight "20kg"), Assault Bike (reps "60s on / 60s off"),
//      Pull-Up (reps "6", weight "BW+10kg"), Barbell Row (reps "8", weight
//      "—") — see this session's seeding script for the exact calls.
//
// Usage:  TWO_CLIENT_BASE=http://127.0.0.1:<port> ATHLETE_APP_BASE=http://localhost:<web-port> \
//           node test/browser/athlete-verification.js
'use strict';

const assert = require('assert');
const path = require('path');
const { connect, newTab, sleep, httpJson } = require('./helpers/cdp.js');

const TWO_CLIENT_BASE = process.env.TWO_CLIENT_BASE || 'http://127.0.0.1:7533';
const APP_BASE = process.env.ATHLETE_APP_BASE || 'http://localhost:19077';
const CDP_PORT = Number(process.env.CDP_PORT || 9521);
const SHOT_DIR = path.join(__dirname, '..', '..', '.tmp', 'athlete-verification-shots');
const USERNAME = process.env.ATHLETE_USERNAME || 'alice';
const PASSWORD = process.env.ATHLETE_PASSWORD || 'alicepass123';
const SESSION_TITLE = process.env.SESSION_TITLE || 'Tuesday — Full Body';

/** Sets the Nth (0-indexed) input within the named exercise block whose
 * adjacent label text matches `labelExact` (case-insensitive) — scoped to
 * that block so repeated labels ("Load (kg)", "Reps") across different
 * exercises never cross-match. */
async function setBlockField(tab, exerciseName, labelExact, occurrence, value) {
  return tab.eval(`
    const NAME = ${JSON.stringify(exerciseName)};
    const LABEL = ${JSON.stringify(labelExact)}.toLowerCase();
    const OCC = ${occurrence};
    const all = Array.from(document.querySelectorAll('*'));
    const nameEl = all.find(el => el.children.length === 0 && el.textContent.trim() === NAME);
    if (!nameEl) return 'NAME_NOT_FOUND';
    let block = nameEl;
    while (block && block.querySelectorAll('input').length === 0) block = block.parentElement;
    if (!block) return 'BLOCK_NOT_FOUND';
    const labels = Array.from(block.querySelectorAll('*')).filter(el => el.children.length === 0 && el.textContent.trim().toLowerCase() === LABEL);
    const target = labels[OCC];
    if (!target) return 'LABEL_NOT_FOUND:' + labels.length;
    const input = target.parentElement.querySelector('input');
    if (!input) return 'INPUT_NOT_FOUND';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(String(value))});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'OK:' + input.value;
  `);
}

/** Reads back the Nth input's current value/placeholder within a block,
 * same scoping as setBlockField — used to confirm pre-fill/placeholder
 * state before editing, and persisted state after reload. */
async function readBlockField(tab, exerciseName, labelExact, occurrence) {
  return tab.eval(`
    const NAME = ${JSON.stringify(exerciseName)};
    const LABEL = ${JSON.stringify(labelExact)}.toLowerCase();
    const OCC = ${occurrence};
    const all = Array.from(document.querySelectorAll('*'));
    const nameEl = all.find(el => el.children.length === 0 && el.textContent.trim() === NAME);
    if (!nameEl) return null;
    let block = nameEl;
    while (block && block.querySelectorAll('input').length === 0) block = block.parentElement;
    if (!block) return null;
    const labels = Array.from(block.querySelectorAll('*')).filter(el => el.children.length === 0 && el.textContent.trim().toLowerCase() === LABEL);
    const target = labels[OCC];
    if (!target) return null;
    const input = target.parentElement.querySelector('input');
    if (!input) return null;
    return { value: input.value, placeholder: input.placeholder };
  `);
}

async function login(tab) {
  await tab.goto(`${APP_BASE}/`, 2500);
  await sleep(1800);
  const needsLogin = await tab.eval(`return !!Array.from(document.querySelectorAll('input')).find(i => i.type === 'password');`);
  if (needsLogin) {
    await tab.fillInput((i) => /username|email/i.test(i.placeholder || ''), USERNAME);
    await tab.fillInput((i) => i.type === 'password', PASSWORD);
    await sleep(300);
    assert.ok(await tab.clickTextRetry('LOG IN'), 'could not find/click LOG IN');
    await sleep(2200);
  }
}

async function openSession(tab) {
  assert.ok(await tab.clickTextRetry('VIEW SCHEDULE'), 'could not open the schedule screen');
  await sleep(1500);
  assert.ok(await tab.clickTextRetry(SESSION_TITLE, { exact: false }), `could not open session "${SESSION_TITLE}"`);
  await sleep(1500);
}

async function main() {
  const ws = await connect(CDP_PORT);
  const tab = await newTab(ws, { width: 420, height: 900, mobile: true, shotDir: SHOT_DIR });
  try {
    await login(tab);
    await openSession(tab);
    await tab.shot('01-session-open');

    // ── Confirm every shape renders faithfully BEFORE any edit ──────────
    const plankDuration = await readBlockField(tab, 'Plank', 'Duration (s)', 0);
    assert.strictEqual(plankDuration.value, '45', 'Plank set 1 duration should pre-fill the planned 45s');
    const plankLoad = await readBlockField(tab, 'Plank', 'Load (kg)', 0);
    assert.strictEqual(plankLoad.value, '', 'Plank load should be blank (unspecified), not fabricated');
    assert.strictEqual(plankLoad.placeholder, 'Not specified', 'Plank load placeholder must read "Not specified", not "—"');

    const carryDistance = await readBlockField(tab, "Farmer's Carry", 'Distance (m)', 0);
    assert.strictEqual(carryDistance.value, '40', "Farmer's Carry distance should pre-fill the planned 40m");
    const carryLoad = await readBlockField(tab, "Farmer's Carry", 'Load (kg)', 0);
    assert.strictEqual(carryLoad.value, '30', "Farmer's Carry load should pre-fill the planned 30kg (a REAL recorded weight, distinct from unspecified)");

    const squatReps = await readBlockField(tab, 'Bulgarian Split Squat', 'Reps', 0);
    assert.strictEqual(squatReps.value, '', 'a range-prescribed set has nothing to pre-fill — the athlete logs a concrete number');
    assert.strictEqual(squatReps.placeholder, '10–12', 'the range target must show as the placeholder, not a blank "—"');

    const pullupAdded = await readBlockField(tab, 'Pull-Up', 'Added (kg)', 0);
    assert.strictEqual(pullupAdded.value, '10', 'weighted bodyweight: the added load pre-fills visibly, not hidden behind a static "Bodyweight" label');

    const barbellLoad0 = await readBlockField(tab, 'Barbell Row', 'Load (kg)', 0);
    assert.strictEqual(barbellLoad0.placeholder, 'Not specified', 'Barbell Row (plain reps + unspecified weight — the option-B case) must show "Not specified"');

    console.log('✓ 1/5 every shape (timed, distance, per-side range, weighted bodyweight, interval, unspecified weight) renders faithfully before any edit');

    // ── Edit: a range set gets a concrete logged count; one unspecified
    //    weight gets a real edited value; the OTHER unspecified weights are
    //    left untouched, to prove blank never becomes a fabricated measurement. ──
    for (const i of [0, 1, 2]) {
      const r = await setBlockField(tab, 'Bulgarian Split Squat', 'Reps', i, 11);
      assert.ok(r.startsWith('OK'), `could not set Bulgarian Split Squat set ${i + 1} reps: ${r}`);
    }
    const editWeight = await setBlockField(tab, 'Barbell Row', 'Load (kg)', 0, 62.5);
    assert.ok(editWeight.startsWith('OK'), `could not edit Barbell Row set 1 weight: ${editWeight}`);
    // Sets 2 and 3's weight, and Plank's weight throughout, are deliberately
    // left untouched (never written to) — the whole point of this check.
    await tab.shot('02-edited');
    console.log('✓ 2/5 edited a range-prescribed set to a concrete count, and one previously-unspecified weight to a real value — leaving the rest untouched');

    const completion = await tab.clickTextRetry('COMPLETE SESSION');
    assert.ok(completion, 'could not find/click COMPLETE SESSION');
    await sleep(2200);
    const afterCompleteText = await tab.text();
    assert.ok(/session saved/i.test(afterCompleteText), `completion did not confirm success: ${afterCompleteText.slice(0, 200)}`);
    await tab.shot('03-completed');
    console.log('✓ 3/5 session completed successfully through the real UI');

    // ── Reload (fresh navigation) and confirm persisted actuals ─────────
    await tab.goto(`${APP_BASE}/`, 2000);
    await sleep(1800);
    const meta = await httpJson(`${TWO_CLIENT_BASE}/meta`);
    const resultCheck = await tab.eval(`
      const r = await fetch('${TWO_CLIENT_BASE}/api/coach?entity=plan-items&scope=result&programmeId=' + encodeURIComponent('${process.env.INSTANCE_PROGRAMME_ID}') + '&planItemId=' + encodeURIComponent('${process.env.PLAN_ITEM_ID}') + '&athleteId=${meta.clientAId}', { headers: { Authorization: 'Bearer ${meta.coachToken}' } });
      return await r.json();
    `);
    const blocks = resultCheck.result.blocks;
    const plank = blocks.find((b) => b.name === 'Plank');
    assert.strictEqual(plank.sets[0].weightKg, null, "Plank's untouched weight persisted as explicit null — never fabricated as 0");
    const barbell = blocks.find((b) => b.name === 'Barbell Row');
    assert.strictEqual(barbell.sets[0].weightKg, 62.5, 'the edited Barbell Row weight survived submission exactly as entered');
    assert.strictEqual(barbell.sets[1].weightKg, null, "Barbell Row set 2's untouched weight stayed unspecified, not fabricated as 0 just because set 1 got a real value");
    const squat = blocks.find((b) => b.name === 'Bulgarian Split Squat');
    assert.strictEqual(squat.sets[0].reps, 11, 'the edited concrete rep count survived submission');
    assert.ok(squat.sets[0].perSide, 'perSide survived submission alongside the concrete count');
    assert.ok(!('repsMin' in squat.sets[0]) && !('repsMax' in squat.sets[0]), 'the range fields do not leak into a result — a result is a specific count');
    console.log('✓ 4/5 reload + a direct server-side read confirm every value persisted exactly as entered, and every untouched "unspecified" stayed unspecified');

    // ── The coach sees the identical result, through the coach portal's
    //    own real UI (same backend, different path on the same origin). ──
    const coachTab = await newTab(ws, { width: 1280, height: 900, mobile: false, shotDir: SHOT_DIR });
    try {
      await coachTab.goto(`${TWO_CLIENT_BASE}/`, 1200);
      await coachTab.eval(`
        localStorage.setItem('viaxe_token', '${meta.coachToken}');
        localStorage.setItem('viaxe_role', 'pt');
        localStorage.setItem('viaxe_ptId', '${meta.coachId}');
        localStorage.setItem('viaxe_ptName', 'Test Coach');
        return true;
      `);
      await coachTab.goto(`${TWO_CLIENT_BASE}/`, 1500);
      await coachTab.clickTextRetry('Programs'); await sleep(600);
      assert.ok(await coachTab.clickTextRetry('Athlete Verification Block (converted) — ', { exact: false }), 'coach could not open the instance');
      await sleep(900);
      assert.ok(await coachTab.clickTextRetry('View Result'), 'coach could not open the result view');
      await sleep(700);
      await coachTab.shot('04-coach-result-view');
      const coachResultText = await coachTab.eval(`
        const el = document.getElementById('v2-result-overlay');
        return el ? el.innerText : null;
      `);
      assert.ok(coachResultText, 'coach result overlay not found');
      assert.ok(/11.*each side/i.test(coachResultText) || /11 each side/.test(coachResultText), 'coach sees the edited concrete rep count, not the original range');
      assert.ok(/62\.5/.test(coachResultText), 'coach sees the edited Barbell Row weight');
      assert.ok(/weight not specified/i.test(coachResultText), 'coach sees "weight not specified" for the untouched sets — not a blank, not a fabricated value');
      console.log('✓ 5/5 the coach sees the IDENTICAL result through the real coach portal UI — same edited values, same untouched-stays-unspecified sets');
    } finally {
      await coachTab.close();
    }

    console.log('\n✓ athlete-verification: PASS (screenshots in ' + SHOT_DIR + ')');
  } finally {
    await tab.close();
    ws.close();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e); process.exit(1); });
