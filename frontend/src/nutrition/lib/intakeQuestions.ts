// Expanded intake-questionnaire catalog for the nutrition coach app.
// All questions written fresh for Trainer Pro from general
// nutrition-coaching practice (motivational interviewing, behavior-
// change frameworks, RD textbook intake patterns) — no content
// pulled from any third-party coaching curriculum.
//
// ~70 questions across 8 sections. Each section has a "purpose" line
// that helps the coach understand what the answers should reveal.

export type IntakeFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'number'
  | 'date'
  | 'scale_1_10';

export interface IntakeQuestion {
  id: string;
  label: string;
  help?: string;
  type: IntakeFieldType;
  options?: string[];
  required?: boolean;
  /** If set, only show this question when another answer matches. */
  showIf?: { id: string; value: string };
}

export interface IntakeSection {
  id: string;
  section: string;
  purpose: string;
  questions: IntakeQuestion[];
}

export const INTAKE_SECTIONS: IntakeSection[] = [
  // ── 1. The story ─────────────────────────────────────────────────
  {
    id: 'story',
    section: 'The story — why now',
    purpose:
      "Get inside the moment they decided to reach out. The 'why now' is more important than the 'why ever'.",
    questions: [
      {
        id: 'why_now',
        label: "What pushed them to do something about this NOW (vs. a year ago)?",
        help: 'A specific event, a number on a scale, a comment from a doctor, a photo, anything.',
        type: 'textarea',
        required: true,
      },
      {
        id: 'success_3mo',
        label: 'What does success look like in 3 months — in their words?',
        help: "The visible outcome they're after. Their phrasing, not yours.",
        type: 'textarea',
      },
      {
        id: 'success_1yr',
        label: 'And in a year?',
        type: 'textarea',
      },
      {
        id: 'best_outcome_feel',
        label: "If everything works, what does it FEEL like a year from now?",
        help: 'Energy, mood, confidence, what they wear, what they do on a Saturday morning.',
        type: 'textarea',
      },
      {
        id: 'past_efforts',
        label: 'What have they tried before?',
        help: 'Diets, programs, apps, gyms, coaches. The whole graveyard.',
        type: 'textarea',
      },
      {
        id: 'what_worked',
        label: 'In all of that, what worked even a little — and for how long?',
        type: 'textarea',
      },
      {
        id: 'what_didnt',
        label: 'And what definitely DID NOT work — and why they think it failed?',
        type: 'textarea',
      },
      {
        id: 'biggest_change',
        label: "What's changed in the last 12 months that affects this?",
        help: 'Job, move, baby, divorce, illness, surgery, loss. Context matters.',
        type: 'textarea',
      },
    ],
  },

  // ── 2. Body & history ────────────────────────────────────────────
  {
    id: 'body',
    section: 'Body & medical history',
    purpose:
      'Surface anything that affects metabolism, energy, hunger, or what they can/should do.',
    questions: [
      {
        id: 'height',
        label: 'Height',
        type: 'text',
      },
      {
        id: 'weight_now',
        label: 'Current weight',
        type: 'text',
      },
      {
        id: 'weight_goal',
        label: 'Goal weight (if applicable)',
        type: 'text',
      },
      {
        id: 'weight_history',
        label: 'Weight history — highest, lowest, where they\'ve spent most of their adult life',
        type: 'textarea',
      },
      {
        id: 'conditions',
        label: 'Diagnosed medical conditions?',
        help: 'Diabetes, thyroid, PCOS, hypertension, autoimmune, GI, mental health, anything.',
        type: 'textarea',
      },
      {
        id: 'medications',
        label: 'Current medications + supplements',
        help: 'Including birth control, antidepressants, anything that affects appetite or metabolism.',
        type: 'textarea',
      },
      {
        id: 'allergies',
        label: 'Food allergies, intolerances, or strong dislikes',
        type: 'textarea',
      },
      {
        id: 'gi_issues',
        label: 'Any digestive issues to be aware of?',
        help: 'IBS, reflux, constipation, bloating, food sensitivities.',
        type: 'textarea',
      },
      {
        id: 'energy_level',
        label: 'Daily energy level right now (1-10)',
        type: 'scale_1_10',
      },
      {
        id: 'hunger_pattern',
        label: 'When during the day are they hungriest?',
        type: 'select',
        options: [
          'Morning right away',
          'Mid-morning',
          'After lunch / 3pm crash',
          'Evening / after dinner',
          "Never feel real hunger",
          "Constantly hungry",
        ],
      },
      {
        id: 'cycle_aware',
        label: 'For menstruating clients — do cravings/hunger shift with the cycle?',
        type: 'select',
        options: ['Yes, dramatically', 'A little', 'No', 'Not applicable'],
      },
      {
        id: 'doctor_cleared',
        label: 'Cleared by a physician for nutrition + exercise work?',
        type: 'select',
        options: ['Yes', 'No — still waiting', 'Not sure', "Don't see a doctor"],
      },
    ],
  },

  // ── 3. Current eating ────────────────────────────────────────────
  {
    id: 'eating',
    section: 'Current eating patterns',
    purpose:
      'A snapshot of what they actually eat — not aspirations. Truth, not best foot forward.',
    questions: [
      {
        id: 'typical_day',
        label: 'Walk through a typical weekday — wake to sleep.',
        help: 'Coffee, meals, snacks, drinks, times, rough portions. No judgment, just the truth.',
        type: 'textarea',
      },
      {
        id: 'typical_weekend',
        label: 'How is a typical Saturday or Sunday different?',
        type: 'textarea',
      },
      {
        id: 'first_food',
        label: 'How soon after waking do they eat?',
        type: 'select',
        options: [
          'Within 30 min',
          '1-2 hours',
          '3-4 hours',
          "Don't eat until lunch",
          'Skip breakfast entirely',
        ],
      },
      {
        id: 'meals_per_day',
        label: 'How many real meals per day?',
        type: 'select',
        options: ['1', '2', '3', '4', '5+', 'No structure — graze all day'],
      },
      {
        id: 'snack_pattern',
        label: 'Snacking pattern',
        type: 'select',
        options: [
          'Rarely snack',
          'One planned snack between meals',
          'Multiple planned snacks',
          'Graze on whatever is around',
          'Nighttime snacking is the issue',
        ],
      },
      {
        id: 'biggest_meal',
        label: "What's their biggest meal of the day?",
        type: 'select',
        options: ['Breakfast', 'Lunch', 'Dinner', 'Evening graze'],
      },
      {
        id: 'pattern',
        label: 'Eating style or framework they identify with',
        type: 'select',
        options: [
          'Omnivore — no restrictions',
          'Pescatarian',
          'Vegetarian',
          'Vegan',
          'Mediterranean',
          'Keto / low-carb',
          'Paleo',
          'Gluten-free (medical)',
          'Gluten-free (choice)',
          'Kosher',
          'Halal',
          'Other',
        ],
      },
      {
        id: 'cooks',
        label: 'Who does the cooking?',
        type: 'text',
      },
      {
        id: 'cooking_skill',
        label: 'Comfort with cooking (1-10)',
        type: 'scale_1_10',
      },
      {
        id: 'meal_prep',
        label: 'Do they meal prep?',
        type: 'select',
        options: [
          'Yes — most weeks',
          'Sometimes',
          'Used to, lost the habit',
          'Never tried',
        ],
      },
      {
        id: 'eats_out',
        label: 'How often eating out / ordering in / grab-and-go',
        type: 'select',
        options: [
          'Rarely (under 1x/wk)',
          '1-2x/week',
          '3-4x/week',
          '5+ times/week',
          'Most meals',
        ],
      },
      {
        id: 'liquid_calories',
        label: 'Daily drinks beyond water — coffee, juice, soda, smoothies, alcohol',
        help: 'Include cream, sugar, syrups. Liquid calories are usually undercounted.',
        type: 'textarea',
      },
      {
        id: 'water_intake',
        label: 'Roughly how much water per day?',
        type: 'select',
        options: [
          'Under 1 glass',
          '2-4 glasses',
          '5-7 glasses',
          '8+ glasses',
          "Don't track",
        ],
      },
      {
        id: 'fav_foods',
        label: 'Foods they love most',
        type: 'textarea',
      },
      {
        id: 'foods_avoid',
        label: 'Foods they avoid (allergy, intolerance, preference)',
        type: 'textarea',
      },
    ],
  },

  // ── 4. Movement & sleep ──────────────────────────────────────────
  {
    id: 'movement',
    section: 'Movement, sleep & stress',
    purpose:
      'Three lifestyle pillars that move the needle as much as food. Often more.',
    questions: [
      {
        id: 'training',
        label: 'Current exercise routine',
        help: 'Type, frequency, duration, intensity. Be specific.',
        type: 'textarea',
      },
      {
        id: 'daily_steps',
        label: 'Roughly how many steps a day?',
        type: 'select',
        options: [
          'Under 3,000',
          '3,000-5,000',
          '5,000-8,000',
          '8,000-10,000',
          '10,000+',
          "Don't track",
        ],
      },
      {
        id: 'training_loves',
        label: 'What kind of movement do they actually enjoy?',
        type: 'textarea',
      },
      {
        id: 'training_dread',
        label: 'What do they DREAD?',
        help: "Important — we won't program things they hate.",
        type: 'textarea',
      },
      {
        id: 'sleep_hours',
        label: 'Average sleep (hours/night, weekdays)',
        type: 'select',
        options: ['<5', '5-6', '6-7', '7-8', '8+'],
      },
      {
        id: 'sleep_quality',
        label: 'Sleep quality (1-10)',
        type: 'scale_1_10',
      },
      {
        id: 'sleep_issues',
        label: 'Sleep problems?',
        type: 'multiselect',
        options: [
          'Hard to fall asleep',
          'Wake in the middle of the night',
          'Wake too early',
          'Restless / unrefreshing',
          'Snoring / sleep apnea',
          'Nighttime kids / pets',
          'None',
        ],
      },
      {
        id: 'stress_level',
        label: 'Current stress level (1-10)',
        type: 'scale_1_10',
      },
      {
        id: 'stress_source',
        label: "What's driving the stress?",
        type: 'textarea',
      },
      {
        id: 'stress_outlet',
        label: 'How do they currently cope with stress?',
        help: 'Honest answer. Food, scrolling, alcohol, exercise, friends — whatever it is.',
        type: 'textarea',
      },
      {
        id: 'alcohol',
        label: 'Alcohol use',
        type: 'select',
        options: [
          'None',
          'Special occasions only',
          '1-2 drinks/week',
          '3-5 drinks/week',
          '1-2 drinks most days',
          'Daily, multiple',
        ],
      },
      {
        id: 'caffeine',
        label: 'Caffeine intake',
        type: 'textarea',
      },
    ],
  },

  // ── 5. Mindset & food relationship ───────────────────────────────
  {
    id: 'mindset',
    section: 'Mindset & relationship with food',
    purpose:
      "How they THINK about food matters as much as what they eat. Look for restriction history, all-or-nothing patterns, identity stories.",
    questions: [
      {
        id: 'diet_history',
        label: 'History of dieting?',
        type: 'select',
        options: [
          'No real dieting history',
          '1-2 attempts ever',
          'Several over the years',
          'Constant cycling for years',
          'In a diet right now',
        ],
      },
      {
        id: 'restriction',
        label: 'Have they tried being "very strict" with food?',
        help: 'What happened? How long did it last? What broke it?',
        type: 'textarea',
      },
      {
        id: 'emotional_eating',
        label: 'When do they eat for reasons other than hunger?',
        type: 'multiselect',
        options: [
          'Boredom',
          'Stress / anxiety',
          'Loneliness',
          'Celebration / reward',
          'Tiredness',
          'Procrastination',
          'Sadness',
          'When happy',
          'Never — only hungry',
        ],
      },
      {
        id: 'binge_pattern',
        label: 'Any pattern of binge eating?',
        type: 'select',
        options: ['Never', 'Rarely', 'Monthly', 'Weekly', 'Multiple times a week'],
      },
      {
        id: 'food_rules',
        label: "What food rules do they currently hold?",
        help: 'No carbs after 6, no eating between meals, no dessert, etc.',
        type: 'textarea',
      },
      {
        id: 'food_guilt',
        label: 'How often do they feel guilty about something they ate?',
        type: 'select',
        options: ['Never', 'Rarely', 'Weekly', 'Most days', 'Every day'],
      },
      {
        id: 'identity_athlete',
        label: 'Do they see themselves as someone who exercises?',
        type: 'select',
        options: [
          'Yes, strongly',
          'Sort of',
          'No, but I want to',
          'No — never have been',
        ],
      },
      {
        id: 'identity_eater',
        label: 'How would they describe themselves as an eater?',
        help: "Their words. Don't lead them.",
        type: 'textarea',
      },
      {
        id: 'body_image',
        label: 'Current relationship with their body (1-10, 10 = peace)',
        type: 'scale_1_10',
      },
    ],
  },

  // ── 6. Logistics & environment ───────────────────────────────────
  {
    id: 'logistics',
    section: 'Logistics & environment',
    purpose:
      "The boring details that make or break execution — schedule, kitchen, who else eats with them.",
    questions: [
      {
        id: 'household',
        label: 'Who else lives in the house?',
        help: 'Partner, kids (ages), roommates. They all affect the kitchen.',
        type: 'textarea',
      },
      {
        id: 'shopping',
        label: 'Who does the grocery shopping?',
        type: 'select',
        options: ['I do', 'Partner', 'Split', 'Delivery / pickup', 'Other'],
      },
      {
        id: 'work_schedule',
        label: 'Typical work schedule',
        help: 'Hours, commute, shift work, work-from-home, travel days.',
        type: 'textarea',
      },
      {
        id: 'lunch_setup',
        label: 'Lunch setup',
        type: 'select',
        options: [
          'Pack from home',
          'Cafeteria at work',
          'Buy nearby',
          'Skip lunch',
          'Eat at home',
        ],
      },
      {
        id: 'kitchen',
        label: 'Kitchen reality',
        type: 'multiselect',
        options: [
          'Have time to cook on weeknights',
          'Time only on weekends',
          'Tiny kitchen / limited equipment',
          'Roommates or family use it too',
          'Travel for work frequently',
          'Dorm / shared kitchen',
        ],
      },
      {
        id: 'budget',
        label: 'Food budget — comfortable or tight?',
        type: 'select',
        options: [
          'Comfortable — quality is the priority',
          'Moderate',
          'Tight — needs to fit a budget',
          'Very limited',
        ],
      },
      {
        id: 'travel_pattern',
        label: 'Travel days per month',
        type: 'select',
        options: ['0', '1-2', '3-5', '6-10', '10+'],
      },
    ],
  },

  // ── 7. Coaching fit & accountability ─────────────────────────────
  {
    id: 'coaching_fit',
    section: 'Coaching fit & accountability',
    purpose:
      'How they want to be coached. The wrong style = failed engagement, even with the right plan.',
    questions: [
      {
        id: 'preferred_checkin',
        label: 'How often would they like a check-in?',
        type: 'select',
        options: ['Daily', 'Twice a week', 'Weekly', 'Every 2 weeks', 'Monthly'],
      },
      {
        id: 'checkin_format',
        label: 'Preferred check-in format',
        type: 'multiselect',
        options: [
          'Quick text message',
          'Form / structured survey',
          'Voice memo',
          'Video call',
          'In-person',
        ],
      },
      {
        id: 'accountability_style',
        label: 'How they respond to accountability',
        type: 'select',
        options: [
          'Need someone watching to stay on track',
          'Self-motivated with light check-ins',
          'Resent being monitored',
          'Depends on the topic',
        ],
      },
      {
        id: 'feedback_style',
        label: 'Feedback style they want from me',
        type: 'select',
        options: [
          'Hard truths, no sugar-coating',
          'Honest but warm',
          'Encouraging — call out the wins first',
          'Mostly listen — let me figure it out',
        ],
      },
      {
        id: 'biggest_obstacle',
        label: "What's the biggest obstacle they see right now?",
        type: 'textarea',
      },
      {
        id: 'self_sabotage',
        label: 'When this falls apart for them, what does it usually look like?',
        help: 'Honest patterns — Friday wine, vacation derail, work stress meltdown, etc.',
        type: 'textarea',
      },
      {
        id: 'support',
        label: 'Who is in their corner?',
        type: 'textarea',
      },
      {
        id: 'support_obstacles',
        label: 'Anyone at home who actively makes this harder?',
        help: 'Spouse buying junk, parent commenting on weight, etc. Coach with eyes open.',
        type: 'textarea',
      },
    ],
  },

  // ── 8. Stage of change ───────────────────────────────────────────
  {
    id: 'readiness',
    section: 'Readiness & stage of change',
    purpose:
      "Decide whether to push, build skill, or just listen. Don't prescribe action to someone in contemplation.",
    questions: [
      {
        id: 'stage',
        label: 'Right now, they are...',
        type: 'select',
        options: [
          "Just thinking about change — not ready to act",
          'Getting ready to start, planning the first move',
          'Actively making changes right now',
          'Maintaining changes that are already in place',
          'Slipped back and trying to get going again',
        ],
      },
      {
        id: 'confidence',
        label: 'Confidence that they can make these changes (1-10)',
        type: 'scale_1_10',
        help: "If under 7, the practice is too big. Make it smaller.",
      },
      {
        id: 'importance',
        label: "How important is this to them, right now (1-10)?",
        type: 'scale_1_10',
      },
      {
        id: 'commitment',
        label: 'How many minutes/day are they willing to spend on this?',
        type: 'select',
        options: [
          '5 minutes max',
          '15 minutes',
          '30 minutes',
          '45-60 minutes',
          'As long as it takes',
        ],
      },
      {
        id: 'first_step',
        label: 'If they could only change ONE thing this month — what would it be?',
        type: 'textarea',
      },
      {
        id: 'permission',
        label: 'What do they want my permission to NOT do?',
        help: 'Important. Some clients arrive wanting to be told "you don\'t have to be perfect about X."',
        type: 'textarea',
      },
      {
        id: 'red_flags',
        label: 'Any red flags for me (private — client never sees)',
        help: 'Active ED history, depression, recent loss, abusive home, anything that needs a referral.',
        type: 'textarea',
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════
//  Per-practice CHECK-IN questions
//
// When a client is on practice X, the weekly check-in asks different
// questions than when they're on practice Y. The right question
// surfaces the specific obstacle for the specific habit.
// ══════════════════════════════════════════════════════════════════════

export interface CheckinQuestion {
  id: string;
  label: string;
  help?: string;
  type: IntakeFieldType;
  options?: string[];
}

export const CHECKIN_QUESTIONS_BY_PRACTICE: Record<string, CheckinQuestion[]> = {
  'eat-slowly': [
    {
      id: 'slow_meals_pct',
      label: 'Out of all meals this week, roughly what % did you slow down for?',
      type: 'select',
      options: ['0-25%', '25-50%', '50-75%', '75-100%'],
    },
    {
      id: 'slow_easiest',
      label: 'Which meal was easiest to slow down?',
      type: 'text',
    },
    {
      id: 'slow_hardest',
      label: 'Which was hardest — and why?',
      type: 'textarea',
    },
    {
      id: 'slow_confidence',
      label: 'Confidence you can keep this going next week (1-10)',
      type: 'scale_1_10',
    },
  ],

  'no-screens-meals': [
    {
      id: 'screen_meals_screenfree',
      label: 'How many of your meals this week were screen-free?',
      type: 'text',
    },
    {
      id: 'screen_difference',
      label: 'Did the screen-free meals feel different? How?',
      type: 'textarea',
    },
    {
      id: 'screen_trigger',
      label: 'What pulled you back toward the screen?',
      type: 'textarea',
    },
  ],

  hydration: [
    {
      id: 'water_glasses_avg',
      label: 'Average glasses of water per day this week',
      type: 'select',
      options: ['Under 2', '2-4', '5-7', '8+'],
    },
    {
      id: 'water_easiest_time',
      label: 'When was water easiest to fit in?',
      type: 'text',
    },
    {
      id: 'water_skipped_days',
      label: 'Days you forgot — what was happening?',
      type: 'textarea',
    },
  ],

  'protein-each-meal': [
    {
      id: 'protein_meals_pct',
      label: 'What % of meals included a palm of protein?',
      type: 'select',
      options: ['0-25%', '25-50%', '50-75%', '75-100%'],
    },
    {
      id: 'protein_missed_meal',
      label: 'Which meal was hardest to add protein to?',
      type: 'select',
      options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'No meal was hard'],
    },
    {
      id: 'protein_favorite',
      label: 'Which protein source worked best this week?',
      type: 'text',
    },
  ],

  'meal-rhythm': [
    {
      id: 'rhythm_days_hit',
      label: 'Days you ate 3 meals at roughly normal times',
      type: 'select',
      options: ['0-1', '2-3', '4-5', '6-7'],
    },
    {
      id: 'rhythm_skip',
      label: 'Days you skipped a meal — what was going on?',
      type: 'textarea',
    },
  ],

  'meal-prep-3x': [
    {
      id: 'prep_meals_count',
      label: 'How many meals did you actually prep this week?',
      type: 'number',
    },
    {
      id: 'prep_what_worked',
      label: 'What worked about the prep session?',
      type: 'textarea',
    },
    {
      id: 'prep_blocker',
      label: 'If you didn\'t prep — what got in the way?',
      type: 'textarea',
    },
  ],

  'grocery-list': [
    {
      id: 'list_used',
      label: 'Did you shop from a written list?',
      type: 'select',
      options: ['Every trip', 'Most trips', 'Sometimes', 'No'],
    },
    {
      id: 'list_impulse',
      label: 'Anything in the cart that wasn\'t on the list?',
      type: 'textarea',
    },
  ],

  'sleep-7h': [
    {
      id: 'sleep_avg',
      label: 'Average hours of sleep per night this week',
      type: 'select',
      options: ['<6', '6', '6.5', '7', '7.5', '8+'],
    },
    {
      id: 'sleep_bedtime',
      label: 'Average bedtime',
      type: 'text',
    },
    {
      id: 'sleep_obstacle',
      label: 'What\'s the #1 thing keeping you up later?',
      type: 'textarea',
    },
  ],

  'five-breaths': [
    {
      id: 'breath_meals_pct',
      label: '% of meals where you remembered the 5-breath pause',
      type: 'select',
      options: ['0-25%', '25-50%', '50-75%', '75-100%'],
    },
    {
      id: 'breath_effect',
      label: 'Notice any difference in those meals vs the rushed ones?',
      type: 'textarea',
    },
  ],

  'stress-walk': [
    {
      id: 'walk_days',
      label: 'Days you took the 10-min walk',
      type: 'select',
      options: ['0-1', '2-3', '4-5', '6-7'],
    },
    {
      id: 'walk_best_time',
      label: 'What time of day worked best?',
      type: 'text',
    },
    {
      id: 'walk_effect',
      label: 'Notice any difference in mood / focus / hunger that day?',
      type: 'textarea',
    },
  ],

  'movement-weekly': [
    {
      id: 'move_sessions',
      label: 'Movement sessions this week',
      type: 'number',
    },
    {
      id: 'move_type',
      label: 'What kinds of movement?',
      type: 'text',
    },
    {
      id: 'move_feel',
      label: 'How did your body feel after each one?',
      type: 'textarea',
    },
  ],

  'something-not-nothing': [
    {
      id: 'snn_wins',
      label: 'A "something" you did this week instead of skipping entirely',
      type: 'textarea',
    },
    {
      id: 'snn_skip',
      label: 'A day you DID let it go entirely — what happened?',
      type: 'textarea',
    },
  ],

  'eat-to-80': [
    {
      id: 'fullness_avg',
      label: 'Average fullness rating at end of meals (1-10)',
      type: 'scale_1_10',
    },
    {
      id: 'overshoot_meal',
      label: 'Meal you most reliably overshoot at',
      type: 'select',
      options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Restaurants', 'No clear pattern'],
    },
    {
      id: 'stop_easier',
      label: 'Where it was easiest to stop at 80%',
      type: 'textarea',
    },
  ],

  'nighttime-cutoff': [
    {
      id: 'cutoff_nights_clean',
      label: 'Nights you stayed out of the kitchen after dinner',
      type: 'select',
      options: ['0-1', '2-3', '4-5', '6-7'],
    },
    {
      id: 'cutoff_trigger',
      label: 'When the nighttime urge hit — what was going on?',
      type: 'textarea',
    },
    {
      id: 'cutoff_replacement',
      label: 'Did anything help replace the ritual (tea, brushing teeth, etc.)?',
      type: 'textarea',
    },
  ],

  'veggies-each-meal': [
    {
      id: 'veg_meals_pct',
      label: '% of meals that included veggies',
      type: 'select',
      options: ['0-25%', '25-50%', '50-75%', '75-100%'],
    },
    {
      id: 'veg_winning',
      label: 'Veggie that\'s been a hit this week',
      type: 'text',
    },
    {
      id: 'veg_missing_meal',
      label: 'Meal that\'s still hard to add veggies to',
      type: 'text',
    },
  ],

  'balanced-plate': [
    {
      id: 'balanced_meals_pct',
      label: '% of meals that hit protein + veg + fat (+ optional carb)',
      type: 'select',
      options: ['0-25%', '25-50%', '50-75%', '75-100%'],
    },
    {
      id: 'balanced_satiety',
      label: 'Did satisfied-til-the-next-meal happen more often this week?',
      type: 'select',
      options: ['Yes, dramatically', 'A little', 'About the same', 'Worse'],
    },
  ],

  'liquid-calories': [
    {
      id: 'liquid_swaps',
      label: 'Drinks you swapped out this week',
      type: 'textarea',
    },
    {
      id: 'liquid_hard_one',
      label: 'Which liquid was hardest to give up?',
      type: 'text',
    },
  ],

  'volume-eating': [
    {
      id: 'volume_meals',
      label: 'Meals where you led with volume foods (soup, salad, veg)',
      type: 'select',
      options: ['0-3', '4-7', '8-12', '13+'],
    },
    {
      id: 'volume_satiety',
      label: 'Notice a difference in how full you felt after?',
      type: 'textarea',
    },
  ],

  'whole-foods-most': [
    {
      id: 'whole_pct',
      label: 'Roughly what % of meals were whole-food-based?',
      type: 'select',
      options: ['Under 50%', '50-70%', '70-80%', '80-90%', '90%+'],
    },
    {
      id: 'whole_easy_swap',
      label: 'A processed food you swapped for a whole one',
      type: 'text',
    },
  ],

  'hand-portion-protein': [
    {
      id: 'hpp_meals_pct',
      label: '% of meals where protein hit the palm portion',
      type: 'select',
      options: ['0-25%', '25-50%', '50-75%', '75-100%'],
    },
    {
      id: 'hpp_too_much_too_little',
      label: 'Were portions usually under, on, or over the palm?',
      type: 'select',
      options: ['Under', 'On', 'Over'],
    },
  ],

  'emotional-eating-pause': [
    {
      id: 'pause_count',
      label: 'Times you used the 5-min pause this week',
      type: 'number',
    },
    {
      id: 'pause_outcome',
      label: 'What happened after the pause?',
      type: 'select',
      options: [
        'Urge passed, didn\'t eat',
        'Ate, but a smaller version',
        'Ate the same, but on purpose',
        'Lost the pause, ate anyway',
      ],
    },
    {
      id: 'pause_emotion',
      label: 'What feeling came up most?',
      type: 'select',
      options: ['Stress', 'Boredom', 'Loneliness', 'Sadness', 'Tiredness', 'Anger', 'Other'],
    },
  ],

  'mindful-indulgence': [
    {
      id: 'mi_count',
      label: 'Planned indulgences this week',
      type: 'number',
    },
    {
      id: 'mi_satisfied',
      label: 'Did you feel actually satisfied after?',
      type: 'select',
      options: ['Yes — completely', 'Mostly', 'Wanted more', 'Felt guilty after'],
    },
    {
      id: 'mi_unplanned',
      label: 'Unplanned grazing on treats this week',
      type: 'textarea',
    },
  ],

  'identity-statement': [
    {
      id: 'identity_read',
      label: 'Days you read your identity statement',
      type: 'select',
      options: ['0-1', '2-3', '4-5', '6-7'],
    },
    {
      id: 'identity_evidence',
      label: 'One thing you did this week that proves the identity is real',
      type: 'textarea',
    },
  ],
};

/** Get the right check-in questions for a client's currently-assigned
 *  practice, with sensible fallback for practices that have no
 *  specific question set yet. */
export const GENERIC_CHECKIN_QUESTIONS: CheckinQuestion[] = [
  {
    id: 'wins',
    label: 'Wins this week — what worked?',
    type: 'textarea',
  },
  {
    id: 'struggles',
    label: 'What got in the way?',
    type: 'textarea',
  },
  {
    id: 'next_step',
    label: 'What\'s the one thing to focus on next week?',
    type: 'text',
  },
  {
    id: 'confidence',
    label: 'Confidence in next week (1-10)',
    type: 'scale_1_10',
  },
];

export function getCheckinQuestions(practiceId: string | null | undefined): CheckinQuestion[] {
  if (!practiceId) return GENERIC_CHECKIN_QUESTIONS;
  return CHECKIN_QUESTIONS_BY_PRACTICE[practiceId] ?? GENERIC_CHECKIN_QUESTIONS;
}
