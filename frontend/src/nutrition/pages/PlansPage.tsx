// Meal Plans — recipe-card grid styled like a cookbook contents page.
// V1 ships with a small library of starter macro-shaped templates. A
// future migration adds a real meal_plans table; for now the page
// reads as a curated collection of sample plans the coach can hand to
// clients.

import { useState } from 'react';
import { N, SERIF_FONT, NUTRITION_GOALS } from '../theme';

interface StarterPlan {
  id: string;
  title: string;
  blurb: string;
  goal: 'fat-loss' | 'maintenance' | 'muscle-gain' | 'health';
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  feel: string; // one-line "vibe" e.g. "Mediterranean, plant-forward"
}

const STARTERS: StarterPlan[] = [
  {
    id: 'lean-150',
    title: 'The Lean Cut',
    blurb: 'A modest deficit with plenty of protein and fibrous vegetables. Built to lose fat without losing the joy of dinner.',
    goal: 'fat-loss',
    kcal: 1600,
    protein: 140,
    carbs: 140,
    fats: 55,
    feel: 'High protein, Mediterranean leaning',
  },
  {
    id: 'lean-180',
    title: 'The Slow Burn',
    blurb: 'A gentler deficit for clients with a long runway. Sustainable, lots of whole foods, no white-knuckling.',
    goal: 'fat-loss',
    kcal: 1850,
    protein: 150,
    carbs: 175,
    fats: 65,
    feel: 'Whole-food, balanced',
  },
  {
    id: 'maintain-200',
    title: 'Even Keel',
    blurb: 'Maintenance for clients who have arrived. Built around adequacy, variety, and a steady weekly rhythm.',
    goal: 'maintenance',
    kcal: 2000,
    protein: 140,
    carbs: 220,
    fats: 70,
    feel: 'Mediterranean, balanced',
  },
  {
    id: 'maintain-230',
    title: 'The Steady Plate',
    blurb: 'Maintenance with a bit more carbohydrate for active clients. Lots of grains, fruit, and dairy if tolerated.',
    goal: 'maintenance',
    kcal: 2300,
    protein: 145,
    carbs: 280,
    fats: 70,
    feel: 'Carb-forward, athletic',
  },
  {
    id: 'gain-260',
    title: 'The Build',
    blurb: 'A small surplus, carb-forward. Designed to grow strong without growing soft. Lots of starches around training.',
    goal: 'muscle-gain',
    kcal: 2600,
    protein: 180,
    carbs: 320,
    fats: 75,
    feel: 'Heavy carb, post-workout shake',
  },
  {
    id: 'gain-300',
    title: 'The Big Build',
    blurb: 'For clients with high training volume who need real fuel. Calorie-dense without being junky.',
    goal: 'muscle-gain',
    kcal: 3000,
    protein: 200,
    carbs: 380,
    fats: 90,
    feel: 'Athletic, hearty',
  },
  {
    id: 'health-1800',
    title: 'The Long Game',
    blurb: 'Maintenance plan with a heavy emphasis on micronutrients, fiber, and omega-3s. Built for longevity, not aesthetics.',
    goal: 'health',
    kcal: 1900,
    protein: 110,
    carbs: 220,
    fats: 75,
    feel: 'Plant-forward, omega-rich',
  },
  {
    id: 'health-2100',
    title: 'The Mediterranean',
    blurb: 'Classic Mediterranean structure — fish twice a week, olive oil, beans, plenty of vegetables. Heart-and-brain friendly.',
    goal: 'health',
    kcal: 2100,
    protein: 120,
    carbs: 240,
    fats: 85,
    feel: 'Mediterranean, anti-inflammatory',
  },
];

export function PlansPage() {
  const [goalFilter, setGoalFilter] = useState('');
  const filtered = goalFilter
    ? STARTERS.filter((p) => p.goal === goalFilter)
    : STARTERS;

  return (
    <div className="px-6 sm:px-12 pt-10 max-w-6xl mx-auto">
      <section className="text-center mb-8">
        <p className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: N.coral }}>
          The Cookbook
        </p>
        <h2
          className="leading-tight"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
            fontWeight: 600,
          }}
        >
          Meal Plans
        </h2>
        <p
          className="mt-2 text-sm italic max-w-xl mx-auto"
          style={{ color: N.mute, fontFamily: SERIF_FONT }}
        >
          A starter library to hand a new client — adjust the macros, swap in
          their preferences, and send. Custom plan builder coming soon.
        </p>
      </section>

      <div className="flex items-center justify-center gap-1.5 mb-8">
        <button
          onClick={() => setGoalFilter('')}
          className="px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] rounded-full italic"
          style={{
            background: goalFilter === '' ? N.sageSoft : 'transparent',
            color: goalFilter === '' ? N.sageDeep : N.mute,
            border: `1px solid ${goalFilter === '' ? N.sage : N.rule}`,
            fontFamily: SERIF_FONT,
          }}
        >
          All
        </button>
        {NUTRITION_GOALS.map((g) => {
          const active = goalFilter === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setGoalFilter(g.id)}
              className="px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] rounded-full italic"
              style={{
                background: active ? `${g.color}22` : 'transparent',
                color: active ? g.color : N.mute,
                border: `1px solid ${active ? g.color : N.rule}`,
                fontFamily: SERIF_FONT,
              }}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: StarterPlan }) {
  const goalMeta =
    NUTRITION_GOALS.find((g) => g.id === plan.goal) ?? NUTRITION_GOALS[1];
  return (
    <article
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
      }}
    >
      {/* Plate placeholder — a circle on a sage tile */}
      <div
        className="aspect-[3/2] flex items-center justify-center relative"
        style={{ background: N.sageSoft }}
      >
        <div
          className="rounded-full"
          style={{
            width: '70%',
            paddingTop: '70%',
            background: N.card,
            border: `2px dashed ${N.sage}`,
          }}
          aria-hidden
        />
        <p
          className="absolute text-[10px] uppercase tracking-[0.4em] italic"
          style={{
            color: N.sageDeep,
            fontFamily: SERIF_FONT,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {plan.kcal} kcal
        </p>
        <span
          className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.25em] px-2 py-1 rounded-full italic"
          style={{
            background: N.card,
            color: goalMeta.color,
            border: `1px solid ${goalMeta.color}66`,
            fontFamily: SERIF_FONT,
          }}
        >
          {goalMeta.label}
        </span>
      </div>

      <div className="px-5 py-4 flex-1 flex flex-col">
        <h3
          className="leading-tight mb-1"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: '1.5rem',
            fontWeight: 600,
          }}
        >
          {plan.title}
        </h3>
        <p
          className="text-[10px] uppercase tracking-[0.25em] mb-2 italic"
          style={{ color: N.mute, fontFamily: SERIF_FONT }}
        >
          {plan.feel}
        </p>
        <p
          className="text-sm italic mb-3 flex-1"
          style={{ color: N.inkSoft, fontFamily: SERIF_FONT, lineHeight: 1.5 }}
        >
          {plan.blurb}
        </p>
        <div className="flex items-baseline gap-4 pt-2 border-t" style={{ borderColor: N.ruleSoft }}>
          <Macro label="P" value={`${plan.protein}g`} color={N.coral} />
          <Macro label="C" value={`${plan.carbs}g`} color={N.sage} />
          <Macro label="F" value={`${plan.fats}g`} color={N.honey} />
        </div>
      </div>
    </article>
  );
}

function Macro({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-[10px] uppercase tracking-[0.25em]"
        style={{ color: N.mute }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: SERIF_FONT,
          color,
          fontSize: '1.1rem',
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}
