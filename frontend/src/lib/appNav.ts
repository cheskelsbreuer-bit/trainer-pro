// ── The one menu brain for the core trainer shell ────────────────────
//
// Every surface that shows or lists the default app's tabs reads THIS:
//   • Layout.tsx (the default sidebar)
//   • UnifiedApp.tsx (the combined multi-discipline shell)
//   • Settings → Customize → Layout (the reorder UI)
//   • App.tsx route gates (visiting a switched-off tab)
//
// A tab appears when ANY of its `modules` is switched on for the coach
// (empty list = core, always shown). Order comes from the coach's saved
// navOrder. This is what makes "Customize your app" actually true.

import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Dumbbell,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { applyNavOrder } from './layout';

export interface CoreNavDef {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number | string }>;
  end?: boolean;
  /** Module ids that light this tab up — ANY of them on shows it.
   *  Empty = core, can't be hidden. */
  modules: string[];
}

export const CORE_NAV: CoreNavDef[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, modules: [] },
  { to: '/clients', label: 'Clients', icon: Users, modules: [] },
  { to: '/sessions', label: 'Sessions', icon: Calendar, modules: ['session-logging', 'class-schedule'] },
  { to: '/payments', label: 'Payments', icon: DollarSign, modules: ['payments'] },
  { to: '/workouts', label: 'Workouts', icon: Dumbbell, modules: ['workout-builder', 'program-templates'] },
  {
    to: '/progress',
    label: 'Progress',
    icon: TrendingUp,
    modules: ['progress-graphs', 'body-measurements', 'progress-photos', 'check-ins'],
  },
  { to: '/settings', label: 'Settings', icon: Settings, modules: [] },
];

/** Visible tabs for a coach: module-filtered, then saved-order sorted.
 *  `clientNoun` lets a template rename "Clients" (members, athletes…). */
export function coreNavFor(
  isOn: (id: string) => boolean,
  navOrder: string[],
  clientNoun?: string,
): CoreNavDef[] {
  const items = CORE_NAV.filter(
    (n) => n.modules.length === 0 || n.modules.some((m) => isOn(m)),
  ).map((n) =>
    n.to === '/clients' && clientNoun ? { ...n, label: clientNoun } : n,
  );
  return applyNavOrder(items, navOrder);
}

/** The tab (if any) that covers a route — used by the route gate. */
export function navDefForRoute(path: string): CoreNavDef | undefined {
  return CORE_NAV.find((n) => n.to === path);
}
