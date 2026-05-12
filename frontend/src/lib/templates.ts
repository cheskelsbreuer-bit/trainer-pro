// Onboarding starter templates. Each one is a pre-baked configuration the
// trainer can pick to skip the "stare at a blank app" phase. Picking a
// template populates default packages, default session duration, suggested
// booking windows, and which mini-apps to highlight on the dashboard.
//
// Templates are RECOMMENDATIONS, not lock-ins. Trainers can edit every
// field later in Settings.
//
// Add a new template by:
//   1. Adding a TEMPLATE entry below
//   2. Filling in matchSpecialties (which specialty slugs it serves) and
//      matchKeywords (words we look for in the free-form description)
//   3. Defining the defaults that should be applied on pick
//
// The recommender ranks every template by (matched specialties * 2) +
// (matched keywords * 1.5) and returns the top three.

import type { PackageDefinition, BookingSettings } from './database.types';

export interface Template {
  slug: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  bestFor: string[];
  matchSpecialties: string[];
  matchKeywords: string[];
  defaults: {
    packages?: PackageDefinition[];
    booking_settings?: Partial<BookingSettings>;
    booking_enabled?: boolean;
  };
}

export const TEMPLATES: Template[] = [
  {
    slug: 'solo_trainer',
    name: 'Solo trainer',
    emoji: '🏋️',
    tagline: 'One-on-one sessions, simple billing.',
    description:
      'Classic personal trainer flow: book individual sessions, sell session packages, track each client, take card or cash.',
    bestFor: [
      'Private trainers',
      'In-home or in-gym 1-on-1',
      'Trainers with 5–50 clients',
    ],
    matchSpecialties: [
      'strength',
      'weight_loss',
      'general_fitness',
      'bodybuilding',
      'athletic_performance',
      'mobility_rehab',
      'senior_fitness',
      'pre_postnatal',
    ],
    matchKeywords: [
      'one-on-one',
      '1-on-1',
      'private',
      'individual',
      'home',
      'gym',
      'solo',
    ],
    defaults: {
      packages: [
        { name: 'Single session', sessions: 1, price: 75 },
        { name: '5-session pack', sessions: 5, price: 350 },
        { name: '10-session pack', sessions: 10, price: 650 },
      ],
      booking_settings: { default_duration_min: 60, lead_hours: 24, buffer_min: 15 },
      booking_enabled: true,
    },
  },
  {
    slug: 'gym_membership',
    name: 'Gym membership',
    emoji: '🏢',
    tagline: 'Recurring monthly members, drop-in classes.',
    description:
      'Track members on monthly billing instead of session packs. Built for neighborhood gyms, CrossFit boxes, and small studios where people pay every month and come whenever.',
    bestFor: [
      'Neighborhood gyms',
      'Studios with 30+ regulars',
      'Monthly membership pricing',
      'Drop-in based attendance',
    ],
    matchSpecialties: [
      'general_fitness',
      'strength',
      'group_classes',
      'bodybuilding',
    ],
    matchKeywords: [
      'gym',
      'members',
      'membership',
      'monthly',
      'studio',
      'box',
      'crossfit',
      'community',
    ],
    defaults: {
      packages: [
        { name: 'Monthly membership', sessions: 0, price: 79 },
        { name: '3-month upfront', sessions: 0, price: 210 },
        { name: 'Drop-in', sessions: 1, price: 20 },
      ],
      booking_settings: { default_duration_min: 60, lead_hours: 2, buffer_min: 0 },
      booking_enabled: true,
    },
  },
  {
    slug: 'martial_arts',
    name: 'Martial arts school',
    emoji: '🥋',
    tagline: 'Belt progression, group classes, kids + adults.',
    description:
      'Built for dojos, BJJ academies, karate. Tracks belt/rank progression per student, runs recurring class schedules, handles family memberships.',
    bestFor: [
      'BJJ / karate / judo / TKD',
      'Belt or rank-based programs',
      'Kids + adults classes',
    ],
    matchSpecialties: ['martial_arts', 'group_classes'],
    matchKeywords: [
      'martial',
      'karate',
      'bjj',
      'jiu-jitsu',
      'jiujitsu',
      'judo',
      'taekwondo',
      'tkd',
      'belt',
      'rank',
      'dojo',
    ],
    defaults: {
      packages: [
        { name: 'Monthly — Adults', sessions: 0, price: 150 },
        { name: 'Monthly — Kids', sessions: 0, price: 120 },
        { name: 'Family (2+)', sessions: 0, price: 250 },
      ],
      booking_settings: { default_duration_min: 60, lead_hours: 12, buffer_min: 5 },
      booking_enabled: true,
    },
  },
  {
    slug: 'boxing_gym',
    name: 'Boxing / Kickboxing gym',
    emoji: '🥊',
    tagline: 'Round-based training, fight records, red corner / blue corner.',
    description:
      'Built for boxing, kickboxing, and Muay Thai gyms. Tracks each fighter by tier (Rec / Amateur / Pro) and weight class, logs round-based training (mitts / bag / sparring), and keeps a W-L-D fight record per fighter.',
    bestFor: [
      'Boxing gyms',
      'Kickboxing / Muay Thai',
      'Amateur + pro coaches',
      'Round-based training',
    ],
    matchSpecialties: ['boxing_kickboxing', 'group_classes'],
    matchKeywords: [
      'boxing',
      'kickbox',
      'kickboxing',
      'muay thai',
      'muaythai',
      'thai',
      'fighter',
      'mma',
      'striking',
      'amateur',
      'pro',
      'sparring',
      'ring',
      'corner',
      'mitt',
      'pad',
      'glove',
    ],
    defaults: {
      packages: [
        { name: 'Monthly — Adults', sessions: 0, price: 160 },
        { name: 'Monthly — Kids / Youth', sessions: 0, price: 130 },
        { name: 'Pro fighter training', sessions: 0, price: 350 },
        { name: 'Drop-in class', sessions: 1, price: 25 },
      ],
      booking_settings: { default_duration_min: 60, lead_hours: 12, buffer_min: 5 },
      booking_enabled: true,
    },
  },
  {
    slug: 'yoga_studio',
    name: 'Yoga / Pilates studio',
    emoji: '🪷',
    tagline: 'Class scheduler, class packs, drop-ins.',
    description:
      'Recurring weekly class schedule with capacity caps. Sell class packs or unlimited monthly. Easy drop-in pricing for first-timers.',
    bestFor: [
      'Yoga studios',
      'Pilates / barre',
      'Group class formats',
      'Multi-instructor schedules',
    ],
    matchSpecialties: ['yoga_pilates', 'group_classes', 'mobility_rehab'],
    matchKeywords: [
      'yoga',
      'pilates',
      'barre',
      'studio',
      'class',
      'classes',
      'flow',
      'vinyasa',
      'hot',
    ],
    defaults: {
      packages: [
        { name: 'Drop-in', sessions: 1, price: 22 },
        { name: '10-class pack', sessions: 10, price: 180 },
        { name: 'Unlimited monthly', sessions: 0, price: 140 },
      ],
      booking_settings: { default_duration_min: 60, lead_hours: 2, buffer_min: 0 },
      booking_enabled: true,
    },
  },
  {
    slug: 'athletic_performance',
    name: 'Athletic performance',
    emoji: '⚡',
    tagline: 'PR tracking, periodization, testing days.',
    description:
      'Built for trainers working with competitive athletes — track strength PRs, plan periodized blocks, log testing battery results across cycles.',
    bestFor: [
      'Sport-specific trainers',
      'Strength & conditioning coaches',
      'Athletes prepping for season / meet',
    ],
    matchSpecialties: ['athletic_performance', 'sports_specific', 'strength'],
    matchKeywords: [
      'athlete',
      'sport',
      'performance',
      'd1',
      'collegiate',
      'pro',
      'competition',
      'meet',
      'season',
      'strength and conditioning',
      's&c',
    ],
    defaults: {
      packages: [
        { name: 'Hourly session', sessions: 1, price: 100 },
        { name: 'Off-season block (12 weeks)', sessions: 36, price: 2400 },
        { name: 'Testing + program review', sessions: 1, price: 200 },
      ],
      booking_settings: { default_duration_min: 75, lead_hours: 24, buffer_min: 15 },
      booking_enabled: true,
    },
  },
  {
    slug: 'online_coach',
    name: 'Online coach',
    emoji: '💻',
    tagline: 'Programs as products, async check-ins.',
    description:
      'No in-person sessions. Sell 4/8/12-week programs as packages, check in async via the client portal, track adherence remotely.',
    bestFor: [
      'Remote / online-only coaches',
      'Program-based pricing',
      'Async check-in workflow',
    ],
    matchSpecialties: [
      'strength',
      'bodybuilding',
      'weight_loss',
      'general_fitness',
      'nutrition_coaching',
    ],
    matchKeywords: [
      'online',
      'remote',
      'program',
      'app-based',
      'distance',
      'virtual',
      'async',
      'check-in',
    ],
    defaults: {
      packages: [
        { name: '4-week program', sessions: 0, price: 200 },
        { name: '12-week transformation', sessions: 0, price: 550 },
        { name: 'Custom plan + monthly check-in', sessions: 0, price: 99 },
      ],
      booking_settings: { default_duration_min: 30, lead_hours: 48, buffer_min: 0 },
      booking_enabled: false,
    },
  },
  {
    slug: 'nutrition_coach',
    name: 'Nutrition coach',
    emoji: '🥗',
    tagline: 'Meal plans, macros, habits, weekly check-ins.',
    description:
      'Built around nutrition coaching — sell meal plans + macro targets, track habits like water and sleep, weekly client check-ins instead of training sessions.',
    bestFor: [
      'Registered dietitians',
      'Nutrition-first coaches',
      'Hybrid trainer-nutrition coach',
    ],
    matchSpecialties: ['nutrition_coaching', 'weight_loss', 'pre_postnatal'],
    matchKeywords: [
      'nutrition',
      'meal',
      'macro',
      'diet',
      'rd',
      'dietitian',
      'food',
      'habit',
    ],
    defaults: {
      packages: [
        { name: 'Meal plan + 30-min consult', sessions: 1, price: 150 },
        { name: 'Monthly nutrition coaching', sessions: 4, price: 280 },
        { name: '12-week reset', sessions: 12, price: 750 },
      ],
      booking_settings: { default_duration_min: 30, lead_hours: 24, buffer_min: 10 },
      booking_enabled: true,
    },
  },
];

export const TEMPLATES_BY_SLUG: Record<string, Template> = TEMPLATES.reduce(
  (acc, t) => {
    acc[t.slug] = t;
    return acc;
  },
  {} as Record<string, Template>,
);

/**
 * Rank templates for a given (specialties, description) combo and return
 * the top three. Always returns at least one — falls back to solo_trainer
 * when nothing else scores positive.
 */
export function recommendTemplates(
  specialties: string[],
  description: string,
): Template[] {
  const desc = description.toLowerCase();
  const scored = TEMPLATES.map((t) => {
    const matchedSpecs = t.matchSpecialties.filter((s) => specialties.includes(s)).length;
    const matchedKeys = t.matchKeywords.filter((k) => desc.includes(k.toLowerCase())).length;
    return { template: t, score: matchedSpecs * 2 + matchedKeys * 1.5 };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return [TEMPLATES_BY_SLUG.solo_trainer];
  }
  return scored.slice(0, 3).map((x) => x.template);
}
