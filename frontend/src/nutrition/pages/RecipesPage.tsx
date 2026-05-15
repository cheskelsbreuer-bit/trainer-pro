// Recipe library — curated recipes coaches can browse and reference
// with clients. V1 ships with ~16 nutrition-coach-aligned recipes
// covering all major goal types, dietary needs, and time constraints.
// Each recipe has macros, prep time, ingredients, step-by-step
// instructions, and a brief "why this works" coaching note.
//
// Click any card to open the full detail modal.

import { useEffect, useMemo, useState } from 'react';
import { Clock, Users, Flame, Search, X } from 'lucide-react';
import { N, SERIF_FONT } from '../theme';

type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type DietTag = 'high-protein' | 'plant-based' | 'gluten-free' | 'dairy-free' | 'low-carb' | 'mediterranean' | 'meal-prep' | 'quick';

interface Recipe {
  id: string;
  title: string;
  meal: Meal;
  prepMin: number;
  servings: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  diet: DietTag[];
  blurb: string;
  pnNote: string;
  ingredients: string[];
  steps: string[];
}

const RECIPES: Recipe[] = [
  // Breakfasts
  {
    id: 'high-protein-oats',
    title: 'High-Protein Overnight Oats',
    meal: 'breakfast',
    prepMin: 5,
    servings: 1,
    kcal: 380,
    proteinG: 32,
    carbsG: 42,
    fatsG: 9,
    diet: ['high-protein', 'meal-prep', 'quick'],
    blurb: 'Greek yogurt + oats + protein powder. Set it the night before, eat it cold.',
    pnNote: 'Hits the "protein at every meal" practice with one cupped hand of carbs from oats — clean breakfast for fat-loss clients.',
    ingredients: ['1/2 cup rolled oats', '3/4 cup Greek yogurt (0% or 2%)', '1 scoop protein powder', '1/2 cup berries', '1 tsp chia seeds'],
    steps: [
      'In a jar or container, stir together the oats, Greek yogurt, and protein powder until smooth. Add a splash of milk or water if it feels too thick.',
      'Top with berries and chia seeds. Seal and refrigerate overnight (or at least 4 hours).',
      'Eat cold straight from the jar. Will keep 3 days in the fridge.',
    ],
  },
  {
    id: 'savory-eggs',
    title: 'Savory Veggie Eggs',
    meal: 'breakfast',
    prepMin: 12,
    servings: 1,
    kcal: 360,
    proteinG: 28,
    carbsG: 12,
    fatsG: 22,
    diet: ['high-protein', 'gluten-free', 'low-carb'],
    blurb: 'Three eggs scrambled with a fist of spinach, peppers, mushrooms. Five minutes.',
    pnNote: 'Three eggs = 1 male palm of protein. Veggies fill out the volume. The thumb-of-fat is built in.',
    ingredients: ['3 eggs', '1 cup spinach', '1/2 bell pepper diced', '1/2 cup mushrooms', '1 tsp olive oil', 'salt + pepper'],
    steps: [
      'Heat the olive oil in a non-stick pan over medium heat. Add the bell pepper and mushrooms; cook 3–4 minutes until softened.',
      'Add the spinach and stir until just wilted, about 30 seconds.',
      'Crack the eggs into a bowl, whisk, and pour over the veg. Stir gently until just set, about 2 minutes. Season with salt and pepper.',
    ],
  },
  {
    id: 'cottage-bowl',
    title: 'Cottage Cheese Bowl',
    meal: 'breakfast',
    prepMin: 3,
    servings: 1,
    kcal: 280,
    proteinG: 26,
    carbsG: 28,
    fatsG: 6,
    diet: ['high-protein', 'gluten-free', 'quick'],
    blurb: 'Cottage cheese, frozen berries, a drizzle of honey. Done.',
    pnNote: 'Underrated move — high protein, slow carbs from berries, almost no prep.',
    ingredients: ['1 cup low-fat cottage cheese', '1/2 cup mixed berries', '1 tsp honey', '1 tbsp slivered almonds'],
    steps: [
      'Spoon the cottage cheese into a bowl.',
      'Top with the berries and slivered almonds.',
      'Drizzle the honey over the top. Eat immediately.',
    ],
  },
  {
    id: 'avocado-toast-pro',
    title: 'Avocado Toast, Done Right',
    meal: 'breakfast',
    prepMin: 8,
    servings: 1,
    kcal: 420,
    proteinG: 22,
    carbsG: 38,
    fatsG: 22,
    diet: ['mediterranean', 'high-protein'],
    blurb: 'Sourdough, smashed avocado, two eggs on top, lemon and chili flakes.',
    pnNote: 'Adding the eggs is the upgrade — turns a fat-and-carbs meal into a complete, satisfying one.',
    ingredients: ['2 slices sourdough', '1/2 avocado', '2 eggs', 'lemon juice', 'chili flakes', 'flaky salt'],
    steps: [
      'Toast the sourdough until golden.',
      'While it toasts, fry or poach two eggs to your liking.',
      'Smash the avocado in a small bowl with lemon juice and a pinch of salt.',
      'Spread the avocado on the toast, top with the eggs, and finish with chili flakes and flaky salt.',
    ],
  },
  // Lunches
  {
    id: 'mediterranean-bowl',
    title: 'Mediterranean Grain Bowl',
    meal: 'lunch',
    prepMin: 15,
    servings: 2,
    kcal: 520,
    proteinG: 32,
    carbsG: 58,
    fatsG: 18,
    diet: ['mediterranean', 'meal-prep'],
    blurb: 'Farro, chickpeas, cucumber, tomato, feta, lemon-tahini dressing.',
    pnNote: 'Textbook balanced plate: palm of protein (chickpeas + feta), cupped hand of carbs (farro), two fists of veg, thumb of fat (tahini).',
    ingredients: ['1 cup cooked farro', '1 can chickpeas, rinsed', '1 cucumber diced', '1 cup cherry tomatoes', '1/3 cup feta', '2 tbsp tahini', '1 lemon', 'parsley'],
    steps: [
      'In a small bowl, whisk together the tahini, juice of the lemon, 2 tbsp warm water, and a pinch of salt to make the dressing.',
      'Divide the farro between two bowls. Top each with chickpeas, cucumber, tomatoes, and feta.',
      'Drizzle generously with the lemon-tahini dressing and finish with chopped parsley.',
    ],
  },
  {
    id: 'turkey-wraps',
    title: 'Lean Turkey Lettuce Wraps',
    meal: 'lunch',
    prepMin: 12,
    servings: 2,
    kcal: 340,
    proteinG: 36,
    carbsG: 14,
    fatsG: 14,
    diet: ['low-carb', 'gluten-free', 'high-protein', 'quick'],
    blurb: 'Ground turkey with garlic, ginger, tamari, served in butter lettuce.',
    pnNote: 'Great for fat-loss phase — high protein, low carb, big volume from lettuce.',
    ingredients: ['1 lb ground turkey 93%', '2 tsp sesame oil', '2 cloves garlic minced', '1 tbsp grated ginger', '3 tbsp tamari', '1 head butter lettuce', 'scallions sliced'],
    steps: [
      'Heat the sesame oil in a large skillet over medium-high. Add the garlic and ginger; cook 30 seconds until fragrant.',
      'Add the ground turkey and break it up with a spatula. Cook 5–6 minutes until browned through.',
      'Stir in the tamari and cook another minute until the liquid mostly evaporates.',
      'Spoon into lettuce leaves and top with scallions. Eat with hands.',
    ],
  },
  {
    id: 'salmon-rice',
    title: 'Salmon, Rice, Greens',
    meal: 'lunch',
    prepMin: 25,
    servings: 1,
    kcal: 560,
    proteinG: 38,
    carbsG: 48,
    fatsG: 22,
    diet: ['mediterranean', 'gluten-free', 'meal-prep'],
    blurb: 'Pan-seared salmon, jasmine rice, sautéed greens. Simple, sustainable.',
    pnNote: 'The classic athletic-performance plate. Carbs around training, protein for repair, omega-3s for inflammation.',
    ingredients: ['6 oz salmon fillet', '3/4 cup cooked jasmine rice', '2 cups bok choy or spinach', '1 tbsp olive oil', '1 garlic clove minced', '1 lemon wedge'],
    steps: [
      'Pat the salmon dry and season both sides with salt and pepper.',
      'Heat half the olive oil in a non-stick pan over medium-high. Place the salmon skin-side down. Cook 4 minutes, flip, cook 2–3 more minutes until just done. Rest on a plate.',
      'In the same pan, add the rest of the oil and garlic. Toss in the greens and cook until wilted, 2 minutes.',
      'Plate the rice, greens, and salmon. Squeeze the lemon over the top.',
    ],
  },
  {
    id: 'big-salad',
    title: 'The Big Salad',
    meal: 'lunch',
    prepMin: 10,
    servings: 1,
    kcal: 480,
    proteinG: 32,
    carbsG: 30,
    fatsG: 24,
    diet: ['high-protein', 'gluten-free', 'quick'],
    blurb: 'Mixed greens, grilled chicken, white beans, avocado, vinaigrette.',
    pnNote: 'Clients love this one — feels indulgent, hits all four hand portions.',
    ingredients: ['4 cups mixed greens', '5 oz grilled chicken sliced', '1/2 cup white beans rinsed', '1/4 avocado sliced', '1/4 cup cherry tomatoes', '2 tbsp olive oil vinaigrette'],
    steps: [
      'Pile the greens into a large bowl.',
      'Top with the chicken, white beans, avocado, and tomatoes.',
      'Drizzle the vinaigrette over the top and toss gently to coat. Eat from the bowl.',
    ],
  },
  // Dinners
  {
    id: 'sheet-pan-chicken',
    title: 'Sheet-Pan Chicken & Veg',
    meal: 'dinner',
    prepMin: 35,
    servings: 4,
    kcal: 420,
    proteinG: 42,
    carbsG: 32,
    fatsG: 14,
    diet: ['meal-prep', 'gluten-free', 'high-protein'],
    blurb: 'Chicken thighs, sweet potato cubes, broccoli, olive oil, paprika. One pan.',
    pnNote: 'The meal-prep workhorse. One pan, four servings, hits every hand portion.',
    ingredients: ['1.5 lb chicken thighs', '2 sweet potatoes cubed', '1 head broccoli cut into florets', '3 tbsp olive oil', '2 tsp paprika', 'salt + pepper'],
    steps: [
      'Preheat oven to 425°F (220°C). Line a large sheet pan with parchment.',
      'In a bowl, toss the sweet potato cubes with 1 tbsp olive oil, paprika, salt, and pepper. Spread on one half of the pan.',
      'Pat the chicken dry, rub with 1 tbsp olive oil and season. Place on the other half. Roast 20 minutes.',
      'Toss the broccoli with the remaining oil and salt, scatter over the pan, and roast another 12–15 minutes until everything is golden and the chicken hits 165°F.',
    ],
  },
  {
    id: 'lentil-stew',
    title: 'Hearty Lentil Stew',
    meal: 'dinner',
    prepMin: 45,
    servings: 6,
    kcal: 380,
    proteinG: 22,
    carbsG: 56,
    fatsG: 8,
    diet: ['plant-based', 'meal-prep', 'mediterranean'],
    blurb: 'French lentils with carrots, celery, garlic, smoked paprika, tomato.',
    pnNote: 'Plant-based clients ask for this constantly. Six servings = a week of lunches.',
    ingredients: ['2 cups French lentils', '6 cups stock', '2 carrots diced', '2 celery stalks diced', '1 onion diced', '4 garlic cloves minced', '1 tsp smoked paprika', '1 can crushed tomato', '2 tbsp olive oil'],
    steps: [
      'Heat olive oil in a large pot over medium heat. Add onion, carrot, celery; cook 8 minutes until soft.',
      'Stir in garlic and smoked paprika; cook 30 seconds.',
      'Add lentils, crushed tomato, and stock. Bring to a boil, then reduce to a simmer.',
      'Simmer uncovered 30–35 minutes until the lentils are tender and the stew thickens. Season with salt and pepper.',
    ],
  },
  {
    id: 'shrimp-stirfry',
    title: '15-Minute Shrimp Stir-Fry',
    meal: 'dinner',
    prepMin: 15,
    servings: 2,
    kcal: 440,
    proteinG: 38,
    carbsG: 42,
    fatsG: 12,
    diet: ['quick', 'gluten-free', 'high-protein'],
    blurb: 'Shrimp, snap peas, peppers, scallions over rice. Done in 15.',
    pnNote: 'When the client says "no time to cook" — this is the answer.',
    ingredients: ['1 lb shrimp peeled', '2 cups snap peas', '1 red pepper sliced', '3 scallions sliced', '1 cup cooked rice', '2 tbsp tamari', '1 tsp sesame oil', '1 tsp grated ginger'],
    steps: [
      'Heat sesame oil in a wok or large skillet over high heat. Add ginger; cook 15 seconds.',
      'Add the snap peas and bell pepper. Stir-fry 2 minutes until just tender.',
      'Add the shrimp and tamari. Cook 2–3 minutes, tossing, until the shrimp turn pink.',
      'Stir in the scallions. Serve over rice.',
    ],
  },
  {
    id: 'turkey-meatballs',
    title: 'Turkey Meatballs in Marinara',
    meal: 'dinner',
    prepMin: 30,
    servings: 4,
    kcal: 380,
    proteinG: 34,
    carbsG: 24,
    fatsG: 18,
    diet: ['meal-prep', 'mediterranean', 'high-protein'],
    blurb: 'Turkey meatballs simmered in a quick tomato sauce. Over zoodles or pasta.',
    pnNote: 'Crowd-pleaser. Adapts: pasta for the muscle-gain client, zoodles for fat-loss.',
    ingredients: ['1 lb ground turkey', '1/4 cup breadcrumbs', '1 egg', '2 garlic cloves minced', '1 jar good marinara', 'fresh basil', 'parmesan to finish', '1 tbsp olive oil'],
    steps: [
      'In a bowl, mix the turkey, breadcrumbs, egg, garlic, salt, and pepper. Roll into 16 meatballs.',
      'Heat olive oil in a large skillet over medium-high. Brown the meatballs all over, about 6 minutes.',
      'Pour in the marinara. Reduce heat to a simmer, cover, and cook 12–15 minutes until the meatballs are cooked through.',
      'Serve over pasta or zoodles. Top with basil and parmesan.',
    ],
  },
  // Snacks
  {
    id: 'apple-pb',
    title: 'Apple + Peanut Butter',
    meal: 'snack',
    prepMin: 2,
    servings: 1,
    kcal: 240,
    proteinG: 8,
    carbsG: 28,
    fatsG: 12,
    diet: ['quick', 'plant-based', 'gluten-free'],
    blurb: 'Apple slices with 2 tablespoons of peanut butter. The OG.',
    pnNote: 'When a client asks "what should I snack on" — this is always the right answer.',
    ingredients: ['1 medium apple', '2 tbsp natural peanut butter'],
    steps: [
      'Slice the apple into wedges, removing the core.',
      'Spoon the peanut butter into a small bowl for dipping.',
      'Dip and eat.',
    ],
  },
  {
    id: 'greek-yogurt',
    title: 'Greek Yogurt + Berries + Walnuts',
    meal: 'snack',
    prepMin: 1,
    servings: 1,
    kcal: 220,
    proteinG: 18,
    carbsG: 18,
    fatsG: 9,
    diet: ['high-protein', 'quick', 'gluten-free'],
    blurb: 'Greek yogurt, frozen berries, a few walnuts. 30 seconds.',
    pnNote: 'Every client should know this snack — protein, slow carbs, healthy fat in one bowl.',
    ingredients: ['3/4 cup Greek yogurt 0%', '1/2 cup frozen berries', '6 walnut halves'],
    steps: [
      'Spoon the yogurt into a bowl.',
      'Top with the frozen berries (they\'ll thaw in 5 minutes if you want them soft).',
      'Crumble the walnuts over the top.',
    ],
  },
  {
    id: 'hummus-veg',
    title: 'Hummus + Veggies',
    meal: 'snack',
    prepMin: 3,
    servings: 1,
    kcal: 180,
    proteinG: 6,
    carbsG: 22,
    fatsG: 9,
    diet: ['plant-based', 'mediterranean', 'gluten-free', 'quick'],
    blurb: 'Carrot sticks, cucumber, bell pepper strips, a generous scoop of hummus.',
    pnNote: 'Volume without calorie cost. Helps the "eat slowly" practice land — crunchy food forces chewing.',
    ingredients: ['1/4 cup hummus', '2 carrots cut into sticks', '1 cucumber cut into spears', '1 bell pepper sliced'],
    steps: [
      'Cut all the vegetables into dippable sticks.',
      'Scoop the hummus into a small bowl.',
      'Dip and eat slowly — that\'s half the point.',
    ],
  },
  {
    id: 'cottage-pineapple',
    title: 'Cottage Cheese + Pineapple',
    meal: 'snack',
    prepMin: 2,
    servings: 1,
    kcal: 210,
    proteinG: 24,
    carbsG: 20,
    fatsG: 3,
    diet: ['high-protein', 'gluten-free', 'quick'],
    blurb: '90s lunch revival. Surprisingly satisfying.',
    pnNote: 'High-protein, low-fat snack. Pairs well with afternoon hunger spikes.',
    ingredients: ['1 cup low-fat cottage cheese', '1/2 cup fresh pineapple chunks'],
    steps: [
      'Spoon the cottage cheese into a bowl.',
      'Top with the pineapple.',
      'Eat. (The salty + sweet combination is the whole point.)',
    ],
  },
];

