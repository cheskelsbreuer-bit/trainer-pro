// Demo-mode flag + context. Kept import-free so any module can use it
// without creating dependency cycles.

import { createContext, useContext, type ReactNode } from 'react';

export const DemoContext = createContext(false);
export function useDemo(): boolean {
  return useContext(DemoContext);
}

const DEMO_FLAG_KEY = 'tp-demo';

// sessionStorage on purpose: the demo lasts for the tab it was opened in
// and evaporates after — so someone who later signs up for real is never
// stuck looking at sample kids.
export function isDemoActive(): boolean {
  try {
    return window.sessionStorage.getItem(DEMO_FLAG_KEY) === 'babysitting';
  } catch {
    return false;
  }
}
export function setDemoActive(on: boolean): void {
  try {
    if (on) window.sessionStorage.setItem(DEMO_FLAG_KEY, 'babysitting');
    else window.sessionStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    /* ignore */
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  return <DemoContext.Provider value={true}>{children}</DemoContext.Provider>;
}
