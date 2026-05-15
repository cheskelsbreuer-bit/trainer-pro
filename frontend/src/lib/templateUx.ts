// Per-template UX overlays. Each entry tells the rest of the app how to
// rebrand language, which Dashboard variant to mount, and (eventually)
// which template-specific widgets to use elsewhere.
//
// This file is meant to grow — every new "this trainer's app should look
// different" customization gets a new field here.
//
// Multiple templates can be picked at once. We pick the FIRST matching
// template for primary terminology (a martial arts dojo also running a
// gym still calls them "students" first), and fall back to a generic
// trainer template if nothing matches.

import { TEMPLATES_BY_SLUG } from './templates';

// Which Dashboard layout to render for this template. Each variant is a
// fundamentally different page — not just relabeled words. 'martial' and
// 'boxing' both swap the ENTIRE app shell (sidebar, theme, vocabulary,
// page set) rather than just the dashboard page.
//   - 'private': solo trainer logging individual sessions (the current default)
//   - 'studio':  group-class studio — recurring weekly groups, monthly billing,
//                "who owes money" focus (mom's-gym pattern)
//   - 'martial': martial arts dojo — full separate app under src/dojo/
//                with dark theme, belt-rank tracking, dojo vocabulary
//   - 'boxing':  boxing/kickboxing gym — full separate app under src/boxing/
//                with red corner / blue corner theme, fighter W-L-D record,
//                round-based training, tier system instead of belts
//   - 'nutrition': nutrition coach — full separate app under src/nutrition/
//                with editorial-magazine aesthetic, serif type, sage palette,
//                inbox-of-check-ins workflow, no sidebar
// Other slugs map to the closest built variant until their own is built.
export type DashboardVariant =
  | 'private'
  | 'studio'
  | 'martial'
  | 'boxing'
  | 'nutrition';

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
  // Which dashboard layout to render — drives a different page entirely,
  // not just labels. See DashboardVariant.
  dashboardVariant: DashboardVariant;
  // Public profile editor placeholder copy. Each template needs its
  // own — a martial-arts dojo's public site doesn't read like a
  // personal trainer's. Used by components/PublicProfileSettingsCard.
  publicProfile: {
    heroHeadline: string;
    heroCta: string;
    heroSubtitle: string;
    aboutHeadline: string;
    aboutBody: string;
    addressLabel: string;
    addressPlaceholder: string;
    emailPlaceholder: string;
    instagramPlaceholder: string;
  };
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
  dashboardVariant: 'private',
  publicProfile: {
    heroHeadline: 'Build your body. Transform your life.',
    heroCta: 'Book a free consultation',
    heroSubtitle:
      'Personalized 1-on-1 training designed around your body, your goals, your schedule.',
    aboutHeadline: "Hi, I'm Sarah.",
    aboutBody:
      'Tell prospects who you are, who you train, and what makes your coaching different.',
    addressLabel: 'Studio address (optional)',
    addressPlaceholder: '123 Main St, Anytown',
    emailPlaceholder: 'hi@example-fitness.com',
    instagramPlaceholder: '@example_fitness',
  },
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
    dashboardVariant: 'studio',
    publicProfile: {
      heroHeadline: 'Stronger together. Welcome to the gym.',
      heroCta: 'Become a member',
      heroSubtitle:
        'Open 5am–11pm. Group classes daily, free weights, cardio floor, locker rooms. Your second home.',
      aboutHeadline: 'About the gym',
      aboutBody:
        'Tell members about your equipment, your classes, your community. What kind of gym is this?',
      addressLabel: 'Gym address',
      addressPlaceholder: '123 Main St, Anytown',
      emailPlaceholder: 'hello@yourgym.com',
      instagramPlaceholder: '@yourgym',
    },
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
    // Full separate app — mounts the src/dojo/ module instead of the
    // standard trainer Layout. Dark theme, belt-rank-centric workflow.
    dashboardVariant: 'martial',
    publicProfile: {
      heroHeadline: 'Train. Rank. Belong.',
      heroCta: 'Book a trial class',
      heroSubtitle:
        'Traditional martial arts in a modern dojo. Adults, kids, and families welcome — every level, white belt to black.',
      aboutHeadline: 'About the dojo',
      aboutBody:
        'Tell prospective students about your style, your lineage, and the values you teach on the mat. Who is this dojo for?',
      addressLabel: 'Dojo address',
      addressPlaceholder: '123 Main St, Anytown',
      emailPlaceholder: 'sensei@yourdojo.com',
      instagramPlaceholder: '@yourdojo',
    },
  },
  boxing_gym: {
    slug: 'boxing_gym',
    clientNoun: 'fighter',
    clientNounPlural: 'fighters',
    dashboardHeadline: 'Your gym at a glance',
    dashboardSubtitle:
      "Today's rounds, the fight card, your fighters by tier — all in one place.",
    spaceNoun: 'gym',
    primaryCtaLabel: 'Log rounds',
    primaryCtaPath: '/training',
    // Full separate app — mounts the src/boxing/ module. Red corner /
    // blue corner aesthetic, fighter records, tier system.
    dashboardVariant: 'boxing',
    publicProfile: {
      heroHeadline: 'Train like a fighter.',
      heroCta: 'Book a free trial',
      heroSubtitle:
        'Boxing fundamentals, strength training, real fight conditioning. Beginner-friendly. Step in the ring when you’re ready.',
      aboutHeadline: 'About the gym',
      aboutBody:
        'Who runs this gym, what’s your style, who do you train? Pros, amateurs, fitness boxers — be specific.',
      addressLabel: 'Gym address',
      addressPlaceholder: '123 Main St, Anytown',
      emailPlaceholder: 'coach@yourgym.com',
      instagramPlaceholder: '@yourgym',
    },
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
    dashboardVariant: 'studio',
    publicProfile: {
      heroHeadline: 'Find your practice. Find your people.',
      heroCta: 'Book a class',
      heroSubtitle:
        'Vinyasa, Hatha, Yin, restorative. Mats provided. Every body welcome. First class is free.',
      aboutHeadline: 'About the studio',
      aboutBody:
        'Tell students about your style of yoga, your teachers, the kind of practice you cultivate here.',
      addressLabel: 'Studio address',
      addressPlaceholder: '123 Main St, Anytown',
      emailPlaceholder: 'namaste@yourstudio.com',
      instagramPlaceholder: '@yourstudio',
    },
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
    dashboardVariant: 'private',
    publicProfile: {
      heroHeadline: 'Train like the level you want to play at.',
      heroCta: 'Apply for an evaluation',
      heroSubtitle:
        'Strength, speed, sport-specific conditioning. Periodized programming for high-school, collegiate, and pro athletes.',
      aboutHeadline: 'About the program',
      aboutBody:
        'What sports do you train, what are your athletes\' results, what makes your programming different?',
      addressLabel: 'Facility address',
      addressPlaceholder: '123 Performance Way, Anytown',
      emailPlaceholder: 'coach@yourprogram.com',
      instagramPlaceholder: '@yourprogram',
    },
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
    dashboardVariant: 'private',
    publicProfile: {
      heroHeadline: 'Online coaching that actually shows up.',
      heroCta: 'Apply to work with me',
      heroSubtitle:
        'Custom programming, weekly check-ins, real accountability. Built for people who train at home, at the gym, anywhere.',
      aboutHeadline: "Hi, I'm your coach.",
      aboutBody:
        'What\'s your story? Who do you coach best, and what does the experience of working with you look like?',
      addressLabel: 'Service area (optional)',
      addressPlaceholder: 'Worldwide · or e.g., USA + Canada',
      emailPlaceholder: 'coach@example.com',
      instagramPlaceholder: '@yourcoaching',
    },
  },
  nutrition_coach: {
    slug: 'nutrition_coach',
    clientNoun: 'client',
    clientNounPlural: 'clients',
    dashboardHeadline: 'Your nutrition practice',
    dashboardSubtitle: 'Active meal plans, weekly check-ins, macros adherence.',
    spaceNoun: 'practice',
    primaryCtaLabel: 'Review check-ins',
    primaryCtaPath: '/check-ins',
    // Full separate app — mounts src/nutrition/ with editorial magazine
    // aesthetic, serif headers, sage + cream palette, no sidebar.
    dashboardVariant: 'nutrition',
    publicProfile: {
      heroHeadline: 'Eat better. Feel better. Without the diet drama.',
      heroCta: 'Book a free intro call',
      heroSubtitle:
        'Personalized nutrition coaching that fits your real life — built one habit at a time, no calorie spreadsheets, no shame.',
      aboutHeadline: "Hi, I'm your nutrition coach.",
      aboutBody:
        'Who do you coach (women in midlife, athletes, busy parents), what method do you use (PN-style habits, intuitive eating, integrative), and what does the journey look like?',
      addressLabel: 'Practice address (optional)',
      addressPlaceholder: 'Online · or e.g., 123 Wellness Way',
      emailPlaceholder: 'hello@yournutrition.com',
      instagramPlaceholder: '@yournutrition',
    },
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
