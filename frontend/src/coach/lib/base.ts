// Where is the coach app mounted? '' when it IS the app (mounted at
// the site root), '/coach-preview' in the preview shell. Provided by
// CoachApp via context — guessing from the URL breaks under both splat
// mounts (relative links resolve against the current subpage) and root
// mounts (there's no splat to strip). Build links as `${base}/clients`;
// for the home link use `base || '/'`.
import { createContext, useContext } from 'react';

export const CoachBaseContext = createContext('');

export function useCoachBase(): string {
  return useContext(CoachBaseContext);
}
