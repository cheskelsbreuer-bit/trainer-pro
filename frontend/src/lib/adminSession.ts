// A magic-link sign-in trusts this browser for 7 days. We store the
// deadline in localStorage so closing the tab, rebooting, or letting the
// Supabase token quietly refresh doesn't kick the admin back to the
// sign-in form. Real auth still happens server-side against the email
// allow-list — this flag only says "this device proved itself recently."

const ADMIN_VERIFIED_UNTIL_KEY = 'admin_verified_until';
const ADMIN_VERIFY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function readAdminVerified(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = window.localStorage.getItem(ADMIN_VERIFIED_UNTIL_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() < ts;
}

export function writeAdminVerified() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    ADMIN_VERIFIED_UNTIL_KEY,
    String(Date.now() + ADMIN_VERIFY_TTL_MS),
  );
}

/** Set in this tab just before a sign-in link is emailed, so the link
 *  itself needs no ?verified=1 on it. A URL with no query string is far
 *  more likely to match a redirect allow-list, and this survives the
 *  round trip because the tab stays open while they check their mail. */
export const ADMIN_AWAITING_KEY = 'admin_awaiting_verify';
