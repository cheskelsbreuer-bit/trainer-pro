// ── Workspaces — one coach, several full apps ───────────────────────
//
// A coach who does nutrition coaching AND martial arts AND 1-on-1 has
// picked three templates. Each template maps to a fully separate app
// shell (NutritionApp, DojoApp, the default Layout, …). Rather than try
// to merge those very different shells into one mega-nav — which would
// violate the "no chrome reuse between templates" principle — we let the
// coach OWN all of them and flip between them with a workspace switcher.
//
// This module turns a trainer's template_slugs into the distinct set of
// apps they should be able to switch between.

import { pickTemplateUx, templateBadge, type DashboardVariant } from './templateUx';

// The actual app shell that gets mounted. Several dashboard variants
// collapse onto the same shell: 'private' and 'studio' both render the
// default <Layout/>, so we dedupe by this key, not by the raw variant.
export type AppKey =
  | 'default'
  | 'coach'
  | 'martial'
  | 'boxing'
  | 'nutrition'
  | 'exercise'
  | 'babysitting'
  | 'studio_classes';

/** Templates served by the ground-up 1-on-1 Coach app. Slug-scoped on
 *  purpose: the ux FALLBACK variant also matches unknown or empty
 *  template lists, and those should keep the classic Layout. */
export const COACH_TEMPLATE_SLUGS = ['solo_trainer', 'athletic_performance', 'online_coach'];

export function appKeyForVariant(variant: DashboardVariant): AppKey {
  switch (variant) {
    case 'babysitting':
      return 'babysitting';
    // Post-reset: every other variant rides the base Layout until its
    // ground-up app ships (old shells: archive/pre-groundup-verticals).
    default:
      return 'default';
  }
}

/** Slug → mounted app. Coach is keyed by slug (see above); everything
 *  else falls through to the variant mapping. */
export function appKeyForSlug(slug: string): AppKey {
  if (COACH_TEMPLATE_SLUGS.includes(slug)) return 'coach';
  return appKeyForVariant(pickTemplateUx([slug]).dashboardVariant);
}

export interface Workspace {
  /** Which app shell this entry mounts. */
  key: AppKey;
  /** A representative template slug (drives the label + emoji). */
  slug: string;
  /** Human label, e.g. "Nutrition Coaching". */
  label: string;
  /** Emoji badge, e.g. "🥗". */
  emoji: string;
}

/** The distinct apps a coach can switch between, in the order they picked
 *  their templates. De-duped by mounted shell so two templates that share
 *  a shell (e.g. solo trainer + gym membership) only appear once. */
export function workspacesFor(template_slugs: string[] | null | undefined): Workspace[] {
  const slugs = (template_slugs ?? []).filter(Boolean);
  const out: Workspace[] = [];
  const seen = new Set<AppKey>();
  for (const slug of slugs) {
    const key = appKeyForSlug(slug);
    if (seen.has(key)) continue;
    seen.add(key);
    const badge = templateBadge(slug);
    out.push({
      key,
      slug,
      label: badge?.name ?? slug,
      emoji: badge?.emoji ?? '•',
    });
  }
  return out;
}

// ── Remembering which workspace the coach last had open ───────────────
const STORAGE_PREFIX = 'tp-workspace:';

export function readActiveWorkspace(userId: string | undefined): AppKey | null {
  if (typeof window === 'undefined' || !userId) return null;
  const raw = window.localStorage.getItem(STORAGE_PREFIX + userId);
  return (raw as AppKey | null) ?? null;
}

export function writeActiveWorkspace(userId: string | undefined, key: AppKey) {
  if (typeof window === 'undefined' || !userId) return;
  window.localStorage.setItem(STORAGE_PREFIX + userId, key);
}
