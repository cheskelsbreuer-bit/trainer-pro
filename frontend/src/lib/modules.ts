// ── The module system — Trainer Pro's core differentiator ───────────
//
// Every other coaching app makes the coach fit a fixed product. We let
// each coach assemble their OWN app from capability "modules". Two
// coaches in the same template can have completely different apps.
//
// IMPORTANT (and per the no-reuse principle): this registry is only the
// BRAIN — it tracks which capabilities a coach has switched on. It does
// NOT contain any shared UI. Each template app renders its own pages in
// its own design language and simply asks "is module X on for this
// coach?" to decide whether to show its own tab.
//
// Storage: trainers.public_profile.modules.enabled = string[] of module
// ids. No new tables. Defaults to the template's starter bundle, so
// existing coaches see zero change until they open the switchboard.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from '../hooks/useAuth';

export type ModuleCategory =
  | 'core'
  | 'ai'
  | 'nutrition'
  | 'martial'
  | 'boxing'
  | 'studio'
  | 'exercise'
  | 'private'
  | 'comms'
  | 'growth'
  | 'business'
  | 'crosscutting';

export interface AppModule {
  id: string;
  name: string;
  /** One-liner the coach reads in the switchboard. */
  description: string;
  icon: string; // emoji — neutral, each template styles its own nav anyway
  category: ModuleCategory;
  /** Template slugs this module is OFFERED to. 'all' = every template. */
  templates: string[] | 'all';
  /** Core modules are always on and can't be switched off. */
  core?: boolean;
  /** Short nudge shown when the app suggests turning this on. */
  suggest?: string;
  /** Other modules to suggest once THIS one is on — the "do this → get
   *  more" affinity graph. Drives smart, contextual recommendations. */
  unlocks?: string[];
}

// ── The catalog ──────────────────────────────────────────────────────
// Grouped loosely by category. `templates` controls which coaches even
// SEE a module in their switchboard — a boxing module never shows up
// for a nutrition coach.

