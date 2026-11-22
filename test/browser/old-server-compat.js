// Real-browser verification that an UPDATED athlete app still works
// against an OLDER (pre-idempotency) viaxe-os server — the exact situation
// during a deployment window where the app has shipped but the server
// hasn't yet, or a server rollback while the app stays current.
//
// Without this fallback, the old server's strict schema validator rejects
// clientRequestId outright as an unknown field, and EVERY session
// completion fails — not a partial degradation, a hard outage for every
// athlete. src/lib/scheduleV2.ts's completeV2Session() detects this exact
// failure shape and retries once without clientRequestId (no duplicate
// protection against that older server, which has none anyway — but
// completion keeps working).
//
// Prerequisites (not started by this script):
//   1. A headless Chrome with remote debugging.
//   2. viaxe-os's two-client test server, but running the PRE-idempotency
//      version of api/_lib/sessions-v2-write.js — e.g.:
//        cd ../viaxe-os
//        git log --oneline -- api/_lib/sessions-v2-write.js   # find the commit before "Phase 1C: server-enforced idempotency..."
//        git show <that commit>:api/_lib/sessions-v2-write.js > /tmp/old-write.js
//        cp api/_lib/sessions-v2-write.js /tmp/current-write-backup.js
//        cp /tmp/old-write.js api/_lib/sessions-v2-write.js
//        node test/browser/two-client-server.js
//        # afterward: cp /tmp/current-write-backup.js api/_lib/sessions-v2-write.js
//   3. A real client instance for Alice with a FUTURE scheduled session
//      (see session-persistence.js's header for the exact curl command).
//   4. This app pointed at it and running on web:
//        EXPO_PUBLIC_API_BASE=http://localhost:4210/api CI=1 \
//          ./node_modules/.bin/expo start --web --port 19010
//      IMPORTANT: Metro's on-disk/temp caches have been observed to serve a
//      stale bundle across restarts in this environment even with
//      --clear. If a change doesn't seem to take effect, also clear
//      node_modules/.cache, .expo, and `$TMPDIR`'s metro-cache /
//      metro-file-map-* directories before restarting, and double-check no
//      earlier `expo start` process is still bound to the port
//      (`lsof -ti:19010`) before assuming the new one is being hit.
//
// Usage:  node test/browser/old-server-compat.js
'use strict';

const assert = require('assert');
const path = require('path');
const { connect, newTab, sleep } = require('./helpers/cdp.js');

const APP_BASE = process.env.ATHLETE_APP_BASE || 'http://localhost:19010';
const CDP_PORT = Number(process.env.CDP_PORT || 9522);
const SHOT_DIR = path.join(__dirname, '..', '..', '.tmp', 'old-server-compat-shots');
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
      assert.ok(await tab.clickTextRetry('LOG IN'), 'could not find/click LOG IN');
      await sleep(2000);
    }

    assert.ok(await tab.clickTextRetry('VIEW SCHEDULE'), 'could not open the schedule screen');
    await sleep(1500);
    const scheduleText = await tab.text();
    const sessionTitleMatch = scheduleText.match(/SCHEDULED\s*\n([^\n]+)/);
    const sessionTitle = sessionTitleMatch ? sessionTitleMatch[1].trim() : null;
    assert.ok(sessionTitle, 'no scheduled session found — seed one first, see this file\'s header');
    assert.ok(await tab.clickTextRetry(sessionTitle), `could not open "${sessionTitle}"`);
    await sleep(1200);
    await tab.shot('01-session-opened');

    assert.ok(await tab.clickTextRetry('COMPLETE SESSION'), 'could not click COMPLETE SESSION');
    await sleep(2000);
    const afterText = await tab.text();
    await tab.shot('02-completed-against-old-server');
    assert.ok(/session saved/i.test(afterText),
      'completion against the OLD server must succeed via the automatic fallback, not fail with "result failed schemaVersion 2 validation"');
    assert.ok(/linked to prescription/i.test(afterText), 'the prescription link must still be preserved even via the fallback path');

    console.log('✓ a new app completing a session against an OLD (pre-idempotency) server succeeds via the automatic clientRequestId fallback, with the prescription link intact');
    console.log('\n✓ old-server-compat: PASS (screenshots in ' + SHOT_DIR + ')');
  } finally {
    await tab.close();
    ws.close();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e); process.exit(1); });
