// One quiet line at the bottom of the screen, for things that finished
// after the screen that started them had already closed.
//
// The pattern it exists for: she records a payment, the modal shuts, and
// only THEN does the receipt go out — by text, by email, or not at all.
// Without this, the answer to "did the parent get it?" was nowhere.
//
// Deliberately tiny: no queue, no stacking. A newer notice replaces an
// older one, because two lines of status at once is noise, and it clears
// itself after a few seconds so it never has to be dismissed.

import { useEffect, useState } from 'react';

export type NoticeTone = 'good' | 'plain' | 'bad';
export interface Notice {
  text: string;
  tone: NoticeTone;
  /** Lets React tell two identical texts apart so the timer restarts. */
  at: number;
}

let current: Notice | null = null;
const listeners = new Set<(n: Notice | null) => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

const LIFETIME_MS = 5200;

export function notify(text: string, tone: NoticeTone = 'plain') {
  current = { text, tone, at: Date.now() };
  for (const l of listeners) l(current);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    for (const l of listeners) l(null);
  }, LIFETIME_MS);
}

export function useNotice(): Notice | null {
  const [n, setN] = useState<Notice | null>(current);
  useEffect(() => {
    listeners.add(setN);
    return () => {
      listeners.delete(setN);
    };
  }, []);
  return n;
}
