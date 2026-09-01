// Redeeming a sign-in link BY HAND.
//
// A magic link normally works like this: you click it, Supabase checks the
// token, then bounces your browser to a "redirect_to" address. That last
// hop is the fragile part — Supabase only honours a redirect address that
// is on its allow-list, and anything else silently falls back to the
// project's Site URL. When one Supabase project serves two products, the
// loser lands on the OTHER product's front door, signed in, wondering what
// happened.
//
// The escape hatch: every one of those emails also prints the raw URL
// ("Or paste this URL into your browser"). That URL carries the token. We
// can take the token straight out of it and verify it from inside the app
// — no redirect, no allow-list, nothing to misconfigure.

import { supabase } from './supabase';

export type MagicLinkType =
  | 'magiclink'
  | 'email'
  | 'signup'
  | 'invite'
  | 'recovery'
  | 'email_change';

const TYPES: MagicLinkType[] = [
  'magiclink',
  'email',
  'signup',
  'invite',
  'recovery',
  'email_change',
];

export interface ParsedMagicLink {
  token: string;
  type: MagicLinkType;
}

/** Pull the token out of whatever they pasted: the whole URL, the query
 *  string on its own, or the bare token. Returns null if there's nothing
 *  token-shaped in there. */
export function parseMagicLink(input: string): ParsedMagicLink | null {
  const raw = (input || '').trim();
  if (!raw) return null;

  let token = '';
  let type: MagicLinkType | '' = '';

  // Anything with an = in it we treat as query-ish and read properly, so a
  // token containing characters that look like separators still survives.
  if (raw.includes('=')) {
    const qs = raw.slice(raw.indexOf('?') + 1).split('#')[0];
    const params = new URLSearchParams(qs);
    token = (params.get('token_hash') || params.get('token') || '').trim();
    const t = (params.get('type') || '').trim().toLowerCase();
    if ((TYPES as string[]).includes(t)) type = t as MagicLinkType;
  } else {
    token = raw;
  }

  if (!token) return null;
  // Supabase tokens are hex-ish and long. Anything short is a typo or a
  // half-copied link, and telling them so beats a server round-trip.
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;

  return { token, type: type || 'magiclink' };
}

/** Verify a pasted link. On success the session is live exactly as if they
 *  had clicked it — Supabase's client stores it and the app re-renders. */
export async function redeemMagicLink(input: string): Promise<{ error: string | null }> {
  const parsed = parseMagicLink(input);
  if (!parsed) {
    return {
      error:
        "That doesn't look like the sign-in link. Copy the whole long address from the email — the one under \"Or paste this URL into your browser\".",
    };
  }

  // If the email didn't say which kind of link it is, try the likely ones.
  const attempts: MagicLinkType[] =
    parsed.type === 'magiclink' ? ['magiclink', 'email', 'signup', 'invite'] : [parsed.type];

  let last = '';
  for (const type of attempts) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: parsed.token, type });
    if (!error) return { error: null };
    last = error.message;
    // A token that's genuinely used up or expired won't get better by
    // trying it as a different kind of link.
    if (/expired|already|invalid.*expired/i.test(error.message)) break;
  }

  if (/expired|not found|invalid/i.test(last)) {
    return {
      error:
        'That link is used up or expired. Send yourself a fresh one and paste it in — and paste it before clicking it, so nothing else can use it first.',
    };
  }
  return { error: last || 'Could not sign in with that link.' };
}
