// "Look inside their app" — an admin-only, read-only view of somebody
// else's babysitting account.
//
// It works exactly like demo mode does: a context that, when set, makes
// every read hook serve rows from a snapshot instead of the live database,
// and makes every write refuse. The difference is where the rows come
// from — the demo invents them, this one fetches a real account through
// the admin RPC (supabase/43_admin_view_as.sql).
//
// Nothing here can write. That is not a policy, it's the shape of the
// thing: the snapshot is a plain object in memory, the admin's RLS gives
// them no access to the account's tables, and `assertLive` throws before
// any mutation can reach Supabase.

import { createContext, useContext, type ReactNode } from 'react';
import type { Client, Payment } from '../../lib/database.types';

export interface ViewAsActivityRow {
  id: string;
  trainer_id: string;
  actor: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ViewAsMessageRow {
  id: string;
  trainer_id: string;
  client_id: string;
  sender: 'trainer' | 'client';
  body: string;
  attachments: unknown;
  read_at: string | null;
  created_at: string;
}

export interface ViewAsTrainer {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  timezone: string | null;
  currency: string | null;
  slug: string | null;
  primary_color: string | null;
  onboarded_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  template_slugs: string[];
  public_profile: Record<string, unknown>;
}

export interface ViewAsSnapshot {
  trainer: ViewAsTrainer;
  clients: Client[];
  payments: Payment[];
  activity: ViewAsActivityRow[];
  messages: ViewAsMessageRow[];
  taken_at: string;
}

export const ViewAsContext = createContext<ViewAsSnapshot | null>(null);

/** The account being looked at, or null when this is somebody's own app. */
export function useViewAs(): ViewAsSnapshot | null {
  return useContext(ViewAsContext);
}

/** Called at the top of every mutation. Reading someone's account is one
 *  thing; editing it behind their back is another, and no button in here
 *  is ever meant to do it. If one somehow fires — a stray keyboard
 *  shortcut, a component that saves on unmount — this stops it before it
 *  reaches the database. */
export function assertLive(snapshot: ViewAsSnapshot | null): void {
  if (snapshot) {
    throw new Error(
      "You're looking at this account read-only. Nothing here can be changed.",
    );
  }
}

export function ViewAsProvider({
  snapshot,
  children,
}: {
  snapshot: ViewAsSnapshot;
  children: ReactNode;
}) {
  return <ViewAsContext.Provider value={snapshot}>{children}</ViewAsContext.Provider>;
}

/** Pull one kind of activity row out of a snapshot, in the same order and
 *  with the same limits the live queries use. Keeps the page code honest:
 *  what an admin sees is what the account owner sees, not a rearranged
 *  version of it. */
export function activityByAction(
  snapshot: ViewAsSnapshot,
  action: string,
  limit: number,
  sinceIso?: string,
): ViewAsActivityRow[] {
  return snapshot.activity
    .filter((r) => r.action === action && (!sinceIso || r.created_at >= sinceIso))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

// ── The per-tab flag ──────────────────────────────────────────────────
//
// sessionStorage, exactly like the demo: looking inside an account lasts
// for the tab it was opened in and is gone when that tab closes. It is
// never the state you come back to tomorrow by accident.

const VIEW_AS_KEY = 'tp-view-as';

export function viewAsTarget(): string | null {
  try {
    return window.sessionStorage.getItem(VIEW_AS_KEY);
  } catch {
    return null;
  }
}

export function setViewAsTarget(trainerId: string | null): void {
  try {
    if (trainerId) window.sessionStorage.setItem(VIEW_AS_KEY, trainerId);
    else window.sessionStorage.removeItem(VIEW_AS_KEY);
  } catch {
    /* ignore */
  }
}
