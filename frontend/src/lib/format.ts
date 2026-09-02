// Formatting helpers used across the UI. Keep these dumb and pure.

export function formatMoney(
  amount: number | null | undefined,
  currency = 'USD',
  locale = 'en-US',
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// "Tue, Jan 14 at 9:00 AM"
export function formatSessionWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// "in 2 hours" / "3 days ago"
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const diffMs = d - Date.now();
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60_000);
  const hr = Math.round(abs / 3_600_000);
  const day = Math.round(abs / 86_400_000);
  const future = diffMs > 0;
  if (min < 1) return 'just now';
  if (min < 60) return future ? `in ${min}m` : `${min}m ago`;
  if (hr < 24) return future ? `in ${hr}h` : `${hr}h ago`;
  return future ? `in ${day}d` : `${day}d ago`;
}

/** Whole days since something that has ALREADY happened. Never negative.
 *
 *  A device clock a few minutes slow makes a server timestamp look like
 *  the future, and `Math.floor(gap / a day)` then returns -1. That is how
 *  the admin page came to say a trainer was last seen "-1 days ago".
 *  Nothing in the past is ever in the future, so a negative gap is clock
 *  skew and counts as zero. */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

/** How long ago something happened, in words, for a timestamp that can
 *  only be in the past — last seen, invite sent, last billed. Unlike
 *  formatRelative it never says "in 3h": a past event that reads as the
 *  future is a slow clock, not a prediction. */
export function formatSince(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const gap = Math.max(0, Date.now() - then);
  const min = Math.floor(gap / 60_000);
  if (min < 2) return 'just now';
  if (min < 60) return `${min} minutes ago`;
  const hr = Math.floor(gap / 3_600_000);
  if (hr < 24) return hr === 1 ? 'an hour ago' : `${hr} hours ago`;
  const day = Math.floor(gap / 86_400_000);
  if (day === 1) return 'yesterday';
  if (day < 30) return `${day} days ago`;
  const month = Math.floor(day / 30);
  if (month === 1) return 'a month ago';
  if (month < 12) return `${month} months ago`;
  const year = Math.floor(day / 365);
  return year === 1 ? 'a year ago' : `${year} years ago`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
