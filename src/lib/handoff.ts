import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from './api';

// One-time cross-origin login handoff.
//
// The marketing/login site (www.viaxe.co.uk) can't share localStorage with the
// app (viaxe-app.vercel.app) — they're different origins. Instead of placing a
// session token in the URL, the marketing side mints a SHORT-LIVED, SINGLE-USE
// code (#code=…) via /api/auth?action=create-handoff, and the app exchanges it
// here for its own fresh session (action=exchange-handoff). The code is claimed
// atomically server-side and expires in two minutes, so nothing reusable is left
// in history or the referrer, and no bearer token ever travels in a URL.

const TOKEN_KEY = '@viaxe_token';

function readParam(hash: string, key: string): string | null {
  const m = hash.match(new RegExp('(?:^#|[#&])' + key + '=([^&]+)'));
  if (!m) return null;
  try { return decodeURIComponent(m[1]).trim() || null; }
  catch { return null; }
}

function stripHash(): void {
  try {
    const clean = window.location.pathname + window.location.search;
    window.history.replaceState(null, '', clean || '/');
  } catch {}
}

/**
 * If the URL carries a `#code=` handoff, exchange it for a session and store the
 * token. Web-only; a no-op on native and when no code is present. Returns true
 * when a session was adopted.
 */
export async function adoptSessionFromUrl(): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const code = readParam(window.location.hash || '', 'code');
  if (!code) return false;

  // Drop the code from the address bar immediately — it's single-use regardless.
  stripHash();

  try {
    const r = await fetch(`${API_BASE}/auth?action=exchange-handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!r.ok) return false;
    const data = await r.json();
    if (!data || !data.token) return false;
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    return true;
  } catch {
    return false;
  }
}
