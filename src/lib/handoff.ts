import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// One-time cross-origin login handoff.
//
// The onboarding flow runs on www.viaxe.co.uk and mints a valid client session
// there, but the app itself is served from a different origin
// (viaxe-app.vercel.app). localStorage is per-origin, so a plain redirect landed
// the freshly-onboarded client on the app logged OUT — the "completed signup but
// no usable app link" report.
//
// The onboarding page now appends the session token to the URL *fragment*
// (`#session=<token>`). A fragment is never sent to any server and never appears
// in the Referer header, and we strip it from the address bar the instant it is
// adopted so it is not left in shareable/bookmarkable URLs. The token is an
// ordinary revocable, expiring session token — the same one the app would have
// stored after a normal login — so this is a handoff, not a new trust boundary.
//
// Residual risk: the token lives in the browser history entry for the redirect
// until replaceState runs on load. A future hardening is a short-lived one-time
// handoff code exchanged for a session on first load; that needs a server
// endpoint and is tracked separately.

const TOKEN_KEY = '@viaxe_token';
const USERNAME_KEY = '@viaxe_username';

function readParam(hash: string, key: string): string | null {
  const m = hash.match(new RegExp('(?:^#|[#&])' + key + '=([^&]+)'));
  if (!m) return null;
  try { return decodeURIComponent(m[1]).trim() || null; }
  catch { return null; }
}

/**
 * If the current URL carries a `#session=` handoff, adopt it into storage and
 * strip it from the address bar. Web-only; a no-op everywhere else.
 * Returns true when a token was adopted.
 */
export async function adoptSessionFromUrl(): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  if (!hash.includes('session=')) return false;

  const token = readParam(hash, 'session');
  if (!token) return false;

  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    const username = readParam(hash, 'u');
    if (username) await AsyncStorage.setItem(USERNAME_KEY, username);
  } catch {
    return false;
  }

  // Remove the token from the URL so it is not left in history or shared.
  try {
    const clean = window.location.pathname + window.location.search;
    window.history.replaceState(null, '', clean || '/');
  } catch {}

  return true;
}
