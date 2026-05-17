// Mini-lessons attached to each practice. All original content written
// fresh for Trainer Pro — not copied from any third-party coaching
// program. Based on general nutrition + habit-coaching principles in
// the public literature.

import type { Resource } from './methodologies';

export const RESOURCES_BY_PRACTICE: Record<string, Resource[]> = {
  // ── Level 1: Foundations ─────────────────────────────────────────
  'eat-slowly': [
    {
      id: 'es-why',
      kind: 'lesson',
      title: 'Why slow eating is the #1 habit',
      body:
        "Fullness signals take 15–20 minutes to reach the brain. Most meals are over in 8. By the time your client feels full, they've already overshot. Slow eating is the lowest-effort fat-loss lever in coaching — no portion control, no food rules, no calorie counting.",
    },
    {
      id: 'es-how',
      kind: 'tip',
      title: 'Three cues that always work',
      body:
        "Put the fork down between bites. Chew until the food is fully liquid before swallowing. Drink a sip of water between every 3–4 bites. Pick one to start. The other two come automatically over the first week.",
    },
    {
      id: 'es-pitfall',
      kind: 'pitfall',
      title: "The mistake clients make in week 1",
      body:
        "They try to slow EVERY meal. Don't. Pick the easiest meal of the day (usually breakfast or lunch alone at a desk) and practice there. Family dinner is the hardest spot — leave that for week 3.",
    },
  ],
  'no-screens-meals': [
    {
      id: 'ns-why',
      kind: 'lesson',
      title: 'Distracted eating dulls your "full" signal',
      body:
        'Studies on screen-time during meals are consistent: people eat 20–50% more and remember less of what they ate. The brain treats distracted eating like it didn\'t happen — so hunger returns sooner.',
    },
    {
      id: 'ns-tip',
      kind: 'tip',
      title: 'The "plate-table-food" rule',
      body:
        "Phone goes face-down or in another room. Laptop closes. TV stays off. The only things at the table are the plate, your client, and (optionally) the people they're eating with. That's it.",
    },
  ],
  hydration: [
    {
      id: 'h-why',
      kind: 'lesson',
      title: 'Thirst gets mistaken for hunger',
      body:
        "The brain uses the same circuit to flag both. Mild dehydration shows up as a 3pm snack craving, an evening graze, or the urge for something sweet. Drinking water first is the cheapest test you can run.",
    },
    {
      id: 'h-anchor',
      kind: 'tip',
      title: 'Anchor it to existing habits',
      body:
        "One glass on waking (before coffee). One glass before each meal. One glass with each medication or supplement. Don't try to count 8 separate glasses — anchor it to things they already do.",
    },
  ],
  'protein-each-meal': [
    {
      id: 'p-why',
      kind: 'lesson',
      title: 'Why protein is the king macronutrient',
      body:
        "Protein is the most filling of the three macros — gram for gram, it shuts down hunger longer than carbs or fat. It also requires the most energy to digest. A high-protein meal feels satisfying for hours; a high-carb meal often doesn't.",
    },
    {
      id: 'p-palm',
      kind: 'tip',
      title: 'The palm-sized portion',
      body:
        "A serving of protein = the palm of the client's hand (thickness + width). Women: 1 palm per meal. Men: 2 palms. Scale up for athletes, scale down for sedentary. No scale needed.",
    },
    {
      id: 'p-fallback',
      kind: 'tip',
      title: 'Easy protein when nothing\'s prepped',
      body:
        "Greek yogurt, cottage cheese, hard-boiled eggs, canned tuna, a protein shake, jerky, edamame. Keep two of these stocked at all times so there's always a fallback.",
    },
  ],
  'meal-rhythm': [
    {
      id: 'mr-why',
      kind: 'lesson',
      title: 'Predictable rhythm beats perfect timing',
      body:
        "When meals happen at random times, the body never settles into a hunger pattern. The classic result: nothing all day, then a 9pm binge. Three meals at roughly the same times each day teaches the body when to expect food — and when it doesn't need any.",
    },
    {
      id: 'mr-anchor',
      kind: 'tip',
      title: 'Anchor to one fixed point',
      body:
        "Pick the one meal they always eat (usually dinner) and lock the time. Everything else can be flexible. The single anchor gives the body something to predict around.",
    },
  ],
  'sleep-7h': [
    {
      id: 's-why',
      kind: 'lesson',
      title: 'Sleep is the nutrition you eat with your eyes closed',
      body:
        "Underslept clients eat 300–500 more calories the next day on average — the body chases the energy it didn't get from rest. Sleep also resets ghrelin and leptin, the hunger hormones. No amount of discipline beats this.",
    },
    {
      id: 's-bedtime',
      kind: 'tip',
      title: 'The hard part is bedtime, not wake-time',
      body:
        "Most clients can't sleep more in the morning — work, kids, school. So coach the bedtime. Lights down 30 min before. Phone in another room. Same time every night, weekends included.",
    },
  ],
  'movement-weekly': [
    {
      id: 'm-why',
      kind: 'lesson',
      title: 'Why "any movement" beats "the right movement"',
      body:
        "Adherence destroys optimization. The workout they'll actually do 3x a week beats the perfect program they do twice and quit. Start with what feels doable — walking, dancing, light strength — and build from there.",
    },
    {
      id: 'm-cardio-strength',
      kind: 'tip',
      title: 'A simple split for the busy client',
      body:
        "2 strength sessions a week (full body, 30 min, weights or bodyweight). 2 cardio sessions (walk, bike, swim, dance — 20–40 min). 1 flexibility / mobility session. That's it. Five short sessions cover everything.",
    },
  ],
  'something-not-nothing': [
    {
      id: 'snn-why',
      kind: 'lesson',
      title: 'The opposite of "all or nothing"',
      body:
        "Most clients fail because they treat coaching like a pass/fail test. Missed the workout? Whole week is ruined. Ate a cookie? Diet's over. Real change comes from \"something is better than nothing\" — the half-workout, the half-portion, the partial save.",
    },
    {
      id: 'snn-tip',
      kind: 'tip',
      title: 'Pre-script the "something" versions',
      body:
        "Have a 5-min workout for the day there's no time. Have a single-glass-of-water plan for the day they forget hydration. Plan the half-versions in advance — they're not a fallback, they're the real plan on hard days.",
    },
  ],
  // ── Level 2: Refinement ──────────────────────────────────────────
  'eat-to-80': [
    {
      id: 'e80-why',
      kind: 'lesson',
      title: 'Stuffed isn\'t the goal',
      body:
        "Most clients eat to 100% — comfortably full or beyond. 80% is the point where they feel satisfied but could still take a brisk walk. Hitting 80% consistently is worth 200–400 fewer calories a day with no effort beyond paying attention.",
    },
    {
      id: 'e80-rate',
      kind: 'tip',
      title: 'The 1-10 hunger scale',
      body:
        "Before eating: rate hunger 1–10. Halfway through: rate fullness 1–10. Stop at 7 (\"comfortably satisfied\"). Most clients land at 9 or 10 by default. Just noticing this changes the meal.",
    },
  ],
  'balanced-plate': [
    {
      id: 'bp-why',
      kind: 'lesson',
      title: 'Why the balanced plate is the cheat code',
      body:
        "Protein + fibre + fat together is the most satisfying combination in food science. A plate built this way keeps hunger flat for 4–5 hours. A plate of just carbs collapses in 90 minutes and they're snacking again by 3pm.",
    },
    {
      id: 'bp-template',
      kind: 'tip',
      title: 'The 4-portion plate template',
      body:
        "1 palm of protein. 1–2 fists of veggies. 1 thumb of healthy fat (oil, avocado, nuts). Optional 1 cupped hand of carbs (more around training). Build every plate this way for two weeks and the rest of nutrition gets easier on its own.",
    },
  ],
  'liquid-calories': [
    {
      id: 'lc-why',
      kind: 'lesson',
      title: 'The hidden source clients always miss',
      body:
        "Liquid calories don't register as fullness — the body doesn't compensate by eating less later. Two specialty lattes can hide 600 calories a day. Often the single biggest lever in mid-life fat loss is cutting them, not eating less.",
    },
    {
      id: 'lc-swap',
      kind: 'tip',
      title: 'Simple swaps that don\'t feel like deprivation',
      body:
        "Sparkling water with lime instead of soda. Plain coffee or coffee with milk instead of the syrup-loaded order. Wine seltzer instead of cocktails. The taste of the ritual matters more than the calories — keep the ritual, swap the source.",
    },
  ],
  'nighttime-cutoff': [
    {
      id: 'nc-why',
      kind: 'lesson',
      title: "Why nighttime eating isn't really hunger",
      body:
        "After dinner, most clients aren't hungry — they're decompressing. The brain associates the couch + screen + quiet with food. Once that loop is set, it triggers a craving even when the stomach is full.",
    },
    {
      id: 'nc-close',
      kind: 'tip',
      title: 'Close the kitchen',
      body:
        "After dinner: brush teeth, make tea, light off in the kitchen. Sometimes literally close the door. The friction of having to undo all that is enough to break the auto-graze loop within a week.",
    },
  ],
  'mindful-indulgence': [
    {
      id: 'mi-why',
      kind: 'lesson',
      title: 'Guilt-eating is double the calories',
      body:
        "Standing in front of the fridge, eating cookies you didn't really plan to eat, then feeling bad — that pattern leads to more eating, not less. Treats eaten on purpose, sitting down, fully tasted, end with one serving. Guilt-eating ends with the bag.",
    },
    {
      id: 'mi-script',
      kind: 'tip',
      title: 'The "yes, then enjoy it" protocol',
      body:
        "Decide in advance: \"I'm going to have dessert tonight.\" Plate it. Sit at the table. Taste every bite. No phone. When it's done, it's done — no second helping, no guilt. The decision to enjoy it on purpose is what completes the loop.",
    },
  ],
  'emotional-eating-pause': [
    {
      id: 'ee-why',
      kind: 'lesson',
      title: "Food is a coping skill — just not the only one",
      body:
        "Don't try to take food away as a coping tool until there's a substitute in place. Build the muscle of pausing, naming the feeling, and trying a non-food response. Sometimes the response is still food — that's fine. The pause is the win.",
    },
    {
      id: 'ee-five',
      kind: 'tip',
      title: 'The 5-minute pause',
      body:
        'When the reach-for-food urge hits: set a 5-minute timer. Drink a glass of water. Name the feeling out loud ("I\'m anxious about the email"). Walk to a different room. After 5 minutes, decide. About 40% of the time the craving has moved on by itself.',
    },
  ],
};
