// Per-template UX overlays. Each entry tells the rest of the app how to
// rebrand language, what hero message to show on the Dashboard, and
// (eventually) which template-specific widgets to mount.
//
// This file is meant to grow — every new "this trainer's app should look
// different" customization gets a new field here.
//
// Multiple templates can be picked at once. We pick the FIRST matching
// template for primary terminology (a martial arts dojo also running a
// gym still calls them "students" first), and fall back to a generic
// trainer template if nothing matches.

import { TEMPLATES_BY_SLUG } from './templates';

export interface TemplateUx {
  slug: string;
  // The thing trainers call the people they work with.
  // "client" / "member" / "student" / "athlete"
  clientNoun: string;
  clientNounPlural: string;
  // Dashboard hero copy.
  dashboardHeadline: string;
  dashboardSubtitle: string;
  // What the trainer's space is called.
  spaceNoun: string; // "studio", "dojo", "gym", "online practice"
  // Primary CTA pattern on dashboard.
  primaryCtaLabel: string;
  primaryCtaPath: string;
}

const FALLBACK: TemplateUx = {
  slug: 'solo_trainer',
  clientNoun: 'client',
  clientNounPlural: 'clients',
  dashboardHeadline: 'Your training business at a glance',
  dashboardSubtitle: "Today's sessions, recent payments, who's due to renew.",
  spaceNoun: 'practice',
  primaryCtaLabel: 'Log a session',
  primaryCtaPath: '/sessions',
};

const TEMPLATE_UX: Record<string, TemplateUx> = {
  solo_trainer: FALLBACK,
  gym_membership: {
    slug: 'gym_membership',
    clientNoun: 'member',
    clientNounPlural: 'members',
    dashboardHeadline: 'Your gym at a glance',
    dashboardSubtitle: 'Active members, monthly billing, drop-ins, payment status.',
    spaceNoun: 'gym',
    primaryCtaLabel: 'Add a member',
    primaryCtaPath: '/clients',
  },
  martial_arts: {
    slug: 'martial_arts',
    clientNoun: 'student',
    clientNounPlural: 'students',
    dashboardHeadline: 'Your dojo at a glance',
    dashboardSubtitle: 'Today’s classes, belt progression, family memberships.',
    spaceNoun: 'dojo',
    primaryCtaLabel: 'Schedule a class',
    primaryCtaPath: '/sessions',
  },
  yoga_studio: {
    slug: 'yoga_studio',
    clientNoun: 'student',
    clientNounPlural: 'students',
    dashboardHeadline: 'Your studio at a glance',
    dashboardSubtitle: 'Class schedule, class packs, unlimited monthlies.',
    spaceNoun: 'studio',
    primaryCtaLabel: 'Schedule a class',
    primaryCtaPath: '/sessions',
  },
  athletic_performance: {
    slug: 'athletic_performance',
    clientNoun: 'athlete',
    clientNounPlural: 'athletes',
    dashboardHeadline: 'Your athletes at a glance',
    dashboardSubtitle: 'Periodization blocks, PRs, upcoming testing days.',
    spaceNoun: 'program',
    primaryCtaLabel: 'Log a session',
    primaryCtaPath: '/sessions',
  },
  online_coach: {
    slug: 'online_coach',
    clientNoun: 'client',
    clientNounPlural: 'clients',
    dashboardHeadline: 'Your online roster',
    dashboardSubtitle: "Programs sold, check-ins due, who's stalled on their plan.",
    spaceNoun: 'practice',
    primaryCtaLabel: 'Send a check-in',
    primaryCtaPath: '/clients',
  },
  nutrition_coach: {
    slug: 'nutrition_coach',
    clientNoun: 'client',
    clientNounPlural: 'clients',
    dashboardHeadline: 'Your nutrition practice',
    dashboardSubtitle: 'Active meal plans, weekly check-ins, macros adherence.',
    spaceNoun: 'practice',
    primaryCtaLabel: 'Build a meal plan',
    primaryCtaPath: '/workouts',
  },
};

/**
 * Pick the primary UX overlay for a trainer based on their picked
 * templates. If multiple are picked we use the first one in the list —
 * that's the order they checked them in the wizard, which is a reasonable
 * proxy for "which one they identify with most." Falls back to the
 * generic solo trainer overlay if nothing matches.
 */
export function pickTemplateUx(template_slugs: string[] | null | undefined): TemplateUx {
  const slugs = template_slugs ?? [];
  for (const s of slugs) {
    if (TEMPLATE_UX[s]) return TEMPLATE_UX[s];
  }
  return FALLBACK;
}

/**
 * For places that want to show e.g. "🥋 Dojo" or "🏢 Gym" — pulls the
 * emoji + name from the templates registry so we don't double-maintain.
 */
export function templateBadge(slug: string): { emoji: string; name: string } | null {
  const t = TEMPLATES_BY_SLUG[slug];
  return t ? { emoji: t.emoji, name: t.name } : null;
}