const DIET_LABEL: Record<DietTag, string> = {
  'high-protein': 'High protein',
  'plant-based': 'Plant-based',
  'gluten-free': 'Gluten-free',
  'dairy-free': 'Dairy-free',
  'low-carb': 'Low carb',
  mediterranean: 'Mediterranean',
  'meal-prep': 'Meal prep',
  quick: 'Quick (≤15 min)',
};

const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export function RecipesPage() {
  const [search, setSearch] = useState('');
  const [meal, setMeal] = useState<Meal | ''>('');
  const [diet, setDiet] = useState<DietTag | ''>('');
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return RECIPES.filter((r) => {
      if (meal && r.meal !== meal) return false;
      if (diet && !r.diet.includes(diet)) return false;
      if (needle) {
        const hay = (r.title + ' ' + r.blurb + ' ' + r.ingredients.join(' ')).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [search, meal, diet]);

  const groupedByMeal = useMemo(() => {
    const groups: Record<Meal, Recipe[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const r of filtered) groups[r.meal].push(r);
    return groups;
  }, [filtered]);

  const openRecipe = openRecipeId ? RECIPES.find((r) => r.id === openRecipeId) : null;

  return (
    <div className="px-4 sm:px-8 py-8 max-w-6xl mx-auto">
      <section className="mb-6">
        <h1
          className="leading-tight"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: 'clamp(1.875rem, 3.5vw, 2.5rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          Recipes
        </h1>
        <p className="mt-1 text-sm" style={{ color: N.mute }}>
          {RECIPES.length} coach-built recipes. Tap any card to see ingredients and step-by-step
          instructions.
        </p>
      </section>

      {/* Filter strip */}
      <div
        className="mb-6 p-3 rounded-xl flex items-center gap-2 flex-wrap"
        style={{ background: N.card, border: `1px solid ${N.rule}` }}
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: N.mute }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes…"
            className="w-full pl-9 pr-3 py-1.5 text-sm focus:outline-none rounded-lg"
            style={{
              background: N.inset,
              color: N.ink,
              border: `1px solid ${N.rule}`,
            }}
          />
        </div>
        <select
          value={meal}
          onChange={(e) => setMeal(e.target.value as Meal | '')}
          className="px-3 py-1.5 text-sm rounded-lg focus:outline-none"
          style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
        >
          <option value="">All meals</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snacks</option>
        </select>
        <select
          value={diet}
          onChange={(e) => setDiet(e.target.value as DietTag | '')}
          className="px-3 py-1.5 text-sm rounded-lg focus:outline-none"
          style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
        >
          <option value="">All diets</option>
          {Object.entries(DIET_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color: N.mute }}>
          No recipes match. Try a different search or clear the filters.
        </p>
      ) : (
        (Object.keys(groupedByMeal) as Meal[]).map((m) => {
          const list = groupedByMeal[m];
          if (list.length === 0) return null;
          return (
            <section key={m} className="mb-10">
              <h2
                className="leading-tight mb-3"
                style={{
                  fontFamily: SERIF_FONT,
                  color: N.ink,
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                }}
              >
                {MEAL_LABEL[m]}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((r) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    onOpen={() => setOpenRecipeId(r.id)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {openRecipe && (
        <RecipeDetailModal recipe={openRecipe} onClose={() => setOpenRecipeId(null)} />
      )}
    </div>
  );
}

function RecipeCard({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:-translate-y-0.5 transition-transform focus:outline-none focus-visible:ring-2"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
        boxShadow: 'var(--nut-shadow)',
        // @ts-expect-error CSS variable for ring color
        '--tw-ring-color': N.coral,
      }}
    >
      {/* Visual swatch — a colored block standing in for a photo */}
      <div
        className="aspect-[4/3] flex items-center justify-center relative"
        style={{
          background: `linear-gradient(135deg, ${N.coralSoft} 0%, ${N.sageSoft} 100%)`,
        }}
      >
        <span
          style={{
            fontFamily: SERIF_FONT,
            color: N.coralDeep,
            fontSize: '3.5rem',
            fontWeight: 500,
            fontStyle: 'italic',
            opacity: 0.4,
          }}
        >
          {recipe.title[0]}
        </span>
        <div
          className="absolute bottom-3 left-3 flex items-center gap-3 text-xs"
          style={{
            background: 'rgba(255,255,255,0.92)',
            color: N.ink,
            borderRadius: 999,
            padding: '4px 10px',
          }}
        >
          <span className="inline-flex items-center gap-1">
            <Clock size={11} /> {recipe.prepMin} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={11} /> {recipe.servings}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 flex-1 flex flex-col">
        <h3
          className="leading-tight mb-1"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: '1.25rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          {recipe.title}
        </h3>
        <p
          className="text-sm leading-relaxed mb-3"
          style={{ color: N.inkSoft }}
        >
          {recipe.blurb}
        </p>

        {/* Macros strip */}
        <div
          className="flex items-baseline gap-3 py-2 my-1 border-t border-b"
          style={{ borderColor: N.ruleSoft }}
        >
          <Stat label="kcal" value={recipe.kcal} color={N.ink} />
          <Stat label="P" value={`${recipe.proteinG}g`} color={N.coral} />
          <Stat label="C" value={`${recipe.carbsG}g`} color={N.sage} />
          <Stat label="F" value={`${recipe.fatsG}g`} color={N.honey} />
        </div>

        {/* Coaching note */}
        <div
          className="text-xs mt-3 p-2.5 rounded-lg"
          style={{
            background: N.coralSoft,
            color: N.coralDeep,
            border: `1px solid ${N.coral}33`,
          }}
        >
          <span className="font-semibold inline-flex items-center gap-1 mr-1">
            <Flame size={11} /> Why this:
          </span>
          {recipe.pnNote}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-3">
          {recipe.diet.map((d) => (
            <span
              key={d}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: N.inset,
                color: N.mute,
                fontWeight: 500,
              }}
            >
              {DIET_LABEL[d]}
            </span>
          ))}
        </div>

        {/* Subtle "open" affordance */}
        <p
          className="mt-3 text-[11px] uppercase tracking-[0.2em] font-semibold"
          style={{ color: N.coral }}
        >
          See ingredients & steps →
        </p>
      </div>
    </article>
  );
}

function RecipeDetailModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  // Esc to close + lock body scroll
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(20, 20, 30, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-screen"
        style={{
          background: N.card,
          border: `1px solid ${N.rule}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero */}
        <div
          className="aspect-[5/2] flex items-end justify-between px-6 pb-4 relative shrink-0"
          style={{
            background: `linear-gradient(135deg, ${N.coralSoft} 0%, ${N.sageSoft} 100%)`,
          }}
        >
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              fontFamily: SERIF_FONT,
              color: N.coralDeep,
              fontSize: '6rem',
              fontWeight: 500,
              fontStyle: 'italic',
              opacity: 0.25,
            }}
          >
            {recipe.title[0]}
          </span>
          <div className="relative z-10">
            <p
              className="text-[10px] uppercase tracking-[0.3em] font-semibold mb-1"
              style={{ color: N.coralDeep }}
            >
              {MEAL_LABEL[recipe.meal]}
            </p>
            <h2
              className="leading-tight"
              style={{
                fontFamily: SERIF_FONT,
                color: N.ink,
                fontSize: '1.75rem',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                textShadow: '0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              {recipe.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close recipe"
            className="absolute top-3 right-3 w-9 h-9 rounded-full inline-flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.92)',
              color: N.ink,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          <p className="text-sm leading-relaxed mb-4" style={{ color: N.inkSoft }}>
            {recipe.blurb}
          </p>

          {/* Stats */}
          <div
            className="grid grid-cols-2 sm:grid-cols-6 gap-2 py-3 mb-5 border-t border-b"
            style={{ borderColor: N.ruleSoft }}
          >
            <ModalStat label="Prep" value={`${recipe.prepMin} min`} color={N.ink} />
            <ModalStat label="Servings" value={recipe.servings} color={N.ink} />
            <ModalStat label="kcal" value={recipe.kcal} color={N.ink} />
            <ModalStat label="Protein" value={`${recipe.proteinG}g`} color={N.coral} />
            <ModalStat label="Carbs" value={`${recipe.carbsG}g`} color={N.sage} />
            <ModalStat label="Fats" value={`${recipe.fatsG}g`} color={N.honey} />
          </div>

          {/* Ingredients */}
          <h3
            className="text-[10px] uppercase tracking-[0.3em] font-semibold mb-2"
            style={{ color: N.coral }}
          >
            Ingredients
          </h3>
          <ul className="mb-6 space-y-1.5">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm"
                style={{ color: N.ink }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                  style={{ background: N.coral }}
                />
                <span>{ing}</span>
              </li>
            ))}
          </ul>

          {/* Steps */}
          <h3
            className="text-[10px] uppercase tracking-[0.3em] font-semibold mb-2"
            style={{ color: N.sage }}
          >
            How to make it
          </h3>
          <ol className="mb-6 space-y-3">
            {recipe.steps.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-3"
                style={{ color: N.ink }}
              >
                <span
                  className="inline-flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-xs font-semibold"
                  style={{
                    background: N.sageSoft,
                    color: N.sageDeep,
                  }}
                >
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          {/* Coaching note */}
          <div
            className="text-sm p-4 rounded-xl"
            style={{
              background: N.coralSoft,
              color: N.coralDeep,
              border: `1px solid ${N.coral}33`,
            }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.3em] font-semibold mb-1.5"
              style={{ color: N.coralDeep }}
            >
              <Flame size={11} className="inline mr-1" /> Coach's note
            </p>
            <p className="leading-relaxed">{recipe.pnNote}</p>
          </div>

          {/* Diet tags */}
          <div className="flex flex-wrap gap-1.5 mt-5">
            {recipe.diet.map((d) => (
              <span
                key={d}
                className="text-[11px] px-2.5 py-1 rounded-full"
                style={{
                  background: N.inset,
                  color: N.mute,
                  fontWeight: 500,
                }}
              >
                {DIET_LABEL[d]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="inline-flex items-baseline gap-1">
      <span
        className="text-[10px] uppercase font-semibold"
        style={{ color: N.mute, letterSpacing: '0.05em' }}
      >
        {label}
      </span>
      <span
        className="font-semibold tabular-nums"
        style={{ color, fontSize: '0.875rem' }}
      >
        {value}
      </span>
    </div>
  );
}

function ModalStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-start">
      <span
        className="text-[9px] uppercase font-semibold mb-0.5"
        style={{ color: N.mute, letterSpacing: '0.1em' }}
      >
        {label}
      </span>
      <span
        className="font-semibold tabular-nums"
        style={{ color, fontSize: '1rem' }}
      >
        {value}
      </span>
    </div>
  );
}
