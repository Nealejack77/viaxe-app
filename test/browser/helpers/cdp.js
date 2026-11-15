// A minimal, zero-dependency Chrome DevTools Protocol driver for the
// real-browser verification scripts in this directory. Requires a
// headless (or headed) Chrome already running with remote debugging, e.g.:
//
//   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
//     --headless=new --remote-debugging-port=9521 --user-data-dir=/tmp/viaxe-cdp-profile
//
// Nothing in this file is specific to viaxe-os — it is a generic CDP
// tab-driving helper (navigate, eval, screenshot, click-by-visible-text).
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

let msgId = 0;
function cdp(ws, method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const timer = setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error(`${method}: timed out`)); }, 30000);
    const onMsg = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.id !== id) return;
      clearTimeout(timer); ws.removeEventListener('message', onMsg);
      m.error ? reject(new Error(`${method}: ${JSON.stringify(m.error)}`)) : resolve(m.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function httpJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => { let b = ''; res.on('data', (d) => b += d); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
  });
}

async function connect(debugPort) {
  const wsUrl = (await httpJson(`http://127.0.0.1:${debugPort}/json/version`)).webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  return ws;
}

async function newTab(ws, { width = 420, height = 900, mobile = true, shotDir } = {}) {
  const { targetId } = await cdp(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp(ws, 'Target.attachToTarget', { targetId, flatten: true });
  await cdp(ws, 'Page.enable', {}, sessionId);
  await cdp(ws, 'Runtime.enable', {}, sessionId);
  await cdp(ws, 'Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile }, sessionId);
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  return {
    targetId, sessionId, width, height,
    async goto(url, settle = 1000) { await cdp(ws, 'Page.navigate', { url }, sessionId); await sleep(settle); },
    async eval(expr) {
      const r = await cdp(ws, 'Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true }, sessionId);
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails.text));
      return r.result.value;
    },
    async shot(name) {
      if (!shotDir) throw new Error('newTab({ shotDir }) is required to take screenshots');
      const { data } = await cdp(ws, 'Page.captureScreenshot', { format: 'png' }, sessionId);
      const file = path.join(shotDir, `${name}.png`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      return file;
    },
    async clickAt(x, y) {
      await cdp(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }, sessionId);
      await cdp(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }, sessionId);
    },
    // Finds the LEAF element (no children) whose (case-insensitive) text
    // matches, walks up to the nearest ancestor with a bound onclick
    // handler, and calls .click() on it. This is the strategy proven
    // reliable across this project's CSS (several classes apply
    // text-transform:uppercase, so the underlying DOM text is NOT what's
    // visually rendered — always match case-insensitively, never assume
    // the rendered capitalisation is the real string).
    async clickText(text, { exact = true } = {}) {
      return this.eval(`
        const TEXT = ${JSON.stringify(text)}.toLowerCase();
        const exactMatch = ${exact};
        const norm = (s) => s.trim().toLowerCase();
        const match = (el) => exactMatch ? norm(el.textContent) === TEXT : norm(el.textContent).includes(TEXT);
        const leaf = Array.from(document.querySelectorAll('*')).find(el => match(el) && el.children.length === 0);
        let node = leaf;
        while (node && typeof node.onclick !== 'function') node = node.parentElement;
        if (!node) return false;
        node.click();
        return true;
      `);
    },
    // Fallback for elements whose click handler isn't a plain onclick prop
    // (e.g. attached via addEventListener) — dispatches a real mouse event
    // at the smallest matching element's centre instead of calling .click().
    async clickTextAt(text, { exact = true } = {}) {
      const rect = await this.eval(`
        const TEXT = ${JSON.stringify(text)}.toLowerCase();
        const exactMatch = ${exact};
        const norm = (s) => s.trim().toLowerCase();
        const match = (el) => exactMatch ? norm(el.textContent) === TEXT : norm(el.textContent).includes(TEXT);
        const candidates = Array.from(document.querySelectorAll('*')).filter(match)
          .map(el => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 0 && r.height > 0);
        candidates.sort((a, b) => (a.r.width * a.r.height) - (b.r.width * b.r.height));
        const c = candidates[0];
        if (!c) return null;
        return { x: c.r.x + c.r.width / 2, y: c.r.y + c.r.height / 2 };
      `);
      if (!rect) return false;
      await this.clickAt(rect.x, rect.y);
      return true;
    },
    /** Retries clickText (falling back to a real coordinate click) for up
     * to ~`attempts` tries — covers the window before a screen has finished
     * its post-navigation render. */
    async clickTextRetry(text, opts = {}, attempts = 6, delayMs = 400) {
      for (let i = 0; i < attempts; i++) {
        if (await this.clickText(text, opts)) return true;
        await sleep(delayMs);
      }
      return this.clickTextAt(text, opts);
    },
    async fillInput(match, value) {
      return this.eval(`
        const inputs = Array.from(document.querySelectorAll('input'));
        const el = inputs.find(${match});
        if (!el) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      `);
    },
    async text() { return this.eval('return document.body.innerText;'); },
    async close() { await cdp(ws, 'Target.closeTarget', { targetId }).catch(() => {}); },
  };
}

module.exports = { cdp, sleep, httpJson, connect, newTab };
