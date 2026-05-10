// Single source of truth for the /admin "Project Status" view.
// Edit this file to update what's shown — no DB required.
//
// Categories:
//   - shipped: live in production, working
//   - testing: shipped but waiting on real-world validation
//   - thisWeek: actively being built or queued for the next 7 days
//   - soon: planned but not yet started
//   - ideas: parking lot, may or may not happen

export type StatusCategory = 'shipped' | 'testing' | 'thisWeek' | 'soon' | 'ideas';

export interface StatusItem {
  category: StatusCategory;
  title: string;
  detail?: string;
  blocker?: string;
}

export const PROJECT_STATUS: StatusItem[] = [
  // ─── Shipped & live ───────────────────────────────────────────────
  {
    category: 'shipped',
    title: 'Public trainer directory',
    detail:
      'trainerpro.coach/find-trainers — clients search by city + multi-select specialties. Trainers control listing from Settings.',
  },
  {
    category: 'shipped',
    title: 'Specialty-driven dashboard toolkit',
    detail:
      'Trainer dashboard surfaces different mini-apps based on specialties (martial arts → belt tracker, group classes → group scheduler, etc.).',
  },
  {
    category: 'shipped',
    title: 'Two-way feedback messaging',
    detail:
      'Admin can reply to feedback from /admin → trainer sees it as a banner on dashboard + full thread in Settings → marked seen automatically.',
  },
  {
    category: 'shipped',
    title: 'Sign in with Google',
    detail:
      'OAuth provider on the Login page. Requires enabling Google in Supabase Auth + configuring an OAuth client in Google Cloud Console.',
  },
  {
    category: 'shipped',
    title: 'Marketing landing page',
    detail: 'trainerpro.coach + www — hero, features, pricing, email capture, mock UI.',
  },
  {
    category: 'shipped',
    title: 'Sign up + sign in (Supabase auth)',
    detail: 'Email/password, magic link, sign-up CTA from landing.',
  },
  {
    category: 'shipped',
    title: '7-step onboarding wizard',
    detail:
      'Welcome → name → client count → multi-select specialties → brand color → booking page → public profile.',
  },
  {
    category: 'shipped',
    title: 'Trainer dashboard',
    detail: 'Stats, today\'s sessions, recent activity, branded sidebar with their initials.',
  },
  {
    category: 'shipped',
    title: 'Client management',
    detail: 'Profiles, intake forms with PAR-Q, signed waivers, emergency contacts.',
  },
  {
    category: 'shipped',
    title: 'Workout builder',
    detail: 'Templates and per-client plans. Sets, reps, weights, notes.',
  },
  {
    category: 'shipped',
    title: 'Session calendar (1-on-1)',
    detail: 'Day/week/month views, conflict detection, recurring sessions.',
  },
  {
    category: 'shipped',
    title: 'Progress tracking',
    detail: 'Weight, body comp, PRs, progress photos, line charts per metric.',
  },
  {
    category: 'shipped',
    title: 'Public profile (free trainer website)',
    detail: 'trainerpro.coach/p/your-name with photo, bio, testimonials, gallery.',
  },
  {
    category: 'shipped',
    title: 'Public booking page',
    detail: 'Clients pick a time slot, trainer gets an email.',
  },
  {
    category: 'shipped',
    title: 'Client portal',
    detail: 'Each client gets a private page: workouts, sessions, payments, photos.',
  },
  {
    category: 'shipped',
    title: 'Email reminders (Resend)',
    detail: 'Sent from hello@trainerpro.coach via verified domain.',
  },
  {
    category: 'shipped',
    title: 'PWA / "Add to Home Screen"',
    detail:
      'Manifest, theme color, fullscreen launch. Installs as an app icon on phone home screen.',
  },
  {
    category: 'shipped',
    title: 'Privacy Policy + Terms of Service',
    detail: '/privacy and /terms — covers data, providers, retention, NY governing law.',
  },
  {
    category: 'shipped',
    title: 'In-app feedback button',
    detail: 'Settings page → form → submissions appear in /admin.',
  },
  {
    category: 'shipped',
    title: 'Admin dashboard (this page!)',
    detail:
      'Stats, all signups, waitlist, feedback. Magic-link sign-in required every browser tab.',
  },

  // ─── Testing / waiting on real-world validation ───────────────────
  {
    category: 'testing',
    title: 'SMS reminders (Twilio trial)',
    detail:
      'Code is live. Trial-mode limitation: trainer can only text phone numbers verified in Twilio console.',
    blocker: 'Verify each tester\'s phone in Twilio, OR upgrade Twilio (~$20) for production SMS.',
  },
  {
    category: 'testing',
    title: 'Stripe payments (test mode)',
    detail: 'Wired and working with Stripe test cards. Real money requires Stripe Connect refactor.',
    blocker: 'See "Stripe Connect" under Soon.',
  },

  // ─── This week ────────────────────────────────────────────────────
  {
    category: 'thisWeek',
    title: 'Group sessions',
    detail:
      'Schedule one session with multiple attendees. Per-attendee package billing.',
  },
  {
    category: 'thisWeek',
    title: 'Google Calendar two-way sync',
    detail:
      'OAuth flow, sync each session to trainer\'s personal Google Cal. Block booking page when busy.',
  },
  {
    category: 'thisWeek',
    title: 'Daily morning email to trainer',
    detail: '"Today\'s sessions" digest at 7am local time, only if they have any.',
  },
  {
    category: 'thisWeek',
    title: 'A2P 10DLC SMS registration (production SMS)',
    blocker: 'Twilio paperwork: business name, EIN, sample messages. 1-3 days carrier approval.',
  },

  // ─── Soon ─────────────────────────────────────────────────────────
  {
    category: 'soon',
    title: 'Stripe Connect (real architecture)',
    detail:
      'Each trainer connects their own Stripe — payments go DIRECT to them, not through us. We take a flat $19/month subscription instead.',
    blocker: '4-8 hours of refactor. Ship before second paying customer.',
  },
  {
    category: 'soon',
    title: 'Real social proof on the landing page',
    detail:
      'Testimonials, "Trusted by N coaches" badge, case studies. Wait until we have real customers — never fake numbers.',
    blocker: 'Need 3-5 real customers first.',
  },
  {
    category: 'soon',
    title: 'Custom waiver per trainer',
    detail:
      'Database column already added. Need a Settings UI for trainers to paste their own waiver text.',
  },
  {
    category: 'soon',
    title: 'PNG app icons for iOS',
    detail: 'Currently using SVG only. iOS may render a screenshot fallback.',
  },

  // ─── Ideas / backlog ──────────────────────────────────────────────
  {
    category: 'ideas',
    title: 'Automation rules engine',
    detail:
      'Like Trainerize: "client missed a session → auto-text" or "client signed up → 7-day welcome sequence." Real differentiator if we nail it.',
  },
  {
    category: 'ideas',
    title: 'Habits & accountability tracking',
    detail: 'Daily check-ins, streaks, simple yes/no habits per client. Boosts retention.',
  },
  {
    category: 'ideas',
    title: 'Lead capture form trainer can embed on their own site',
    detail: 'Cheap acquisition feature — they paste a snippet, leads flow into their dashboard.',
  },
  {
    category: 'ideas',
    title: 'Nutrition module',
    detail: 'Macros, meal plans, food logging. Everfit has this; we don\'t.',
  },
  {
    category: 'ideas',
    title: 'Wearable integrations (Whoop, Apple Watch, Garmin)',
    detail: 'Pull recovery + workout data. Hard to do well — defer until we have a clear winner.',
  },
  {
    category: 'ideas',
    title: 'Editable copy / CMS for the whole app',
    detail:
      'Let admins (you) edit every piece of user-facing text from /admin without code changes. Real refactor — replace every hardcoded string with a key/value lookup. V3.',
  },
  {
    category: 'ideas',
    title: 'Richer admin tools (mark feedback resolved, broadcast email, edit trainer flags)',
    detail: 'Beyond what /admin shows today. Layer in as we hit real operational pain.',
  },
  {
    category: 'ideas',
    title: 'WhatsApp reminders',
    detail: 'Bypasses A2P 10DLC entirely. Most clients prefer WhatsApp anyway.',
  },
  {
    category: 'ideas',
    title: 'AI workout generation (Anthropic Claude)',
    detail: 'Trainer types "12-week strength program for 40-year-old beginner" → gets a draft.',
  },
  {
    category: 'ideas',
    title: 'Native mobile apps',
    detail:
      'Real iOS/Android apps via React Native or Capacitor. Months of work + App Store review.',
  },
  {
    category: 'ideas',
    title: 'Sentry error tracking',
    detail: 'Catch crashes before users tell us about them.',
  },
  {
    category: 'ideas',
    title: 'Stripe subscriptions for the $19/month platform fee',
    detail: 'Trainers pay us monthly. Currently free during beta.',
  },
  {
    category: 'ideas',
    title: 'Customer support inbox',
    detail: 'Beyond the feedback form — a real chat widget like Intercom or Crisp.',
  },
];

export const STATUS_META: Record<
  StatusCategory,
  { label: string; emoji: string; color: string; order: number }
> = {
  shipped: { label: 'Live & working', emoji: '✅', color: 'emerald', order: 0 },
  testing: { label: 'Live but in trial / testing', emoji: '🧪', color: 'amber', order: 1 },
  thisWeek: { label: 'Building this week', emoji: '🚧', color: 'blue', order: 2 },
  soon: { label: 'Coming soon', emoji: '📅', color: 'indigo', order: 3 },
  ideas: { label: 'Ideas / backlog', emoji: '💡', color: 'slate', order: 4 },
};