export const MODULES: AppModule[] = [
  // ---- CORE (every template, always on) ----
  { id: 'dashboard', name: 'Dashboard', description: 'Your at-a-glance home screen.', icon: '📊', category: 'core', templates: 'all', core: true },
  { id: 'roster', name: 'Client roster', description: 'The people you work with.', icon: '👥', category: 'core', templates: 'all', core: true },
  { id: 'settings', name: 'Settings', description: 'Configure your app.', icon: '⚙️', category: 'core', templates: 'all', core: true },

  // ---- PAYMENTS / MONEY (most templates) ----
  { id: 'payments', name: 'Payment tracking', description: 'Record payments, balances, who owes what.', icon: '💰', category: 'crosscutting', templates: 'all', unlocks: ['stripe', 'gift-cards', 'loyalty-points'] },
  { id: 'stripe', name: 'Online payments (Stripe)', description: 'Let clients pay you by card.', icon: '💳', category: 'crosscutting', templates: 'all', suggest: 'You have clients who owe money — collect it online.', unlocks: ['no-show-fees', 'gift-cards', 'auto-rebill'] },
  { id: 'class-billing', name: 'Per-class billing', description: 'Charge per class, track running balances.', icon: '🧾', category: 'exercise', templates: ['exercise_group'], unlocks: ['family-discount-auto', 'makeup-classes'] },
  { id: 'packages', name: 'Packages & class packs', description: 'Sell 10-class packs, unlimited monthly, drop-ins.', icon: '🎟️', category: 'crosscutting', templates: ['group_studio', 'gym_membership', 'yoga_studio', 'solo_trainer'], unlocks: ['drop-in-passes', 'membership-freeze', 'auto-rebill'] },

  // ---- NUTRITION ----
  { id: 'habit-coaching', name: 'Habit coaching', description: 'Assign one practice at a time, by skill + level.', icon: '🌱', category: 'nutrition', templates: ['nutrition_coach'], unlocks: ['habit-streaks', 'progress-graphs', 'ai-checkin-summary'] },
  { id: 'check-ins', name: 'Weekly check-ins', description: 'Structured client check-ins with photos + stats.', icon: '📥', category: 'nutrition', templates: ['nutrition_coach', 'online_coach'], unlocks: ['progress-photos', 'body-measurements', 'ai-checkin-summary'] },
  { id: 'recipes', name: 'Recipe library', description: 'Curated recipes to share with clients.', icon: '🍳', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'intake-forms', name: 'Intake forms', description: 'New-client questionnaire — story, body, mindset.', icon: '📋', category: 'nutrition', templates: ['nutrition_coach', 'online_coach'] },
  { id: 'resources', name: 'Resource library', description: 'Coach-written lessons attached to each practice.', icon: '📚', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'ask-coach', name: 'AI assistant', description: 'A methodology-trained chatbot for clients + you.', icon: '✨', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'macros', name: 'Macro targets', description: 'Per-client protein / carb / fat targets.', icon: '🥩', category: 'nutrition', templates: ['nutrition_coach'], suggest: 'Some methods (RP) track macros — turn this on if you do.' },

  // ---- MARTIAL ARTS ----
  { id: 'belt-ranks', name: 'Belt / rank tracking', description: 'Track each student\'s belt and progression.', icon: '🥋', category: 'martial', templates: ['martial_arts'], unlocks: ['belt-stripes', 'testing-events', 'grading-criteria', 'curriculum-tracker'] },
  { id: 'testing-events', name: 'Belt testing events', description: 'Schedule and run rank tests.', icon: '🎓', category: 'martial', templates: ['martial_arts'] },
  { id: 'family-memberships', name: 'Family memberships', description: 'Group siblings + parents under one account.', icon: '👨‍👩‍👧', category: 'martial', templates: ['martial_arts', 'group_studio'] },

  // ---- BOXING ----
  { id: 'fighter-records', name: 'Fighter records', description: 'Win-loss-draw record per fighter.', icon: '🥊', category: 'boxing', templates: ['boxing_gym'], unlocks: ['weigh-ins', 'sparring-rounds', 'opponent-scouting', 'weight-cut-tracker'] },
  { id: 'rounds-training', name: 'Rounds & training log', description: 'Log rounds, drills, conditioning.', icon: '⏱️', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'tier-system', name: 'Fighter tiers', description: 'Beginner / amateur / pro tier tracking.', icon: '🏆', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'fight-card', name: 'Fight card', description: 'Upcoming bouts and matchups.', icon: '📣', category: 'boxing', templates: ['boxing_gym'] },

  // ---- GROUP STUDIO ----
  { id: 'class-schedule', name: 'Class schedule', description: 'Weekly recurring class grid.', icon: '📅', category: 'studio', templates: ['group_studio', 'yoga_studio', 'gym_membership'], unlocks: ['bookings', 'attendance', 'instructors', 'recurring-bookings'] },
  { id: 'class-types', name: 'Class types', description: 'Define yoga / spin / HIIT / etc.', icon: '🌀', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'instructors', name: 'Instructors', description: 'Staff roster + who teaches what.', icon: '🧑‍🏫', category: 'studio', templates: ['group_studio', 'yoga_studio', 'gym_membership'] },
  { id: 'bookings', name: 'Bookings & waitlists', description: 'Clients reserve a spot; waitlist when full.', icon: '🗓️', category: 'studio', templates: ['group_studio', 'yoga_studio'], unlocks: ['waitlist-auto', 'no-show-fees', 'late-cancel-policy'] },
  { id: 'attendance', name: 'Attendance tracking', description: 'Mark who showed up to each class.', icon: '✅', category: 'studio', templates: ['group_studio', 'yoga_studio', 'martial_arts', 'gym_membership'], suggest: 'You schedule classes — track who actually comes.' },

  // ---- EXERCISE GROUP (mom's model) ----
  { id: 'day-groups', name: 'Day-of-week groups', description: 'Organize members by class day.', icon: '🗂️', category: 'exercise', templates: ['exercise_group'] },
  { id: 'pause-records', name: 'Pause tracking', description: 'Track members on a break + when they return.', icon: '⏸️', category: 'exercise', templates: ['exercise_group'] },
  { id: 'notes-library', name: 'Notes & combos', description: 'Workout routines organized by category.', icon: '📝', category: 'exercise', templates: ['exercise_group', 'group_studio'] },

  // ---- PRIVATE / SOLO TRAINER ----
  { id: 'session-logging', name: 'Session logging', description: 'Log individual 1-on-1 sessions.', icon: '🏋️', category: 'private', templates: ['solo_trainer', 'athletic_performance', 'online_coach'] },
  { id: 'workout-builder', name: 'Workout builder', description: 'Build + assign workout programs.', icon: '🏗️', category: 'private', templates: ['solo_trainer', 'athletic_performance', 'online_coach'] },
  { id: 'progress-photos', name: 'Progress photos', description: 'Before/after photo tracking.', icon: '📸', category: 'private', templates: ['solo_trainer', 'nutrition_coach', 'online_coach'] },

  // ---- COMMUNICATIONS (any template) ----
  { id: 'sms-reminders', name: 'SMS reminders', description: 'Auto-text balance + class reminders.', icon: '📱', category: 'comms', templates: 'all', suggest: 'Stop chasing payments by hand — auto-text reminders.' },
  { id: 'email-reminders', name: 'Email notifications', description: 'Welcome notes, receipts, check-in nudges.', icon: '✉️', category: 'comms', templates: 'all' },
  { id: 'messaging', name: 'Client messaging', description: 'In-app coach ↔ client chat.', icon: '💬', category: 'comms', templates: 'all', unlocks: ['ai-reply-assist'] },
  { id: 'client-portal', name: 'Client portal', description: 'Let clients log in to see balance + progress.', icon: '🚪', category: 'comms', templates: 'all', suggest: 'Give clients their own login — every top app has this.' },

  // ---- GROWTH / EXTRAS (any template) ----
  { id: 'public-profile', name: 'Public page', description: 'A free hosted website for your practice.', icon: '🌐', category: 'growth', templates: 'all' },
  { id: 'online-booking', name: 'Online consult booking', description: 'Let prospects book a free intro call.', icon: '📆', category: 'growth', templates: 'all' },
  { id: 'directory', name: 'Find-a-coach directory', description: 'Get listed in the Trainer Pro directory.', icon: '📒', category: 'growth', templates: 'all' },
  { id: 'calendar-sync', name: 'Calendar sync', description: 'Sync sessions to Google Calendar.', icon: '🔄', category: 'growth', templates: 'all' },
  { id: 'reports', name: 'Reports & insights', description: 'Revenue, retention, trends.', icon: '📈', category: 'growth', templates: 'all', suggest: 'You have months of data — see the trends.', unlocks: ['ai-progress-insights', 'churn-alerts'] },
  { id: 'activity-log', name: 'Activity log', description: 'A history of everything that happened.', icon: '📜', category: 'growth', templates: 'all' },
  { id: 'birthdays', name: 'Birthdays', description: 'Surface client birthdays each month.', icon: '🎂', category: 'growth', templates: 'all' },
  { id: 'holidays', name: 'Holidays / closures', description: 'Mark days you\'re closed.', icon: '🏖️', category: 'growth', templates: 'all' },
  { id: 'tags', name: 'Client tags', description: 'Color-coded labels for filtering.', icon: '🏷️', category: 'growth', templates: 'all' },
  { id: 'custom-fields', name: 'Custom fields', description: 'Track your own per-client info.', icon: '✏️', category: 'growth', templates: 'all' },

  // ════════════════════════════════════════════════════════════════
  //  AI FEATURES — the smart layer. Offered per template.
  // ════════════════════════════════════════════════════════════════
  { id: 'ai-checkin-summary', name: 'AI check-in summary', description: "AI reads a client's week and writes the recap for you.", icon: '🤖', category: 'ai', templates: ['nutrition_coach', 'online_coach'], unlocks: ['ai-reply-assist'] },
  { id: 'ai-meal-plan', name: 'AI meal-plan builder', description: "Generate a meal plan from a client's macros + preferences.", icon: '🤖', category: 'ai', templates: ['nutrition_coach'], unlocks: ['grocery-lists'] },
  { id: 'ai-recipe-gen', name: 'AI recipe generator', description: 'Create recipes from whatever the client has on hand.', icon: '🤖', category: 'ai', templates: ['nutrition_coach'] },
  { id: 'ai-intake-analysis', name: 'AI intake analysis', description: "AI reads a new client's intake and suggests a starting plan.", icon: '🤖', category: 'ai', templates: ['nutrition_coach', 'online_coach'] },
  { id: 'ai-workout-gen', name: 'AI workout generator', description: 'AI drafts a workout or training block from goals.', icon: '🤖', category: 'ai', templates: ['solo_trainer', 'athletic_performance', 'online_coach', 'martial_arts', 'boxing_gym'] },
  { id: 'ai-class-description', name: 'AI class descriptions', description: 'AI writes catchy class descriptions for your schedule.', icon: '🤖', category: 'ai', templates: ['group_studio', 'yoga_studio'] },
  { id: 'ai-reply-assist', name: 'AI reply assistant', description: 'AI drafts message replies in your voice — you approve + send.', icon: '🤖', category: 'ai', templates: 'all' },
  { id: 'ai-progress-insights', name: 'AI progress insights', description: 'AI spots who\'s stalling, who\'s thriving, who\'s about to quit.', icon: '🤖', category: 'ai', templates: 'all', unlocks: ['churn-alerts'] },

  // ════════════════════════════════════════════════════════════════
  //  MORE NUTRITION
  // ════════════════════════════════════════════════════════════════
  { id: 'meal-plan-builder', name: 'Meal plan builder', description: 'Build + assign structured meal plans by hand.', icon: '🍽️', category: 'nutrition', templates: ['nutrition_coach'], unlocks: ['grocery-lists', 'ai-meal-plan'] },
  { id: 'grocery-lists', name: 'Grocery lists', description: 'Auto-build a shopping list from a meal plan.', icon: '🛒', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'macro-calculator', name: 'Macro calculator', description: 'Set protein/carb/fat targets from goals + body stats.', icon: '🧮', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'body-measurements', name: 'Body measurements', description: 'Track waist, hips, weight, body-fat over time.', icon: '📏', category: 'nutrition', templates: ['nutrition_coach', 'online_coach', 'solo_trainer'], unlocks: ['progress-graphs'] },
  { id: 'progress-graphs', name: 'Progress graphs', description: 'Charts of weight, measurements, habits over time.', icon: '📉', category: 'nutrition', templates: ['nutrition_coach', 'online_coach', 'solo_trainer'] },
  { id: 'habit-streaks', name: 'Habit streaks', description: 'Streak counters + badges that keep clients consistent.', icon: '🔥', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'water-tracker', name: 'Water tracker', description: 'Daily hydration logging for clients.', icon: '💧', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'food-journal', name: 'Food journal', description: 'Clients log meals with photos; you review.', icon: '📓', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'supplement-log', name: 'Supplement log', description: 'Track each client\'s supplement protocol.', icon: '💊', category: 'nutrition', templates: ['nutrition_coach'] },

  // ════════════════════════════════════════════════════════════════
  //  MORE MARTIAL ARTS
  // ════════════════════════════════════════════════════════════════
  { id: 'belt-stripes', name: 'Belt stripes', description: 'Track stripes between full belt promotions.', icon: '➖', category: 'martial', templates: ['martial_arts'] },
  { id: 'grading-criteria', name: 'Grading criteria', description: 'Per-belt requirements checklist for testing.', icon: '☑️', category: 'martial', templates: ['martial_arts'] },
  { id: 'curriculum-tracker', name: 'Curriculum tracker', description: 'Track which techniques each student has learned.', icon: '📖', category: 'martial', templates: ['martial_arts'] },
  { id: 'kata-library', name: 'Forms / kata library', description: 'A reference library of forms with notes + video.', icon: '🎴', category: 'martial', templates: ['martial_arts'] },
  { id: 'tournament-tracker', name: 'Tournament tracker', description: 'Log competitions, brackets, medals per student.', icon: '🏅', category: 'martial', templates: ['martial_arts'] },
  { id: 'sparring-pairs', name: 'Sparring pairs', description: 'Match students by size + rank for sparring.', icon: '🤼', category: 'martial', templates: ['martial_arts'] },

  // ════════════════════════════════════════════════════════════════
  //  MORE BOXING
  // ════════════════════════════════════════════════════════════════
  { id: 'weigh-ins', name: 'Weigh-ins', description: 'Track fighter weight over a camp.', icon: '⚖️', category: 'boxing', templates: ['boxing_gym'], unlocks: ['weight-cut-tracker'] },
  { id: 'weight-cut-tracker', name: 'Weight-cut tracker', description: 'Plan + monitor a safe cut to fight weight.', icon: '📉', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'sparring-rounds', name: 'Sparring log', description: 'Log sparring rounds, partners, notes.', icon: '🥊', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'opponent-scouting', name: 'Opponent scouting', description: 'Scouting notes + tape on upcoming opponents.', icon: '🔍', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'mitt-work-log', name: 'Mitt-work log', description: 'Track pad rounds + combinations drilled.', icon: '🧤', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'conditioning-blocks', name: 'Conditioning blocks', description: 'Periodized strength + conditioning for fighters.', icon: '🏋️', category: 'boxing', templates: ['boxing_gym'] },

  // ════════════════════════════════════════════════════════════════
  //  MORE GROUP STUDIO
  // ════════════════════════════════════════════════════════════════
  { id: 'waitlist-auto', name: 'Auto-waitlist promotion', description: 'When a spot frees up, auto-promote + notify next in line.', icon: '🔔', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'recurring-bookings', name: 'Recurring bookings', description: 'Members book the same class every week automatically.', icon: '🔁', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'no-show-fees', name: 'No-show fees', description: 'Auto-charge for late cancels + no-shows.', icon: '🚫', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'late-cancel-policy', name: 'Cancellation policy', description: 'Set + enforce a cancellation cutoff window.', icon: '⏲️', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'instructor-pay', name: 'Instructor pay reports', description: 'Per-class pay + head-count reports for staff.', icon: '💵', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'class-substitutes', name: 'Sub management', description: 'Find + assign a substitute when an instructor is out.', icon: '🔄', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'drop-in-passes', name: 'Drop-in passes', description: 'Sell single-class drop-ins to non-members.', icon: '🎫', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'membership-freeze', name: 'Membership freeze', description: 'Let members pause a membership (vacation, injury).', icon: '❄️', category: 'studio', templates: ['group_studio', 'yoga_studio', 'gym_membership'] },
  { id: 'retail-pos', name: 'Retail / POS', description: 'Sell water, apparel, gear at the front desk.', icon: '🏪', category: 'business', templates: ['group_studio', 'yoga_studio', 'gym_membership'] },

  // ════════════════════════════════════════════════════════════════
  //  MORE EXERCISE GROUP
  // ════════════════════════════════════════════════════════════════
  { id: 'family-discount-auto', name: 'Auto family discount', description: 'Apply the family rate automatically for related members.', icon: '👨‍👩‍👧', category: 'exercise', templates: ['exercise_group'] },
  { id: 'makeup-classes', name: 'Make-up classes', description: 'Track + credit make-up classes for missed sessions.', icon: '↩️', category: 'exercise', templates: ['exercise_group'] },
  { id: 'seasonal-pricing', name: 'Seasonal pricing', description: 'Different rates for summer / holiday sessions.', icon: '🗓️', category: 'exercise', templates: ['exercise_group'] },

  // ════════════════════════════════════════════════════════════════
  //  MORE 1-ON-1 / PRIVATE
  // ════════════════════════════════════════════════════════════════
  { id: 'program-templates', name: 'Program templates', description: 'Reusable workout programs you assign + tweak per client.', icon: '🗂️', category: 'private', templates: ['solo_trainer', 'athletic_performance', 'online_coach'] },
  { id: 'exercise-video-library', name: 'Exercise video library', description: 'Demo videos clients watch for each movement.', icon: '🎬', category: 'private', templates: ['solo_trainer', 'athletic_performance', 'online_coach'] },
  { id: 'pr-tracking', name: 'PR tracking', description: 'Track personal records + lift progression.', icon: '🏆', category: 'private', templates: ['solo_trainer', 'athletic_performance'] },
  { id: 'form-check-videos', name: 'Form-check videos', description: 'Clients upload lift videos; you annotate + reply.', icon: '📹', category: 'private', templates: ['solo_trainer', 'athletic_performance', 'online_coach'] },
  { id: 'periodization', name: 'Periodization blocks', description: 'Plan training in phases — base, build, peak, deload.', icon: '📐', category: 'private', templates: ['athletic_performance', 'solo_trainer'] },

  // ════════════════════════════════════════════════════════════════
  //  BUSINESS / GROWTH (any template)
  // ════════════════════════════════════════════════════════════════
  { id: 'referral-program', name: 'Referral program', description: 'Reward clients who bring a friend.', icon: '🎁', category: 'business', templates: 'all', suggest: 'Your happy clients are your best marketers — reward referrals.' },
  { id: 'gift-cards', name: 'Gift cards', description: 'Sell gift cards clients can give to friends.', icon: '💝', category: 'business', templates: 'all' },
  { id: 'loyalty-points', name: 'Loyalty points', description: 'Points for attendance + referrals, redeemable for perks.', icon: '⭐', category: 'business', templates: 'all' },
  { id: 'waivers-esign', name: 'Waivers & e-sign', description: 'Collect signed liability waivers at signup.', icon: '✍️', category: 'business', templates: 'all', suggest: 'Protect yourself — collect a signed waiver from every client.' },
  { id: 'automated-reviews', name: 'Review requests', description: 'Auto-ask happy clients for a Google review.', icon: '🌟', category: 'business', templates: 'all' },
  { id: 'churn-alerts', name: 'Churn alerts', description: 'Get warned when a client is about to quit.', icon: '⚠️', category: 'business', templates: 'all', unlocks: ['win-back-campaigns'] },
  { id: 'win-back-campaigns', name: 'Win-back campaigns', description: 'Auto-reach-out to members who drifted away.', icon: '🪃', category: 'business', templates: 'all' },
  { id: 'auto-rebill', name: 'Auto-rebill', description: 'Charge recurring memberships automatically each month.', icon: '🔄', category: 'business', templates: 'all' },
  { id: 'staff-roles', name: 'Staff & roles', description: 'Add staff with limited access to your app.', icon: '🧑‍💼', category: 'business', templates: 'all' },
  { id: 'multi-location', name: 'Multiple locations', description: 'Run more than one location from one account.', icon: '📍', category: 'business', templates: 'all' },
  { id: 'branded-client-app', name: 'Branded client app', description: 'Your logo + colors on the client-facing app.', icon: '📱', category: 'business', templates: 'all' },

  // ════════════════════════════════════════════════════════════════
  //  MORE MONEY & PAYMENTS (every template)
  // ════════════════════════════════════════════════════════════════
  { id: 'invoicing', name: 'Invoicing', description: 'Send professional invoices clients can pay.', icon: '🧾', category: 'crosscutting', templates: 'all', suggest: 'Look professional — send proper invoices.', unlocks: ['payment-plans', 'late-fees'] },
  { id: 'payment-plans', name: 'Payment plans', description: 'Split a big balance into scheduled installments.', icon: '📅', category: 'crosscutting', templates: 'all', unlocks: ['auto-rebill'] },
  { id: 'partial-payments', name: 'Partial payments', description: 'Accept partial payments toward a balance.', icon: '➗', category: 'crosscutting', templates: 'all' },
  { id: 'discounts-coupons', name: 'Discounts & coupons', description: 'Create discount codes and promos.', icon: '🏷️', category: 'crosscutting', templates: 'all' },
  { id: 'late-fees', name: 'Late fees', description: 'Auto-add a late fee to overdue balances.', icon: '⏰', category: 'crosscutting', templates: 'all' },
  { id: 'deposits', name: 'Deposits', description: 'Take a deposit to hold a spot or package.', icon: '💵', category: 'crosscutting', templates: 'all' },
  { id: 'tax-reports', name: 'Tax reports', description: 'Year-end income summary for taxes.', icon: '🧮', category: 'business', templates: 'all' },
  { id: 'refunds', name: 'Refunds & credits', description: 'Issue and track refunds and account credits.', icon: '↩️', category: 'crosscutting', templates: 'all' },

  // ════════════════════════════════════════════════════════════════
  //  MORE AI FEATURES (the smart layer, per template)
  // ════════════════════════════════════════════════════════════════
  { id: 'ai-weekly-digest', name: 'AI weekly digest', description: 'AI emails you a Monday summary of your whole business.', icon: '🤖', category: 'ai', templates: 'all' },
  { id: 'ai-email-writer', name: 'AI email writer', description: 'AI drafts client emails + newsletters in your voice.', icon: '🤖', category: 'ai', templates: 'all', unlocks: ['email-marketing'] },
  { id: 'ai-social-posts', name: 'AI social posts', description: 'AI writes social posts to promote your business.', icon: '🤖', category: 'ai', templates: 'all' },
  { id: 'ai-pricing-advisor', name: 'AI pricing advisor', description: 'AI suggests pricing from your market + how full you are.', icon: '🤖', category: 'ai', templates: 'all' },
  { id: 'ai-voice-notes', name: 'AI voice notes', description: 'Dictate a note; AI transcribes + files it for you.', icon: '🤖', category: 'ai', templates: 'all' },
  { id: 'ai-translate', name: 'AI translation', description: "Auto-translate client messages to their language.", icon: '🤖', category: 'ai', templates: 'all' },
  { id: 'ai-goal-setting', name: 'AI goal setting', description: 'AI helps set realistic client goals from their data.', icon: '🤖', category: 'ai', templates: ['nutrition_coach', 'solo_trainer', 'online_coach', 'athletic_performance'] },
  { id: 'ai-form-feedback', name: 'AI form feedback', description: "AI reviews a client's lift video + flags form issues.", icon: '🤖', category: 'ai', templates: ['solo_trainer', 'athletic_performance', 'online_coach'] },
  { id: 'ai-meal-photo', name: 'AI meal photo scan', description: 'Client snaps a meal; AI estimates portions + macros.', icon: '🤖', category: 'ai', templates: ['nutrition_coach'] },
  { id: 'ai-schedule-optimizer', name: 'AI schedule optimizer', description: 'AI suggests the best class times from real demand.', icon: '🤖', category: 'ai', templates: ['group_studio', 'yoga_studio', 'gym_membership'] },
  { id: 'ai-belt-readiness', name: 'AI test readiness', description: 'AI flags which students are ready to test for their next rank.', icon: '🤖', category: 'ai', templates: ['martial_arts'] },
  { id: 'ai-fight-matchmaker', name: 'AI matchmaker', description: 'AI suggests fair matchups by record + weight class.', icon: '🤖', category: 'ai', templates: ['boxing_gym'] },

  // ════════════════════════════════════════════════════════════════
  //  EVEN MORE NUTRITION
  // ════════════════════════════════════════════════════════════════
  { id: 'calorie-database', name: 'Food database', description: 'Searchable food + calorie database for clients.', icon: '🗃️', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'barcode-scanner', name: 'Barcode scanner', description: 'Scan packaged foods to log them fast.', icon: '📷', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'fasting-tracker', name: 'Fasting tracker', description: 'Track intermittent-fasting windows.', icon: '⏳', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'sleep-tracker', name: 'Sleep tracker', description: 'Log sleep quality alongside nutrition.', icon: '😴', category: 'nutrition', templates: ['nutrition_coach', 'online_coach'] },
  { id: 'mood-tracker', name: 'Mood & energy tracker', description: 'Track mood and energy with food choices.', icon: '🙂', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'allergen-tracker', name: 'Allergen tracker', description: 'Flag client allergies across recipes + plans.', icon: '⚠️', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'blood-work-tracking', name: 'Lab / blood-work tracking', description: 'Store + trend lab results over time.', icon: '🩸', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'meal-prep-planner', name: 'Meal-prep planner', description: 'Weekly meal-prep schedule for clients.', icon: '🥡', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'restaurant-guide', name: 'Eating-out guide', description: 'Smart ordering tips for restaurants.', icon: '🍴', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'recipe-scaler', name: 'Recipe scaler', description: 'Scale recipes to servings + macros.', icon: '⚖️', category: 'nutrition', templates: ['nutrition_coach'] },

  // ════════════════════════════════════════════════════════════════
  //  EVEN MORE MARTIAL ARTS
  // ════════════════════════════════════════════════════════════════
  { id: 'rank-certificates', name: 'Rank certificates', description: 'Auto-generate printable belt certificates.', icon: '📜', category: 'martial', templates: ['martial_arts'] },
  { id: 'parent-portal', name: 'Parent portal', description: "Parents see their kids' progress + attendance.", icon: '👪', category: 'martial', templates: ['martial_arts'] },
  { id: 'technique-video-library', name: 'Technique videos', description: 'Reference videos for each technique.', icon: '🎬', category: 'martial', templates: ['martial_arts'] },
  { id: 'demo-team', name: 'Demo / comp team', description: 'Manage a demonstration or competition team.', icon: '🤸', category: 'martial', templates: ['martial_arts'] },
  { id: 'dojo-store', name: 'Pro shop', description: 'Sell gis, belts, and gear to students.', icon: '🏪', category: 'business', templates: ['martial_arts'] },
  { id: 'board-breaking-log', name: 'Breaking log', description: 'Track board-breaking achievements per student.', icon: '🪵', category: 'martial', templates: ['martial_arts'] },
  { id: 'kids-rewards', name: 'Kids rewards', description: 'Stars + rewards to motivate young students.', icon: '🌟', category: 'martial', templates: ['martial_arts'] },

  // ════════════════════════════════════════════════════════════════
  //  EVEN MORE BOXING
  // ════════════════════════════════════════════════════════════════
  { id: 'training-camp-planner', name: 'Camp planner', description: 'Build a dated camp leading to fight night.', icon: '📆', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'corner-team', name: 'Corner team', description: 'Assign cutman + corner for each fighter.', icon: '🧑‍🤝‍🧑', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'recovery-tracker', name: 'Recovery tracker', description: 'Track rest, soreness, and injuries per fighter.', icon: '🩹', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'purse-tracking', name: 'Purse tracking', description: 'Track fight purses and payouts.', icon: '💰', category: 'business', templates: ['boxing_gym'] },
  { id: 'heart-rate-zones', name: 'Heart-rate zones', description: 'Log conditioning by heart-rate zone.', icon: '❤️', category: 'boxing', templates: ['boxing_gym'] },

  // ════════════════════════════════════════════════════════════════
  //  EVEN MORE GROUP STUDIO
  // ════════════════════════════════════════════════════════════════
  { id: 'qr-checkin', name: 'QR check-in', description: 'Members check in by scanning a QR code.', icon: '🔳', category: 'studio', templates: ['group_studio', 'yoga_studio', 'gym_membership'], suggest: 'Speed up the front desk — let members self-check-in.' },
  { id: 'member-kiosk', name: 'Check-in kiosk', description: 'A front-desk self-check-in screen.', icon: '🖥️', category: 'studio', templates: ['group_studio', 'yoga_studio', 'gym_membership'] },
  { id: 'room-management', name: 'Room management', description: 'Assign classes to rooms / studios.', icon: '🚪', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'equipment-booking', name: 'Equipment booking', description: 'Reserve reformers / bikes per spot.', icon: '🚲', category: 'studio', templates: ['yoga_studio', 'group_studio'] },
  { id: 'virtual-classes', name: 'Virtual classes', description: 'Stream classes live over Zoom.', icon: '💻', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'class-ratings', name: 'Class ratings', description: 'Members rate classes + instructors.', icon: '⭐', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'leaderboards', name: 'Leaderboards', description: 'Attendance + performance leaderboards.', icon: '🏆', category: 'studio', templates: ['group_studio', 'gym_membership'] },
  { id: 'challenges', name: 'Challenges', description: 'Run 30-day challenges + track participants.', icon: '🎯', category: 'growth', templates: ['group_studio', 'yoga_studio', 'gym_membership', 'nutrition_coach'], unlocks: ['leaderboards'] },
  { id: 'corporate-memberships', name: 'Corporate memberships', description: 'Sell memberships to local companies.', icon: '🏢', category: 'business', templates: ['group_studio', 'gym_membership', 'yoga_studio'] },
  { id: 'guest-passes', name: 'Guest passes', description: 'Members bring a friend for free.', icon: '🎟️', category: 'studio', templates: ['group_studio', 'yoga_studio', 'gym_membership'] },
  { id: 'locker-rental', name: 'Locker rental', description: 'Rent and track member lockers.', icon: '🔐', category: 'business', templates: ['gym_membership', 'group_studio'] },

  // ════════════════════════════════════════════════════════════════
  //  EVEN MORE EXERCISE GROUP (mom's model)
  // ════════════════════════════════════════════════════════════════
  { id: 'weather-cancellations', name: 'Weather cancellations', description: 'Cancel a class for weather + notify everyone.', icon: '🌧️', category: 'exercise', templates: ['exercise_group'] },
  { id: 'monthly-statements', name: 'Monthly statements', description: 'Email each member a monthly balance statement.', icon: '📄', category: 'exercise', templates: ['exercise_group'] },
  { id: 'class-capacity', name: 'Class capacity', description: 'Cap each day-group and show spots left.', icon: '🔢', category: 'exercise', templates: ['exercise_group'] },
  { id: 'substitute-instructor', name: 'Substitute notes', description: 'Note when a sub covers one of your classes.', icon: '🔄', category: 'exercise', templates: ['exercise_group'] },

  // ════════════════════════════════════════════════════════════════
  //  EVEN MORE 1-ON-1 / PRIVATE
  // ════════════════════════════════════════════════════════════════
  { id: 'session-packs', name: 'Session packs', description: 'Sell + track blocks of 1-on-1 sessions.', icon: '🎫', category: 'private', templates: ['solo_trainer', 'athletic_performance', 'online_coach'] },
  { id: 'wearable-sync', name: 'Wearable sync', description: 'Pull steps + heart rate from wearables.', icon: '⌚', category: 'private', templates: ['solo_trainer', 'athletic_performance', 'online_coach'] },
  { id: '1rm-calculator', name: '1-rep-max calculator', description: 'Estimate max + working weights from a set.', icon: '🧮', category: 'private', templates: ['solo_trainer', 'athletic_performance'] },
  { id: 'goal-milestones', name: 'Goal milestones', description: 'Set + celebrate client goal milestones.', icon: '🎉', category: 'private', templates: ['solo_trainer', 'online_coach', 'nutrition_coach'] },
  { id: 'in-body-scans', name: 'Body-comp scans', description: 'Log InBody / DEXA body-composition scans.', icon: '🧍', category: 'private', templates: ['solo_trainer', 'athletic_performance'] },
  { id: 'rest-timer', name: 'Rest timer', description: 'Built-in rest timer between sets.', icon: '⏱️', category: 'private', templates: ['solo_trainer', 'athletic_performance'] },

  // ════════════════════════════════════════════════════════════════
  //  MORE COMMUNICATION (every template)
  // ════════════════════════════════════════════════════════════════
  { id: 'group-broadcasts', name: 'Group broadcasts', description: 'Message a whole group in one tap.', icon: '📢', category: 'comms', templates: 'all', suggest: 'Message your whole group at once instead of one-by-one.' },
  { id: 'appointment-confirmations', name: 'Auto confirmations', description: 'Auto-confirm + remind before each session.', icon: '✅', category: 'comms', templates: 'all' },
  { id: 'two-way-sms', name: 'Two-way texting', description: 'Clients text back; you reply in-app.', icon: '💬', category: 'comms', templates: 'all' },
  { id: 'push-notifications', name: 'Push notifications', description: 'Send push alerts to the client app.', icon: '🔔', category: 'comms', templates: 'all' },
  { id: 'newsletter', name: 'Newsletter', description: 'Send a regular email newsletter.', icon: '📰', category: 'comms', templates: 'all', unlocks: ['email-marketing'] },
  { id: 'client-surveys', name: 'Client surveys', description: 'Collect feedback with quick surveys.', icon: '📝', category: 'comms', templates: 'all' },
  { id: 'announcement-board', name: 'Announcements', description: 'Post announcements clients see on login.', icon: '📌', category: 'comms', templates: 'all' },

  // ════════════════════════════════════════════════════════════════
  //  MORE GROWTH & BUSINESS (every template)
  // ════════════════════════════════════════════════════════════════
  { id: 'landing-pages', name: 'Landing pages', description: 'Build a marketing page for a specific offer.', icon: '🛬', category: 'growth', templates: 'all' },
  { id: 'lead-capture', name: 'Lead capture', description: 'Capture leads from your public page.', icon: '🧲', category: 'growth', templates: 'all', unlocks: ['free-trial-offers', 'email-marketing'] },
  { id: 'free-trial-offers', name: 'Free-trial offers', description: 'Offer a free trial and auto-convert to paid.', icon: '🆓', category: 'growth', templates: 'all' },
  { id: 'email-marketing', name: 'Email marketing', description: 'Run email campaigns to leads + clients.', icon: '📧', category: 'growth', templates: 'all' },
  { id: 'testimonials-wall', name: 'Testimonials', description: 'Show client testimonials on your page.', icon: '💬', category: 'growth', templates: 'all' },
  { id: 'before-after-gallery', name: 'Transformations', description: 'Showcase client before/after results.', icon: '🖼️', category: 'growth', templates: 'all', unlocks: ['testimonials-wall'] },
  { id: 'analytics-dashboard', name: 'Advanced analytics', description: 'Deep analytics on growth + revenue.', icon: '📊', category: 'business', templates: 'all' },
  { id: 'expense-tracking', name: 'Expense tracking', description: 'Track business expenses + see profit.', icon: '🧾', category: 'business', templates: 'all' },
  { id: 'google-business-sync', name: 'Google Business sync', description: 'Sync hours + reviews to your Google listing.', icon: '🔎', category: 'growth', templates: 'all' },
];

