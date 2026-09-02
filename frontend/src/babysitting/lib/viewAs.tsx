// "Look inside their app" — an admin reading somebody else's account.
//
// How it works, in one line: while the flag below is set, useAuth() hands
// every page the OTHER account's id, so each app asks the database for
// that account's rows using the queries it already had. Babysitting, the
// 1-on-1 Coach app and the classic app all work without knowing anything
// about this. That is the point: the first version of this feature fed a
// hand-built snapshot to the babysitting app alone, so an account in any
// other app opened the wrong screens and showed nothing.
//
// Why the flag is safe. It is not a permission. It changes which rows are
// asked for; whether any come back is row-level security's decision, and
// it says yes only to an admin — supabase/45_admin_read_any_account.sql
// adds a SELECT policy and nothing else. There is no admin INSERT, UPDATE
// or DELETE policy on any table, so the database refuses every write to
// someone else's account whatever the screen does. `assertLive` below is
// the friendly half of that: it stops the write in the browser so a person
// gets a sentence instead of a policy error.

import { useEffect, useState } from 'react';
import type { Client, Payment } from '../../lib/database.types';

// ── The per-tab flag ──────────────────────────────────────────────────
//
// sessionStorage, like the demo: looking inside an account lasts for the
// tab it was opened in and is gone when that tab closes. It is never the
// state you come back to tomorrow by accident.

const VIEW_AS_KEY = 'tp-view-as';
const VIEW_AS_EVENT = 'tp-view-as-change';

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
    /* private window — the visit just won't survive a reload */
  }
  window.dispatchEvent(new CustomEvent(VIEW_AS_EVENT));
}

/** The account being looked at, or null when this is somebody's own app.
 *  Components use it to hide anything that would write. */
export function useViewAs(): string | null {
  const [at, setAt] = useState<string | null>(() => viewAsTarget());
  useEffect(() => {
    const sync = () => setAt(viewAsTarget());
    window.addEventListener(VIEW_AS_EVENT, sync);
    return () => window.removeEventListener(VIEW_AS_EVENT, sync);
  }, []);
  return at;
}

/** Called at the top of every mutation. Reading someone's account is one
 *  thing; changing it behind their back is another, and no button in here
 *  is meant to. The database refuses these writes anyway — this is what
 *  turns that refusal into a sentence a person can read. */
export function assertLive(viewing: string | null): void {
  if (viewing) {
    throw new Error(
      "You're looking at this account read-only. Nothing here can be changed.",
    );
  }
}

// ── The snapshot ──────────────────────────────────────────────────────
//
// Still fetched, but only for the setup report on the banner: thirteen
// questions about an account that are cheaper to answer from one query
// than from thirteen. The app's own screens no longer go through it —
// they read the real tables, the way the account's owner does.

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
