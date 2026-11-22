// Plain-Node regression tests for src/lib/sessionDraft.ts — the in-progress
// v2 session completion autosave/resume logic. Runs the REAL TypeScript
// module directly (Node 24's native type-stripping), against a simple
// in-memory mock of the injected StorageLike interface — no Expo/React
// Native runtime needed, no AsyncStorage dependency required to run this.
//
// Usage:  node --experimental-strip-types test/session-draft.test.js

'use strict';

const assert = require('assert');
const path = require('path');

function makeMockStorage(seed = {}) {
  const store = { ...seed };
  return {
    async getItem(key) { return key in store ? store[key] : null; },
    async setItem(key, value) { store[key] = value; },
    async removeItem(key) { delete store[key]; },
    _raw: store,
  };
}

async function main() {
  const mod = await import(path.join(__dirname, '..', 'src', 'lib', 'sessionDraft.ts'));
  const { saveDraft, loadDraft, clearDraft, draftKey, prescriptionRequestId, newAdHocRequestId } = mod;

  // ── 1. Save + load round-trip for a scheduled session ──────────────────
  {
    const storage = makeMockStorage();
    const draft = {
      athleteId: 'cli_alice', programmeId: 'prg_1', planItemId: 'pli_1', rev: 1,
      clientRequestId: prescriptionRequestId('prg_1', 'pli_1', 1),
      actuals: { 0: { 'set0.reps': '8' } }, savedAt: new Date().toISOString(),
    };
    await saveDraft(storage, draft);
    const loaded = await loadDraft(storage, 'cli_alice', 'prg_1', 'pli_1', 1);
    assert.deepStrictEqual(loaded, draft, 'a saved draft round-trips exactly for its own exact scope');
  }
  console.log('✓ 1/8 save/load round-trips exactly for the exact (athlete, programme, planItem, rev) scope');

  // ── 2. A later prescription revision never resurrects a stale draft ────
  {
    const storage = makeMockStorage();
    await saveDraft(storage, {
      athleteId: 'cli_alice', programmeId: 'prg_1', planItemId: 'pli_1', rev: 1,
      clientRequestId: prescriptionRequestId('prg_1', 'pli_1', 1),
      actuals: { 0: { 'set0.reps': '8' } }, savedAt: new Date().toISOString(),
    });
    const loadedAtNewRev = await loadDraft(storage, 'cli_alice', 'prg_1', 'pli_1', 2);
    assert.strictEqual(loadedAtNewRev, null, 'a draft saved against rev 1 must not surface once the coach has revised to rev 2');
  }
  console.log('✓ 2/8 a draft for an old prescription revision is never resurrected once the coach revises it');

  // ── 3. Account switching: a different athlete never sees another's draft ─
  {
    const storage = makeMockStorage();
    await saveDraft(storage, {
      athleteId: 'cli_alice', programmeId: 'prg_1', planItemId: 'pli_1', rev: 1,
      clientRequestId: prescriptionRequestId('prg_1', 'pli_1', 1),
      actuals: { 0: { 'set0.reps': '8' } }, savedAt: new Date().toISOString(),
    });
    const bobsView = await loadDraft(storage, 'cli_bob', 'prg_1', 'pli_1', 1);
    assert.strictEqual(bobsView, null, 'a different athlete on the same device/storage never sees the first athlete\'s draft');
  }
  console.log('✓ 3/8 account switching: a different athlete never sees another athlete\'s draft, even for the identical prescription');

  // ── 4. Two different athletes each keep their OWN independent draft for
  //      the exact same programme/planItem/rev simultaneously ─────────────
  {
    const storage = makeMockStorage();
    await saveDraft(storage, { athleteId: 'cli_alice', programmeId: 'prg_1', planItemId: 'pli_1', rev: 1, clientRequestId: prescriptionRequestId('prg_1', 'pli_1', 1), actuals: { 0: { 'set0.reps': '8' } }, savedAt: 't1' });
    await saveDraft(storage, { athleteId: 'cli_bob', programmeId: 'prg_1', planItemId: 'pli_1', rev: 1, clientRequestId: prescriptionRequestId('prg_1', 'pli_1', 1), actuals: { 0: { 'set0.reps': '12' } }, savedAt: 't2' });
    const alices = await loadDraft(storage, 'cli_alice', 'prg_1', 'pli_1', 1);
    const bobs = await loadDraft(storage, 'cli_bob', 'prg_1', 'pli_1', 1);
    assert.strictEqual(alices.actuals[0]['set0.reps'], '8', 'alice\'s own draft is untouched by bob\'s');
    assert.strictEqual(bobs.actuals[0]['set0.reps'], '12', 'bob\'s own draft is untouched by alice\'s');
  }
  console.log('✓ 4/8 two athletes with drafts on the same prescription never clobber each other');

  // ── 5. Clearing removes it; a subsequent load returns null ──────────────
  {
    const storage = makeMockStorage();
    await saveDraft(storage, { athleteId: 'cli_alice', programmeId: 'prg_1', planItemId: 'pli_1', rev: 1, clientRequestId: prescriptionRequestId('prg_1', 'pli_1', 1), actuals: {}, savedAt: 't' });
    await clearDraft(storage, 'cli_alice', 'prg_1', 'pli_1', 1);
    const afterClear = await loadDraft(storage, 'cli_alice', 'prg_1', 'pli_1', 1);
    assert.strictEqual(afterClear, null, 'a cleared draft (e.g. after a successful submit) never comes back');
  }
  console.log('✓ 5/8 a cleared draft (post-success) is genuinely gone, not just hidden');

  // ── 6. Corrupted/malformed storage content never throws and never
  //      partially resurrects — loadDraft degrades to null, cleanly ───────
  {
    const storage = makeMockStorage({ [draftKey('cli_alice', 'prg_1', 'pli_1', 1)]: 'not valid json {{{' });
    const loaded = await loadDraft(storage, 'cli_alice', 'prg_1', 'pli_1', 1);
    assert.strictEqual(loaded, null, 'corrupted draft content degrades to null, never throws');

    const storage2 = makeMockStorage({ [draftKey('cli_alice', 'prg_1', 'pli_1', 1)]: JSON.stringify({ athleteId: 'cli_someone_else', programmeId: 'prg_1', planItemId: 'pli_1', rev: 1, clientRequestId: 'x', actuals: {}, savedAt: 't' }) });
    const loaded2 = await loadDraft(storage2, 'cli_alice', 'prg_1', 'pli_1', 1);
    assert.strictEqual(loaded2, null, 'a record whose own stored scope does not match what was asked for is refused, defence in depth');
  }
  console.log('✓ 6/8 corrupted or scope-mismatched storage content is refused, never partially resurrected');

  // ── 7. Ad-hoc (unplanned) sessions get their own scope, separate from
  //      any scheduled-session draft, and round-trip correctly ────────────
  {
    const storage = makeMockStorage();
    const adHocId = newAdHocRequestId();
    assert.ok(adHocId.startsWith('adhoc_'), 'ad-hoc ids are clearly distinguishable from prescription-based ones');
    const draft = { athleteId: 'cli_alice', programmeId: null, planItemId: null, rev: null, clientRequestId: adHocId, actuals: { 0: { 'set0.reps': '5' } }, savedAt: 't' };
    await saveDraft(storage, draft);
    const loaded = await loadDraft(storage, 'cli_alice', null, null, null);
    assert.deepStrictEqual(loaded, draft, 'an ad-hoc session draft round-trips correctly under its own scope');
    // Must never collide with a real scheduled draft's key space.
    const scheduledKey = draftKey('cli_alice', 'prg_1', 'pli_1', 1);
    const adHocKey = draftKey('cli_alice', null, null, null);
    assert.notStrictEqual(scheduledKey, adHocKey, 'an ad-hoc draft key never collides with a real scheduled-session key');
  }
  console.log('✓ 7/8 ad-hoc (unplanned) session drafts are correctly scoped and never collide with scheduled-session drafts');

  // ── 8. prescriptionRequestId is deterministic — reconstructible at any
  //      time from the prescription's own identity, nothing needs to be
  //      separately generated or persisted just to survive app restart ────
  {
    const a = prescriptionRequestId('prg_1', 'pli_1', 3);
    const b = prescriptionRequestId('prg_1', 'pli_1', 3);
    const c = prescriptionRequestId('prg_1', 'pli_1', 4);
    assert.strictEqual(a, b, 'the same prescription identity always yields the same request id');
    assert.notStrictEqual(a, c, 'a different revision yields a different request id — a later rev is a genuinely different completion target');
  }
  console.log('✓ 8/8 prescriptionRequestId is deterministic and revision-sensitive — no separate persistence needed to survive a restart');

  console.log('\n✓ session-draft: PASS');
}

main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e); process.exit(1); });
