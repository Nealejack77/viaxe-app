import AsyncStorage from '@react-native-async-storage/async-storage';

// Centralised "the session is dead" signal. Any authed API call that gets a 401
// should call notifySessionExpired(): it clears the stale token so the app can't
// keep riding a rejected session, then tells the root to show the Login screen.
// Without this, a token string that the server no longer accepts (expired TTL or
// invalidated by an auth change) leaves the app "logged in" but 401-ing on every
// request — macros, food search, food logging and messaging all silently fail.

let handler: (() => void) | null = null;

export function setSessionExpiredHandler(fn: (() => void) | null) {
  handler = fn;
}

let firing = false;

export async function notifySessionExpired(): Promise<void> {
  if (firing) return; // collapse the burst of parallel 401s into one logout
  firing = true;
  try {
    await AsyncStorage.multiRemove(['@viaxe_token', '@viaxe_username', '@viaxe_v2']);
  } catch {}
  try {
    handler?.();
  } finally {
    // Allow a fresh login to arm the next expiry cycle.
    setTimeout(() => { firing = false; }, 0);
  }
}
