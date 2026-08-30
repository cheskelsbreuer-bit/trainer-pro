// The words the app uses for the children. A day camp says "campers",
// a daycare says "children", a babysitter says "kids" — one setting,
// read everywhere instead of hard-coded strings.

import { useBabysittingConfig, DEFAULT_SETTINGS } from './config';

export interface Words {
  /** "kid" */ one: string;
  /** "kids" */ many: string;
  /** "Kid" */ One: string;
  /** "Kids" */ Many: string;
  /** 1 → "1 kid", 3 → "3 kids" */ count: (n: number) => string;
}

function cap(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export function wordsFrom(one: string | undefined, many: string | undefined): Words {
  const o = (one || DEFAULT_SETTINGS.kidWord).trim();
  const m = (many || DEFAULT_SETTINGS.kidWordPlural).trim();
  return {
    one: o,
    many: m,
    One: cap(o),
    Many: cap(m),
    count: (n: number) => `${n} ${n === 1 ? o : m}`,
  };
}

export function useWords(): Words {
  const cfg = useBabysittingConfig();
  return wordsFrom(cfg.data?.settings.kidWord, cfg.data?.settings.kidWordPlural);
}
