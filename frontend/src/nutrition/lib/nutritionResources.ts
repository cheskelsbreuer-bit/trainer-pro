// Mini-lessons attached to each practice. All content written fresh
// for Trainer Pro — not copied from any third-party coaching program.
// Based on general nutrition + habit-coaching principles in the
// public literature.
//
// Mix of three kinds per practice:
//   lesson — the "why this works" piece
//   tip    — a concrete how-to
//   pitfall— common mistakes worth flagging in advance

import type { Resource } from './methodologies';

export const RESOURCES_BY_PRACTICE: Record<string, Resource[]> = {
  // ══════════════════════════════════════════════════════════════════
  //                    LEVEL 1 — FOUNDATIONS
  // ══════════════════════════════════════════════════════════════════

  // ── Eat slowly ───────────────────────────────────────────────────
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
      title: 'The mistake clients make in week 1',
      body:
        "They try to slow EVERY meal. Don't. Pick the easiest meal of the day (usually breakfast or lunch alone at a desk) and practice there. Family dinner is the hardest spot — leave that for week 3.",
    },
    {
      id: 'es-timer',
      kind: 'tip',
      title: 'Set a 20-minute timer (just once)',
      body:
        "Have your client set a 20-minute timer at the start of one meal this week. The goal isn't to draw it out forever — it's to feel what 20 minutes of eating actually feels like. Most are shocked by how much food is left at the 8-minute mark.",
    },
    {
      id: 'es-anchor',
      kind: 'tip',
      title: 'Pair it with a hunger check-in',
      body:
        "Halfway through every meal, pause and rate fullness 1–10. The pause IS the practice — even if they keep eating, the act of stopping to check resets the rhythm.",
    },
  ],

  // ── No screens at meals ──────────────────────────────────────────
  'no-screens-meals': [
    {
      id: 'ns-why',
      kind: 'lesson',
      title: 'Distracted eating dulls your "full" signal',
      body:
        "Studies on screen-time during meals are consistent: people eat 20–50% more and remember less of what they ate. The brain treats distracted eating like it didn't happen — so hunger returns sooner.",
    },
    {
      id: 'ns-tip',
      kind: 'tip',
      title: 'The "plate-table-food" rule',
      body:
        "Phone goes face-down or in another room. Laptop closes. TV stays off. The only things at the table are the plate, your client, and (optionally) the people they're eating with. That's it.",
    },
    {
      id: 'ns-start',
      kind: 'tip',
      title: 'Start with one meal a day',
      body:
        "Asking a client to ditch screens for every meal is too big a jump. Have them pick ONE — usually breakfast or weekend lunch — and protect that one. After two weeks it'll naturally creep into the other meals.",
    },
    {
      id: 'ns-pitfall',
      kind: 'pitfall',
      title: 'Don\'t skip family meals just to be screen-free',
      body:
        "If the family eats with the TV on, the answer isn't to eat alone in another room. Family connection at meals matters more than no-screens for nutrition. Pick a different meal to practice this with.",
    },
  ],

  // ── Hydration ────────────────────────────────────────────────────
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
    {
      id: 'h-bottle',
      kind: 'tip',
      title: 'The one-bottle trick',
      body:
        "Get a single big water bottle (1L or 1.5L). Goal: drink the whole thing by lunch, refill, drink the second by dinner. That's it. Counting bottles is way easier than counting glasses.",
    },
    {
      id: 'h-pitfall',
      kind: 'pitfall',
      title: 'Coffee counts (mostly), juice doesn\'t',
      body:
        "The old \"coffee dehydrates you\" idea is wrong — caffeine has a tiny diuretic effect but the net hydration from coffee is positive. Juice, sweet tea, sports drinks though — those count as liquid CALORIES, not hydration. Aim for water as the default.",
    },
    {
      id: 'h-color',
      kind: 'tip',
      title: 'The urine color check',
      body:
        "Pale lemonade = hydrated. Apple juice = drink more. Dark amber = drink right now. The cheapest hydration tracker exists in every bathroom — clients just need to know what to look for.",
    },
  ],

  // ── Protein with every meal ──────────────────────────────────────
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
      title: "Easy protein when nothing's prepped",
      body:
        "Greek yogurt, cottage cheese, hard-boiled eggs, canned tuna, a protein shake, jerky, edamame. Keep two of these stocked at all times so there's always a fallback.",
    },
    {
      id: 'p-breakfast',
      kind: 'pitfall',
      title: 'Breakfast is the missed meal',
      body:
        "Most clients hit protein at lunch and dinner but skip it at breakfast — toast, cereal, fruit, coffee. That sets up the 11am crash and 3pm crash. Protein at breakfast (eggs, yogurt, smoothie with protein powder) shifts the whole day's hunger pattern.",
    },
    {
      id: 'p-snack',
      kind: 'tip',
      title: 'Anchor snacks around protein too',
      body:
        "If they snack, make the snack protein-led: jerky + an apple, yogurt + berries, cheese + nuts, hummus + veggies. Pure-carb snacks (crackers, pretzels, fruit alone) leave them hungry again in 90 minutes.",
    },
  ],

  // ── Eat on a steady rhythm ───────────────────────────────────────
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
    {
      id: 'mr-skipper',
      kind: 'pitfall',
      title: 'Skipping isn\'t the same as fasting',
      body:
        "There's structured intermittent fasting (16:8, etc.) and there's accidentally skipping because life got busy. The first is a strategy. The second leads to overeating later. Coach the rhythm before they try fasting.",
    },
    {
      id: 'mr-snack-rule',
      kind: 'tip',
      title: 'No-graze between meals',
      body:
        "Either there's a real snack at a planned time, or there's nothing. The constant-nibble pattern (a chip here, a bite of cookie there) keeps insulin elevated all day and erases the body's natural hunger cues. Plan snacks the way you plan meals.",
    },
  ],

  // ── Prep 3 meals each week ───────────────────────────────────────
  'meal-prep-3x': [
    {
      id: 'mp-why',
      kind: 'lesson',
      title: 'Decision fatigue is the real enemy',
      body:
        'By 6pm, the average person has made hundreds of decisions and willpower is shot. "What\'s for dinner?" at that moment almost always ends in takeout. Prepping a few meals in advance removes the decision entirely.',
    },
    {
      id: 'mp-batch',
      kind: 'tip',
      title: 'Batch the protein, not the whole meal',
      body:
        "Don't pre-build full meals — they get boring by day 3. Instead, batch-cook 3 lbs of protein on Sunday (chicken, ground turkey, salmon, whatever) and 2 cups of grain. Mix-and-match with fresh veggies + sauces during the week. Variety from a 30-minute prep.",
    },
    {
      id: 'mp-shortcut',
      kind: 'tip',
      title: 'Pre-cut veggies are not cheating',
      body:
        "Bagged spinach, pre-spiralized squash, frozen riced cauliflower, rotisserie chicken from the supermarket. Real cooking is overrated for busy clients. \"Assembly\" beats \"cooking from scratch\" if the alternative is takeout.",
    },
    {
      id: 'mp-pitfall',
      kind: 'pitfall',
      title: 'Don\'t aim for the perfect week',
      body:
        "First-time meal-preppers try to prep 21 meals in a single Sunday and never do it again. Aim for 3. Three meals prepped means three nights where dinner is a 2-minute reheat. That's it. Three is sustainable; 21 isn't.",
    },
    {
      id: 'mp-storage',
      kind: 'tip',
      title: 'Get good containers (it matters)',
      body:
        "Glass containers with snap lids. Same size, stackable. Sounds trivial — but the kitchen mess of mismatched lids is why a lot of clients quit meal prep by week 3. One $50 set, done.",
    },
  ],

  // ── Shop from a list ─────────────────────────────────────────────
  'grocery-list': [
    {
      id: 'gl-why',
      kind: 'lesson',
      title: 'You buy what\'s on the shelf, not what you planned',
      body:
        "Decisions made in the kitchen come from what's in the kitchen. If a client buys cookies because they were on sale, those cookies will be eaten that week. The grocery store is the chokepoint — control the cart, control the week.",
    },
    {
      id: 'gl-tip',
      kind: 'tip',
      title: 'The 5-section template',
      body:
        "Build a list with five sections: proteins / veggies / fruit / carbs / pantry. Force at least 3 items per section. Stick to it. The template removes the \"what do I need?\" stress in the store.",
    },
    {
      id: 'gl-perimeter',
      kind: 'tip',
      title: 'Perimeter-first shopping',
      body:
        "Real food lives on the perimeter of the supermarket — produce, meat, dairy, bakery. The middle aisles are where the boxes, bags, and brand-name items live. Shop the perimeter first, fill the cart, then visit the middle aisles only for specific list items.",
    },
    {
      id: 'gl-pitfall',
      kind: 'pitfall',
      title: 'Never shop hungry',
      body:
        "It sounds like a cliché because it's true. Hungry shopping doubles the impulse purchases — usually high-sugar, high-salt, pre-packaged. Eat a snack before you go, or shop right after a meal.",
    },
    {
      id: 'gl-delivery',
      kind: 'tip',
      title: 'Online ordering is your friend',
      body:
        "Grocery delivery / pickup is the ultimate list-discipline tool — there's nothing to grab off the shelf impulsively, and the cart shows you the total before you commit. For clients who struggle with in-store willpower, online is a game-changer.",
    },
  ],

  // ── 7+ hours of sleep ────────────────────────────────────────────
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
    {
      id: 's-caffeine',
      kind: 'pitfall',
      title: 'Caffeine after 2pm is a stealth saboteur',
      body:
        "Half-life of caffeine is about 5 hours. A 3pm coffee still has 1/4 the dose active at midnight. Most clients who say they can\"t sleep aren't drinking too much coffee — they're drinking it too late.",
    },
    {
      id: 's-light',
      kind: 'tip',
      title: 'Morning sunlight is the secret to good sleep',
      body:
        "Bright light within 30 min of waking sets the body's clock for sleep that night. 5 minutes of direct outdoor sunlight (even cloudy) tells the brain \"day has started\" — and 14 hours later, melatonin releases on time. The fix for bad sleep often starts at breakfast.",
    },
    {
      id: 's-screens',
      kind: 'tip',
      title: 'Phone out of the bedroom',
      body:
        "If the phone is the alarm clock, get a real alarm clock. Phones in bed = late scrolling = 11pm bedtimes that should have been 10pm. The single highest-impact sleep intervention for most adults.",
    },
  ],

  // ── 5 deep breaths before eating ─────────────────────────────────
  'five-breaths': [
    {
      id: 'fb-why',
      kind: 'lesson',
      title: 'The nervous system has to be ready to digest',
      body:
        "Eating while stressed (fight-or-flight) shunts blood AWAY from the gut. Five slow breaths drops the body into parasympathetic ('rest-and-digest') mode. Digestion improves, satiety signals fire properly, and the meal feels more satisfying.",
    },
    {
      id: 'fb-how',
      kind: 'tip',
      title: 'The 4-7-8 cadence',
      body:
        "Breathe in through the nose for 4 counts. Hold for 7. Breathe out through the mouth for 8. Do this 3–5 times before picking up the fork. Takes 30 seconds and resets the whole meal.",
    },
    {
      id: 'fb-pitfall',
      kind: 'pitfall',
      title: 'Don\'t make it spiritual',
      body:
        "Some clients balk at \"meditate before meals\" framing. Pitch it as a digestion trick — \"this helps your body actually use the food you're about to eat.\" Same outcome, way less resistance.",
    },
    {
      id: 'fb-anchor',
      kind: 'tip',
      title: 'Pair it with the first sip',
      body:
        "Sit down. Take five slow breaths. Then take the first sip of water. Then start eating. The water sip is the trigger that locks the breathing in as a routine.",
    },
  ],

  // ── 10-min stress walk daily ─────────────────────────────────────
  'stress-walk': [
    {
      id: 'sw-why',
      kind: 'lesson',
      title: 'Why walking beats every other stress tool',
      body:
        "Walking lowers cortisol, raises BDNF (the brain's growth factor), and resets the prefrontal cortex. It works WHILE you do it — not 24 hours later like a workout. For most overwhelmed clients, the walk is the highest-ROI 10 minutes in their day.",
    },
    {
      id: 'sw-time',
      kind: 'tip',
      title: 'After lunch is the magic time',
      body:
        "A 10-min walk right after lunch lowers blood sugar by ~20–30%, prevents the 3pm crash, AND breaks the afternoon work-stress curve. One walk fixes three things. Schedule it like a meeting.",
    },
    {
      id: 'sw-phone',
      kind: 'tip',
      title: 'No phone (this matters)',
      body:
        "Walking while texting / scrolling isn't a stress walk — it's another screen session that happens to be moving. Leave the phone. The point is mental space, not steps.",
    },
    {
      id: 'sw-weather',
      kind: 'pitfall',
      title: 'Weather is not an excuse',
      body:
        "Cold? Coat. Hot? Hat. Rain? Walk under awnings. Most quit-the-walk excuses are habit-momentum, not weather. The clients who walk in bad weather have it as an identity (\"I'm a person who walks\"), not a preference.",
    },
    {
      id: 'sw-loop',
      kind: 'tip',
      title: 'Build a 10-minute loop',
      body:
        "Map a route from home or office that takes 10 minutes round-trip. Same loop every day. The familiarity removes the \"where should I walk?\" decision and turns it into pure autopilot — which is exactly what makes habits stick.",
    },
  ],

  // ── Move your body 3–5x a week ───────────────────────────────────
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
    {
      id: 'm-minimum',
      kind: 'tip',
      title: 'Set a minimum, not a maximum',
      body:
        "Define the floor: \"3 sessions a week, 20 min minimum.\" Anything above that is bonus. The minimum keeps them honest on bad weeks; the lack of maximum keeps them excited on good weeks.",
    },
    {
      id: 'm-perfect-pitfall',
      kind: 'pitfall',
      title: 'The "perfect program" trap',
      body:
        "Clients who spent 4 weeks researching the optimal hypertrophy split have usually trained 0 times. Stop researching, start moving. A worse plan executed beats a better plan that's still in PDFs.",
    },
    {
      id: 'm-strength-first',
      kind: 'tip',
      title: 'If only one thing — pick strength',
      body:
        "If a client can only commit to one type of movement, make it strength training. Muscle is the metabolic organ, the joint protector, the bone protector, and the fall preventer. Cardio is great but strength is non-negotiable past age 35.",
    },
  ],

  // ── Something is better than nothing ─────────────────────────────
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
    {
      id: 'snn-streak',
      kind: 'pitfall',
      title: 'Don\'t let a missed day break the streak',
      body:
        "If they miss Tuesday and quit, they lose 30 days. If they miss Tuesday and do 5 minutes Wednesday, they kept the streak alive. The streak is a mental construct — protect it with the smallest possible version.",
    },
    {
      id: 'snn-credit',
      kind: 'tip',
      title: 'Give yourself partial credit',
      body:
        "70% of a workout = 70% of the benefit. Half the prep = half the win. Coach clients to log partial wins as wins. The brain's reward circuit doesn't know the difference — only the all-or-nothing inner voice does.",
    },
  ],

  // ══════════════════════════════════════════════════════════════════
  //                    LEVEL 2 — REFINEMENT
  // ══════════════════════════════════════════════════════════════════

  // ── Eat to 80% full ──────────────────────────────────────────────
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
    {
      id: 'e80-pause',
      kind: 'tip',
      title: 'The 5-minute pause trick',
      body:
        "When they hit \"comfortable\" — stop. Push the plate forward. Drink water. Wait 5 minutes. Fullness signals catch up. About 70% of the time the urge to keep eating disappears. The other 30%, they take a few more bites and stop for real.",
    },
    {
      id: 'e80-pitfall',
      kind: 'pitfall',
      title: 'Restaurant portions break this',
      body:
        "American restaurant portions are 2–3× the right size. Eating to 80% of THE PLATE means overeating; eating to 80% of YOUR HUNGER means leaving food. Teach the second. The leftover containers are coming with you.",
    },
    {
      id: 'e80-clean-plate',
      kind: 'lesson',
      title: 'Unlearn the clean-plate club',
      body:
        "Many clients were raised \"don't waste food.\" That training overrides body signals. The food is wasted either way — into the trash or into a body that didn't need it. The trash is the cheaper waste.",
    },
  ],

  // ── Stop eating after dinner ─────────────────────────────────────
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
    {
      id: 'nc-tea',
      kind: 'tip',
      title: 'Tea is the perfect replacement ritual',
      body:
        "The reason nighttime eating sticks is it's a RITUAL, not just calories. Replace the ritual with another one — a cup of herbal tea sipped slowly on the couch. Same comfort, same hand-to-mouth, zero calories.",
    },
    {
      id: 'nc-pitfall',
      kind: 'pitfall',
      title: 'Don\'t go to bed starving',
      body:
        "Sometimes nighttime eating IS real hunger — because dinner was too light. The fix isn't more willpower; it's a more substantial dinner with protein + fat. Hungry-at-night more than 2 nights in a row = dinner needs adjusting.",
    },
    {
      id: 'nc-clock',
      kind: 'tip',
      title: 'Set a kitchen-closes time',
      body:
        "Decide in advance: \"After 8pm, no more food.\" The decision happens once, in the morning when willpower is high — not at 9pm when it's already shot. Pick a time and stick to it for two weeks.",
    },
  ],

  // ── Veggies with every meal ──────────────────────────────────────
  'veggies-each-meal': [
    {
      id: 'v-why',
      kind: 'lesson',
      title: 'Veggies aren\'t about restriction — they\'re about volume',
      body:
        "Vegetables let clients eat MORE food, not less. Two cups of greens is 20 calories. Two cups of pasta is 400. The plate looks the same. The fullness is the same. The math is profoundly different.",
    },
    {
      id: 'v-fist',
      kind: 'tip',
      title: 'The fist-portion rule',
      body:
        "1–2 fists of veggies at every meal. No upper limit. The fist scales to the body — bigger person, bigger fist, bigger portion. Simple, effortless math.",
    },
    {
      id: 'v-breakfast',
      kind: 'pitfall',
      title: 'Breakfast is the missed meal (again)',
      body:
        "Most clients eat veggies at lunch and dinner. Breakfast is fruit, grains, or nothing. Spinach in eggs, peppers in an omelet, leftover roasted veg in a wrap — pick one move and apply it for two weeks.",
    },
    {
      id: 'v-frozen',
      kind: 'tip',
      title: 'Frozen veggies are not a downgrade',
      body:
        "Frozen veggies are picked at peak ripeness and flash-frozen — often more nutrient-dense than the \"fresh\" ones that sat in a truck for a week. Plus they don't go bad. Stock 5 bags. Microwave with butter and salt. Done.",
    },
    {
      id: 'v-sneak',
      kind: 'tip',
      title: 'Hide them in things',
      body:
        "Spinach in smoothies (taste-undetectable). Cauliflower riced into rice. Zucchini grated into pasta sauce. Carrots in chili. For picky clients or kids, sneaking veggies into existing favorites is faster than waiting for them to learn to love broccoli.",
    },
  ],

  // ── Build a balanced plate ───────────────────────────────────────
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
    {
      id: 'bp-quarters',
      kind: 'tip',
      title: 'Visualize the plate in quarters',
      body:
        "Half the plate = vegetables. One quarter = protein. One quarter = carbs (or skip if cutting). Drizzle of fat on top. No calorie counting, no measuring, no apps. Just eyeballing.",
    },
    {
      id: 'bp-pitfall',
      kind: 'pitfall',
      title: 'The "naked carb" trap',
      body:
        "A bowl of pasta. A bagel. A piece of toast with jam. These collapse blood sugar fast — and the clean-pure-energy feeling vanishes by hour 2. ALWAYS add a protein source and a fat source to any carb. Pasta + chicken + olive oil = balanced. Pasta alone = setup for a crash.",
    },
    {
      id: 'bp-restaurant',
      kind: 'tip',
      title: 'Order the balanced plate in restaurants',
      body:
        'Look at every menu through the 4-portion lens. Restaurant entrées are usually 70% carb + 25% protein + 5% veg + zero fat. Reorder: protein-led main + extra side of veggies, hold the bread basket. Two adjustments per meal, every meal.',
    },
  ],

  // ── Cut liquid calories ──────────────────────────────────────────
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
      title: "Simple swaps that don't feel like deprivation",
      body:
        "Sparkling water with lime instead of soda. Plain coffee or coffee with milk instead of the syrup-loaded order. Wine seltzer instead of cocktails. The taste of the ritual matters more than the calories — keep the ritual, swap the source.",
    },
    {
      id: 'lc-juice-pitfall',
      kind: 'pitfall',
      title: 'Juice is candy with vitamins',
      body:
        '"Fresh-pressed" doesn\'t change the math: 16oz of OJ has the sugar of 3 oranges with none of the fiber. The body processes it the same as soda. Eat the fruit; don\'t drink it.',
    },
    {
      id: 'lc-alcohol',
      kind: 'lesson',
      title: 'Alcohol is the triple-hit',
      body:
        "Alcohol calories don't fill you up, they REDUCE inhibition (so you eat more), AND they shut down fat oxidation for 24+ hours. Cutting from 5 drinks/week to 1 is often worth 5–10 lbs over a few months without any other change.",
    },
    {
      id: 'lc-coffee-creamer',
      kind: 'tip',
      title: 'Coffee creamer is a stealth tax',
      body:
        "Most flavored coffee creamers are 35–50 cal per tablespoon. Three coffees a day with 2 tbsp each = 200–300 hidden calories before the day even starts. Switch to a splash of milk + cinnamon. Or learn to love coffee black.",
    },
  ],

  // ── Lean on low-calorie-density foods ────────────────────────────
  'volume-eating': [
    {
      id: 've-why',
      kind: 'lesson',
      title: 'Calorie density is the hidden lever',
      body:
        "The stomach measures volume, not calories. 500 calories of broccoli fills you up for hours. 500 calories of almonds disappears in 4 minutes and you're hungry again at 3pm. Same energy, profoundly different satiety.",
    },
    {
      id: 've-list',
      kind: 'tip',
      title: 'The volume-food shortlist',
      body:
        "Vegetables (all of them). Berries. Broths and clear soups. Lean proteins (chicken breast, white fish, egg whites, Greek yogurt). Air-popped popcorn. Bigger portions of low-density foods = same calories, way more food.",
    },
    {
      id: 've-density-trap',
      kind: 'pitfall',
      title: 'The "healthy fats" volume trap',
      body:
        'Nuts, avocado, olive oil, nut butter — all healthy. All extremely calorie-dense (160-200 cal per ounce). A "small handful" of nuts is often 400 calories. Measure these. They\'re the most-underestimated source of weight regain.',
    },
    {
      id: 've-soup',
      kind: 'tip',
      title: 'Start meals with a broth-based soup',
      body:
        "A cup of clear broth or veggie soup before the main meal reliably cuts total calorie intake by 100–200. The water + volume primes fullness early. Free trick that doesn't change anything else about the meal.",
    },
    {
      id: 've-salad',
      kind: 'tip',
      title: 'Big salad before, not instead',
      body:
        "Side salads before the meal (lightly dressed) front-load volume and fiber. The trick: small dressing portion (1 tbsp), eat with the meal, not as the meal — replacing dinner with salad is the dieting cliché that always backfires.",
    },
  ],

  // ── Whole foods most of the time ─────────────────────────────────
  'whole-foods-most': [
    {
      id: 'wf-why',
      kind: 'lesson',
      title: 'Why "80/20" beats "100/0"',
      body:
        "Clients who go 100% \"clean\" usually quit within 3 weeks. Clients who aim for 80% whole-food meals + 20% flexibility hit 80% for years. Sustainable beats optimal.",
    },
    {
      id: 'wf-rule',
      kind: 'tip',
      title: 'The 5-ingredient test',
      body:
        "If the food has more than 5 ingredients on the label, OR has ingredients you can't pronounce, it's processed. Doesn't mean don't eat it — just means it counts toward the 20%, not the 80%.",
    },
    {
      id: 'wf-orthorexia',
      kind: 'pitfall',
      title: '"Clean eating" can become a problem',
      body:
        "Some clients turn whole-food eating into a moral identity — every \"unclean\" bite triggers guilt. That's worse for them than the food was. Coach flexibility. A cookie at a birthday isn't a setback; refusing it might be.",
    },
    {
      id: 'wf-frozen-canned',
      kind: 'tip',
      title: 'Frozen and canned still count',
      body:
        "Frozen broccoli, canned beans, canned tuna, canned tomatoes — all whole foods. Don't let the supermarket aisle they live in fool you. Real food doesn't have to be fresh to be real.",
    },
    {
      id: 'wf-processed-spectrum',
      kind: 'lesson',
      title: "Processed isn't binary",
      body:
        "Cheese is processed (compared to milk) — but it's still whole food. Greek yogurt is processed — but it's a nutritional powerhouse. The line is ULTRA-processed (factory-made, ingredients you can't picture). That's where 80/20 kicks in.",
    },
  ],

  // ── Hand-portion protein ─────────────────────────────────────────
  'hand-portion-protein': [
    {
      id: 'hpp-why',
      kind: 'lesson',
      title: 'Calorie control without counting',
      body:
        "Apps and scales are accurate but exhausting. Hand portions are roughly accurate, take 0 seconds, and scale automatically — a bigger person has a bigger palm, so they get more protein. The math takes care of itself.",
    },
    {
      id: 'hpp-rule',
      kind: 'tip',
      title: 'Women 1 palm, men 2',
      body:
        "1 palm-sized portion of protein per meal for women, 2 for men. Thickness ≈ thickness of the palm, width ≈ width of the palm. Three meals a day × this portion gets most clients in the 100–140g protein target without thinking about grams at all.",
    },
    {
      id: 'hpp-pitfall',
      kind: 'pitfall',
      title: "Don't apply it to fish",
      body:
        "Fish (especially salmon) has higher fat content and lower protein density. 1 palm of salmon = less protein than 1 palm of chicken. Just eat a bit more (1.5 palms) when fish is the protein.",
    },
    {
      id: 'hpp-mixed',
      kind: 'tip',
      title: 'Mixed-protein meals still count',
      body:
        "Greek salad: feta (1/2 palm) + chickpeas (1/2 palm) = 1 palm total. Tuna sandwich: tuna (1/2 palm) + cheese (1/2 palm). Eggs + cheese + nuts at breakfast = combine the partial portions to make the full one. The system is forgiving.",
    },
  ],

  // ── Hand-portion veggies ─────────────────────────────────────────
  'hand-portion-veggies': [
    {
      id: 'hpv-why',
      kind: 'lesson',
      title: 'No upper limit on the fist',
      body:
        "Unlike the other hand portions, veggies have no max. 5 fists at a meal is fine. 10 is fine. The fiber-volume-water combination makes overeating effectively impossible.",
    },
    {
      id: 'hpv-min',
      kind: 'tip',
      title: 'Always at LEAST one fist',
      body:
        "Don't aim high; aim consistent. At least one fist at every meal. That single rule, applied to 3 meals a day, hits 5+ servings of veggies daily — already above what most adults eat.",
    },
    {
      id: 'hpv-raw-cooked',
      kind: 'tip',
      title: 'A fist is a fist regardless',
      body:
        "Raw spinach takes more volume to make a fist than cooked spinach (it cooks down). Don't worry about converting. A fist of either is fine. Done is better than perfect.",
    },
    {
      id: 'hpv-starchy',
      kind: 'pitfall',
      title: 'Potatoes and corn are carbs, not veggies',
      body:
        "White potato, sweet potato, corn, peas — these technically grow on plants but they count as starchy carbs in the hand-portion system, not as fists-of-veg. Use the cupped hand for them. Use the fist for actual leafy + cruciferous + colored veggies.",
    },
  ],

  // ── Hand-portion carbs ───────────────────────────────────────────
  'hand-portion-carbs': [
    {
      id: 'hpc-why',
      kind: 'lesson',
      title: 'Carbs are an energy lever',
      body:
        "Carbs aren't bad — they're an adjustable input. More on training days, less on rest days. More for muscle-building phases, less for fat-loss phases. The cupped hand makes the adjustment visible without numbers.",
    },
    {
      id: 'hpc-rule',
      kind: 'tip',
      title: 'Cupped-hand math',
      body:
        "Fat loss: 1 cupped hand of carbs per meal (or 0 for one meal a day). Maintenance: 1–2. Muscle gain or hard training day: 2–3. Adjust monthly based on results.",
    },
    {
      id: 'hpc-timing',
      kind: 'tip',
      title: 'Front-load carbs around training',
      body:
        "The hour before AND the hour after a workout — that's when carbs are most insulin-sensitive. Same total daily carbs, just clustered around training, beats the same carbs spread out for body composition.",
    },
    {
      id: 'hpc-pitfall',
      kind: 'pitfall',
      title: 'Don\'t demonize carbs',
      body:
        'Clients who go super-low-carb often hit a wall at 6 weeks — energy crashes, sleep gets bad, training tanks. Most people perform best with SOME carbs, especially around training. Low-carb is a phase, not a religion.',
    },
  ],

  // ── Hand-portion fats ────────────────────────────────────────────
  'hand-portion-fats': [
    {
      id: 'hpf-why',
      kind: 'lesson',
      title: "Why the thumb is the most-undercounted",
      body:
        "Olive oil drizzles, nut butters, dressings, cheese slices, avocado slices — these stack up fast. A thumb of fat is about 1 tablespoon. Most clients eyeball 1 tbsp and pour 3.",
    },
    {
      id: 'hpf-measure',
      kind: 'tip',
      title: 'Measure once, then eyeball forever',
      body:
        "Have the client measure 1 tbsp of olive oil into a regular dinner spoon. Look at it. Compare to their thumb. Now they know what 1 tbsp looks like. That's the only measurement they ever need to do.",
    },
    {
      id: 'hpf-dressing',
      kind: 'pitfall',
      title: 'Salad dressing is the silent saboteur',
      body:
        "\"Healthy salad with olive oil dressing\" can easily be 600 calories of dressing on 200 calories of greens. Pour the dressing into a side dish, dip the fork into the dressing first, then spear the salad. 1/3 the dressing, same flavor.",
    },
    {
      id: 'hpf-nuts',
      kind: 'tip',
      title: 'Nuts: 1 thumb = handful, not a bag',
      body:
        "A serving of nuts is closer to 12 almonds, not the casual handful that turns into half a bag while watching a show. Pre-portion into small containers so the snack is one container, not \"however many\".",
    },
  ],

  // ── Pause before emotional eating ────────────────────────────────
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
    {
      id: 'ee-hungry',
      kind: 'tip',
      title: 'The "would I eat broccoli?" test',
      body:
        "If you're physically hungry, broccoli sounds fine. If only cookies / chips / ice cream sound good — it's not hunger, it's emotion. The test takes 2 seconds and works almost every time.",
    },
    {
      id: 'ee-pitfall',
      kind: 'pitfall',
      title: 'Don\'t shame the emotional eating',
      body:
        "Telling a client \"don't eat your feelings\" usually backfires — the shame becomes another feeling to eat through. Acknowledge it, build alternatives, celebrate any pause. This is a years-long practice, not a habit-fix.",
    },
    {
      id: 'ee-alternatives',
      kind: 'tip',
      title: 'Pre-build the alternatives list',
      body:
        "Have the client write 5 non-food coping moves: call a specific friend, take a hot shower, walk one block, journal 3 sentences, watch a specific funny video. When the urge hits, the list is THERE — they don't have to invent a coping mechanism in a moment of low willpower.",
    },
  ],

  // ── Mindful indulgence ───────────────────────────────────────────
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
    {
      id: 'mi-restaurant',
      kind: 'tip',
      title: 'Pick the best version available',
      body:
        "If they're going to have dessert, make it the actual dessert they want — not the mediocre one that's available. Often this means SKIPPING the meh office cake on Tuesday so they can fully enjoy the real cake at Saturday's birthday party.",
    },
    {
      id: 'mi-pitfall',
      kind: 'pitfall',
      title: '"Just one bite" rarely works',
      body:
        "Clients who try to negotiate a single bite usually end up overshooting because the bite triggered the craving without satisfying it. Better: have the real serving, sit down, enjoy it, move on. \"One bite\" is the diet-mind trap.",
    },
    {
      id: 'mi-frequency',
      kind: 'lesson',
      title: 'Frequency matters more than amount',
      body:
        "Three planned indulgences a week + 80% on-plan = great results. Daily \"one bite of dessert\" + 80% on-plan = no results. The pattern of constant tasting keeps the brain hooked on sugar. Less often, but bigger when it happens.",
    },
  ],

  // ── Write your identity statement ────────────────────────────────
  'identity-statement': [
    {
      id: 'is-why',
      kind: 'lesson',
      title: 'Behavior follows identity, not the reverse',
      body:
        '"I\'m trying to eat healthy" is a goal. "I\'m the kind of person who eats well" is an identity. The first negotiates with itself constantly. The second just does. Naming the identity speeds the whole transition.',
    },
    {
      id: 'is-formula',
      kind: 'tip',
      title: 'The "I am the kind of person who..." prompt',
      body:
        'Fill in the blank: "I am the kind of person who ___." Examples: "...moves my body every day." "...drinks water before coffee." "...eats vegetables at every meal." Read it out loud each morning. Sounds corny; works.',
    },
    {
      id: 'is-tense',
      kind: 'pitfall',
      title: "Don't say 'I'm trying to...'",
      body:
        '"I\'m trying to be someone who works out" gives the brain an out — trying isn\'t doing. "I AM someone who works out" closes the loop, even on days where they haven\'t worked out yet. Identity precedes the behavior.',
    },
    {
      id: 'is-evidence',
      kind: 'tip',
      title: 'Each habit adds evidence',
      body:
        "Every workout is one more vote for the identity \"I'm an athlete.\" Every glass of water = one vote for \"I'm a hydrated person.\" Habits aren't just about the action — they're about who you're becoming, one rep at a time.",
    },
    {
      id: 'is-three',
      kind: 'tip',
      title: 'Pick three, not thirty',
      body:
        "Don't try to be a brand-new person all at once. Pick THREE identities to grow into this year: \"I'm someone who moves, hydrates, and sleeps 7+ hours.\" The rest will follow naturally as the foundation locks in.",
    },
  ],
};
