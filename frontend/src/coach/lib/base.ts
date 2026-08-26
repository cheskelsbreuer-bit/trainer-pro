// Where is the coach app mounted? ('/coach-preview' today; wherever the
// templates flip it tomorrow.) Under a splat route, RELATIVE links
// resolve against the current subpage — from /coach-preview/money a
// link to "clients" would nest into /coach-preview/money/clients — so
// every nav link and navigate() builds an ABSOLUTE path off this base.
import { useLocation, useParams } from 'react-router-dom';

export function useCoachBase(): string {
  const { pathname } = useLocation();
  const splat = useParams()['*'] ?? '';
  const base = splat ? pathname.slice(0, pathname.length - splat.length) : pathname;
  return base.replace(/\/+$/, '') || '/';
}