export const MODULE_BY_ID: Record<string, AppModule> = MODULES.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<string, AppModule>,
);

// ── Starter bundles — the default ON set per template ────────────────
// These mirror what each template app currently shows, so turning the
// module system on changes NOTHING for existing coaches until they
// open the switchboard.

const ALWAYS_CORE = ['dashboard', 'roster', 'settings', 'payments'];

export const STARTER_BUNDLES: Record<string, string[]> = {
  nutrition_coach: [
    ...ALWAYS_CORE,
    'habit-coaching', 'check-ins', 'recipes', 'intake-forms', 'resources',
    'ask-coach', 'public-profile', 'online-booking',
  ],
  martial_arts: [
    ...ALWAYS_CORE,
    'belt-ranks', 'class-schedule', 'attendance', 'family-memberships',
    'public-profile',
  ],
  boxing_gym: [
    ...ALWAYS_CORE,
    'fighter-records', 'rounds-training', 'tier-system', 'fight-card',
    'public-profile',
  ],
  group_studio: [
    ...ALWAYS_CORE,
    'class-schedule', 'class-types', 'instructors', 'bookings', 'attendance',
    'packages', 'public-profile', 'online-booking',
  ],
  exercise_group: [
    ...ALWAYS_CORE,
    'class-billing', 'day-groups', 'pause-records', 'notes-library',
    'reports', 'activity-log', 'birthdays', 'holidays', 'tags', 'custom-fields',
  ],
  babysitting: [
    ...ALWAYS_CORE,
    'family-memberships', 'day-groups', 'pause-records',
    'reports', 'activity-log', 'birthdays', 'sms-reminders', 'email-reminders',
  ],
  gym_membership: [...ALWAYS_CORE, 'class-schedule', 'attendance', 'packages', 'public-profile', 'birthdays', 'reports'],
  yoga_studio: [...ALWAYS_CORE, 'class-schedule', 'class-types', 'instructors', 'bookings', 'packages', 'public-profile', 'birthdays', 'reports'],
  solo_trainer: [
    ...ALWAYS_CORE,
    'session-logging', 'workout-builder', 'packages', 'public-profile',
    'progress-graphs', 'body-measurements', 'progress-photos', 'birthdays', 'reports',
  ],
  athletic_performance: [
    ...ALWAYS_CORE,
    'session-logging', 'workout-builder', 'public-profile',
    'progress-graphs', 'body-measurements', 'pr-tracking', 'birthdays', 'reports',
  ],
  online_coach: [
    ...ALWAYS_CORE,
    'check-ins', 'session-logging', 'workout-builder', 'intake-forms', 'public-profile',
    'progress-graphs', 'progress-photos', 'birthdays', 'reports',
  ],
};

