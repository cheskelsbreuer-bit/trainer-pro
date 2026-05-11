// Tiny wrapper around the Python backend at VITE_API_URL.
// Adds the Supabase access token automatically. Returns parsed JSON.

import { supabase } from './supabase';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Cold-start safety net. Render free-tier workers sleep after 15 min idle;
// the first request takes 30-60s to wake them, which exceeds the browser's
// default fetch timeout and surfaces as "TypeError: Failed to fetch". We
// retry on those failures plus on 502/503/504 (worker booting / proxy gave
// up) — all signs of a cold start, not a real error.
const COLD_START_STATUSES = new Set([502, 503, 504]);

async function fetchWithColdStartRetry(
  url: string,
  init: RequestInit,
  attempts = 3,
): Promise<Response> {
  let lastErr: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (!COLD_START_STATUSES.has(res.status)) return res;
      lastErr = new Error(`Backend returned ${res.status} (cold start, retrying)`);
    } catch (e) {
      lastErr = e as Error;
    }
    if (i < attempts - 1) {
      // Backoff: 4s, 12s. Total budget ~16s + initial fetch time.
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
    }
  }
  throw lastErr ?? new Error('Unknown fetch error');
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE) throw new ApiError('Backend URL not configured (VITE_API_URL)', 0);

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = `${BASE}${path.startsWith('/') ? path : '/' + path}`;
  let res: Response;
  try {
    res = await fetchWithColdStartRetry(url, { ...init, headers });
  } catch (e) {
    const msg = (e as Error).message;
    // Render free-tier sleep is the most common cause — make the message
    // actionable instead of a vague "Failed to fetch".
    if (/Failed to fetch|NetworkError|cold start/i.test(msg)) {
      throw new ApiError(
        'Backend is starting up (Render free-tier worker just woke up — first request takes 30-60s). Please retry in a few seconds.',
        0,
      );
    }
    throw new ApiError(`Network error: ${msg}`, 0);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      // ignore
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as T;
}

export const apiBaseUrl = BASE;
