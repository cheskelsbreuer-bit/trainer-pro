// Tiny wrapper around the Python backend at VITE_API_URL.
// Adds the Supabase access token automatically. Returns parsed JSON.

import { supabase } from './supabase';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
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
    res = await fetch(url, { ...init, headers });
  } catch (e) {
    throw new ApiError(`Network error: ${(e as Error).message}`, 0);
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