export function starterBundle(templateSlug: string | undefined): string[] {
  if (templateSlug && STARTER_BUNDLES[templateSlug]) return STARTER_BUNDLES[templateSlug];
  return ALWAYS_CORE;
}

/** Modules available to OFFER for a given template (for the switchboard). */
export function modulesForTemplate(templateSlug: string | undefined): AppModule[] {
  return MODULES.filter(
    (m) =>
      m.templates === 'all' ||
      (templateSlug ? m.templates.includes(templateSlug) : false),
  );
}

/** Modules offered to ANY of the picked templates — the COMBINED set for a
 *  coach who does several things at once (e.g. nutrition + martial arts +
 *  1-on-1). De-duped, preserving catalog order so categories stay grouped. */
export function modulesForTemplates(slugs: string[] | undefined): AppModule[] {
  const picked = (slugs ?? []).filter(Boolean);
  if (picked.length === 0) return MODULES.filter((m) => m.templates === 'all');
  const set = new Set(picked);
  return MODULES.filter(
    (m) => m.templates === 'all' || m.templates.some((t) => set.has(t)),
  );
}

/** The default-ON set for a coach who picked several templates — the union
 *  of every picked template's starter bundle, de-duped. */
export function starterBundleForTemplates(slugs: string[] | undefined): string[] {
  const picked = (slugs ?? []).filter(Boolean);
  if (picked.length === 0) return [...ALWAYS_CORE];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const slug of picked) {
    for (const id of starterBundle(slug)) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** A contextual suggestion: a module to turn on next, plus WHY. */
export interface ModuleSuggestion {
  module: AppModule;
  reason: string;
}

/** The smart "do this → get more" engine. Given what's already on,
 *  returns the next features to suggest — driven by:
 *    1. affinity: a module is on whose `unlocks` lists this one
 *       → "Pairs with <that module>"
 *    2. static nudges: the module's own `suggest` line
 *  Only suggests modules offered to this template and not already on. */
export function suggestionsFor(
  enabled: Set<string>,
  templateSlug: string | string[] | undefined,
): ModuleSuggestion[] {
  const offeredList = Array.isArray(templateSlug)
    ? modulesForTemplates(templateSlug)
    : modulesForTemplate(templateSlug);
  const offered = new Set(offeredList.map((m) => m.id));
  const isOnOrCore = (id: string) => enabled.has(id) || !!MODULE_BY_ID[id]?.core;
  const out: ModuleSuggestion[] = [];
  const seen = new Set<string>();

  // 1) Affinity-driven: anything unlocked by an enabled module.
  for (const m of MODULES) {
    if (!isOnOrCore(m.id) || !m.unlocks) continue;
    for (const targetId of m.unlocks) {
      if (seen.has(targetId)) continue;
      if (!offered.has(targetId)) continue;
      if (isOnOrCore(targetId)) continue;
      const target = MODULE_BY_ID[targetId];
      if (!target) continue;
      seen.add(targetId);
      out.push({ module: target, reason: `Pairs with ${m.name}` });
    }
  }

  // 2) Static nudges for offered, not-yet-on modules with a `suggest`.
  for (const m of MODULES) {
    if (seen.has(m.id)) continue;
    if (!m.suggest || m.core) continue;
    if (!offered.has(m.id) || isOnOrCore(m.id)) continue;
    seen.add(m.id);
    out.push({ module: m, reason: m.suggest });
  }

  return out;
}

// ── Hook ─────────────────────────────────────────────────────────────

interface TrainerModulesRow {
  public_profile: Record<string, unknown> | null;
}

export function useEnabledModules(templateSlug: string | string[] | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Accept a single slug or a list of disciplines. The default ON set for a
  // brand-new account is the union of every picked discipline's bundle.
  const slugs = Array.isArray(templateSlug)
    ? templateSlug
    : templateSlug
      ? [templateSlug]
      : [];

  const query = useQuery({
    queryKey: ['app-modules', user?.id],
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('trainers')
        .select('public_profile')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      const profile = (data as TrainerModulesRow).public_profile ?? {};
      const stored = (profile as Record<string, unknown>).modules as
        | { enabled?: string[] }
        | undefined;
      if (stored?.enabled && Array.isArray(stored.enabled)) {
        return new Set(stored.enabled);
      }
      // No stored set yet — default to the combined starter bundle.
      return new Set(starterBundleForTemplates(slugs));
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async (next: Set<string>) => {
      if (!user) throw new Error('Not signed in');
      const { data: cur, error: e1 } = await supabase
        .from('trainers')
        .select('public_profile')
        .eq('id', user.id)
        .single();
      if (e1) throw e1;
      const profile = ((cur as TrainerModulesRow | null)?.public_profile ?? {}) as Record<
        string,
        unknown
      >;
      const nextProfile = { ...profile, modules: { enabled: Array.from(next) } };
      const { error } = await supabase
        .from('trainers')
        .update({ public_profile: nextProfile })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-modules'] }),
  });

  const enabled = query.data ?? new Set(starterBundleForTemplates(slugs));

  function isOn(id: string): boolean {
    const mod = MODULE_BY_ID[id];
    if (mod?.core) return true;
    return enabled.has(id);
  }

  function toggle(id: string) {
    const mod = MODULE_BY_ID[id];
    if (mod?.core) return; // can't toggle core
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    save.mutate(next);
  }

  return { enabled, isOn, toggle, isLoading: query.isLoading, saving: save.isPending };
}
