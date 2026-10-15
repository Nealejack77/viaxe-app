import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifySessionExpired } from './session';

// EXPO_PUBLIC_* env vars are inlined by Metro at start/build time (no
// app.config.js needed, standard since Expo SDK 49) — read from a
// gitignored .env.local (see .gitignore: `.env*.local`) for local testing
// against a non-production backend. Unset in every real build, so
// production always gets the hardcoded default below.
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://www.viaxe.co.uk/api';

const DEFAULT_TIMEOUT_MS = 15_000;

export async function getSessionToken(): Promise<string | null> {
  return AsyncStorage.getItem('@viaxe_token');
}

export async function hasRealSession(): Promise<boolean> {
  const token = await getSessionToken();
  return Boolean(token && token !== 'demo');
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  options: { auth?: boolean; timeoutMs?: number } = {},
): Promise<Response> {
  const { auth = true, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const token = auth ? await getSessionToken() : null;
  const headers = new Headers(init.headers);

  if (auth && token && token !== 'demo') {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path.startsWith('http') ? path : `${API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (auth && token && token !== 'demo' && response.status === 401) {
      await notifySessionExpired();
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}
