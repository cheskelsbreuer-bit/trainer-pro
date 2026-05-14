// Recipe library — curated recipes coaches can browse and reference
// with clients. V1 ships with ~40 PN-aligned recipes covering all
// major goal types, dietary needs, and time constraints. Each recipe
// has macros, prep time, and a brief why-this-recipe note grounded
// in PN principles (protein at each meal, fist of veggies, hand
// portions for carbs and fats).
//
// V2 will add a database-backed recipe table so coaches can save
// their own. V3 connects to a real food database (USDA / Edamam).

import { useMemo, useState } from 'react';
import { Clock, Users, Flame, Search } from 'lucide-react';
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
    pnNote: 'Hits the "protein at every meal" practice with one cupped hand of carbs from oats — clean PN breakfast for fat-loss clients.',
    ingredients: ['1/2 cup rolled oats', '3/4 cup Greek yogurt (0% or 2%)', '1 scoop protein powder', '1/2 cup berries', '1 tsp chia seeds'],
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
    pnNote: 'Underrated PN move — high protein, slow carbs from berries, almost no prep.',
    ingredients: ['1 cup low-fat cottage cheese', '1/2 cup mixed berries', '1 tsp honey', '1 tbsp slivered almonds'],
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
    pnNote: 'Adding the eggs is the PN upgrade — turns a fat-and-carbs meal into a complete one.',
    ingredients: ['2 slices sourdough', '1/2 avocado', '2 eggs', 'lemon juice', 'chili flakes', 'flaky salt'],
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
    pnNote: 'Textbook PN plate: palm of protein (chickpeas + feta), cupped hand of carbs (farro), two fists of veg, thumb of fat (tahini).',
    ingredients: ['1 cup cooked farro', '1 can chickpeas, rinsed', '1 cucumber diced', '1 cup cherry tomatoes', '1/3 cup feta', '2 tbsp tahini', '1 lemon', 'parsley'],
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
    ingredients: ['1 lb ground turkey 93%', '2 tsp sesame oil', '2 cloves garlic', '1 tbsp grated ginger', '3 tbsp tamari', '1 head butter lettuce', 'scallions'],
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
    ingredients: ['6 oz salmon fillet', '3/4 cup cooked jasmine rice', '2 cups bok choy or spinach', '1 tbsp olive oil', 'garlic', 'lemon'],
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
    pnNote: 'PN clients love this one — feels indulgent, hits all four hand portions.',
    ingredients: ['4 cups mixed greens', '5 oz grilled chicken', '1/2 cup white beans', '1/4 avocado', '1/4 cup cherry tomatoes', '2 tbsp olive oil vinaigrette'],
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
    pnNote: 'The PN-shaped meal-prep move. One pan, four servings, hits every hand portion.',
    ingredients: ['1.5 lb chicken thighs', '2 sweet potatoes cubed', '1 head broccoli', '3 tbsp olive oil', '2 tsp paprika', 'salt + pepper'],
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
    ingredients: ['2 cups French lentils', '6 cups stock', '2 carrots diced', '2 celery stalks', '1 onion', '4 garlic cloves', '1 tsp smoked paprika', '1 can crushed tomato'],
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
    ingredients: ['1 lb shrimp', '2 cups snap peas', '1 red pepper sliced', '3 scallions', '1 cup cooked rice', '2 tbsp tamari', '1 tsp sesame oil'],
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
    ingredients: ['1 lb ground turkey', '1/4 cup breadcrumbs', '1 egg', '2 cloves garlic', '1 jar good marinara', 'basil', 'parm to finish'],
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
    pnNote: 'Every PN client should know this snack — protein, slow carbs, healthy fat.',
    ingredients: ['3/4 cup Greek yogurt 0%', '1/2 cup frozen berries', '6 walnut halves'],
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
    pnNote: 'Volume without calorie cost. Helps the "eat slowly" practice land.',
    ingredients: ['1/4 cup hummus', '2 carrots', '1 cucumber', '1 bell pepper'],
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
    ingredients: ['1 cup low-fat cottage cheese', '1/2 cup fresh pineapple'],
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
          {RECIPES.length} PN-shaped recipes. Each one notes WHY it works — palm of protein,
          fist of veg, hand portions for carbs and fat.
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
                  <RecipeCard key={r.id} recipe={r} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <article
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
        boxShadow: 'var(--nut-shadow)',
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

        {/* PN note */}
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
      </div>
    </article>
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
