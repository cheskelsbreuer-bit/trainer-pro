// Clients — magazine-style portrait cards. Each client is a profile
// "page" in the issue: initial letter as photo placeholder (sage tile),
// serif name, italic goal, weight progress bar, macro chip row.
//
// NOT a table. NOT a fighter trading card. The visual story is
// "this is a person we're tending to."

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import {
  N,
  SERIF_FONT,
  NUTRITION_GOALS,
  NUTRITION_SKILLS,
  NUTRITION_PRACTICES,
  SKILL_BY_ID,
  PRACTICE_WINDOW_DAYS,
  readGoal,
  readCalorieTarget,
  readProteinTarget,
  readCarbsTarget,
  readFatsTarget,
  readCurrentWeight,
  readGoalWeight,
  readStartingWeight,
  readActivePractice,
  daysOnPractice,
  isPracticeWindowDone,
  computeProgressToGoal,
  GOAL_TAG,
  PRACTICE_TAG,
  PRACTICE_STARTED_TAG,
  CALORIES_TAG,
  PROTEIN_TAG,
  CARBS_TAG,
  FATS_TAG,
  WEIGHT_LB_TAG,
  GOAL_WEIGHT_TAG,
  STARTING_WEIGHT_TAG,
} from '../theme';

export function ClientsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [goalFilter, setGoalFilter] = useState('');
  const [adding, setAdding] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ['nutrition-clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });

  const filtered = useMemo(() => {
    return (clients ?? []).filter((c) => {
      if (q.trim() && !c.full_name.toLowerCase().includes(q.trim().toLowerCase())) {
        return false;
      }
      if (goalFilter && readGoal(c.tags).id !== goalFilter) return false;
      return true;
    });
  }, [clients, q, goalFilter]);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-6xl mx-auto">
      {/* App-style header: left-aligned title + action */}
      <section className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
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
            Clients
          </h1>
          <p className="mt-1 text-sm" style={{ color: N.mute }}>
            {clients ? `${clients.length} active in your practice` : 'Loading…'}
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg shadow-sm hover:opacity-95 transition-opacity"
          style={{ background: N.coral, color: '#FFF' }}
        >
          <Plus size={15} /> Add client
        </button>
      </section>

      {/* Filter strip — modern app style, not centered editorial */}
      <div
        className="mb-6 p-2 rounded-xl flex items-center gap-2 flex-wrap"
        style={{
          background: N.card,
          border: `1px solid ${N.rule}`,
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clients…"
          className="flex-1 min-w-[160px] px-3 py-1.5 text-sm focus:outline-none rounded-lg"
          style={{
            background: N.inset,
            color: N.ink,
            border: `1px solid ${N.rule}`,
          }}
        />
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setGoalFilter('')}
            className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors"
            style={{
              background: goalFilter === '' ? N.coral : 'transparent',
              color: goalFilter === '' ? '#FFF' : N.mute,
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
                className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors"
                style={{
                  background: active ? g.color : 'transparent',
                  color: active ? '#FFF' : N.mute,
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile-card grid */}
      {filtered.length === 0 ? (
        <p
          className="text-center py-16 italic"
          style={{ color: N.mute, fontFamily: SERIF_FONT, fontSize: '1.1rem' }}
        >
          No clients match these filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <ClientProfileCard key={c.id} client={c} />
          ))}
        </div>
      )}

      {adding && <AddClientModal onClose={() => setAdding(false)} qc={qc} />}
    </div>
  );
}

function ClientProfileCard({ client }: { client: Client }) {
  // Wraps the card in a Link so the whole card opens the detail page.
  return (
    <Link
      to={`/clients/${client.id}`}
      className="block transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-2xl"
    >
      <ClientProfileCardBody client={client} />
    </Link>
  );
}

function ClientProfileCardBody({ client }: { client: Client }) {
  const goal = readGoal(client.tags);
  const practice = readActivePractice(client.tags);
  const skill = practice ? SKILL_BY_ID[practice.skillId] : null;
  const dayN = daysOnPractice(client.tags);
  const windowDone = isPracticeWindowDone(client.tags);
  const kcal = readCalorieTarget(client.tags);
  const protein = readProteinTarget(client.tags);
  const carbs = readCarbsTarget(client.tags);
  const fats = readFatsTarget(client.tags);
  const cur = readCurrentWeight(client.tags);
  const target = readGoalWeight(client.tags);
  const start = readStartingWeight(client.tags);
  const pct = computeProgressToGoal(start, cur, target);

  return (
    <article
      className="rounded-2xl overflow-hidden"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
        borderTop: practice ? `3px solid ${skill?.color ?? N.sage}` : `1px solid ${N.rule}`,
      }}
    >
      {/* Initial-letter "photo" */}
      <div
        className="aspect-[3/2] flex items-center justify-center relative"
        style={{ background: N.sageSoft }}
      >
        <span
          style={{
            fontFamily: SERIF_FONT,
            color: N.sageDeep,
            fontSize: '4.5rem',
            fontWeight: 500,
            fontStyle: 'italic',
            lineHeight: 1,
          }}
        >
          {(client.full_name[0] || '?').toUpperCase()}
        </span>
        {/* Goal ribbon — bottom-left */}
        <span
          className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.25em] px-2 py-1 rounded-full italic"
          style={{
            background: N.card,
            color: goal.color,
            border: `1px solid ${goal.color}66`,
            fontFamily: SERIF_FONT,
          }}
        >
          {goal.label}
        </span>
        {/* Window-done flag — bottom-right, in coral */}
        {windowDone && (
          <span
            className="absolute bottom-3 right-3 text-[10px] uppercase tracking-[0.25em] px-2 py-1 rounded-full italic"
            style={{
              background: N.coralSoft,
              color: N.coralDeep,
              border: `1px solid ${N.coral}`,
              fontFamily: SERIF_FONT,
            }}
          >
            Next practice?
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        <h3
          className="truncate leading-tight"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: '1.5rem',
            fontWeight: 600,
          }}
        >
          {client.full_name}
        </h3>

        {/* The active practice — the PN lead. */}
        {practice && skill ? (
          <div
            className="mt-3 px-3 py-2.5 rounded-lg"
            style={{
              background: `${skill.color}10`,
              border: `1px solid ${skill.color}30`,
            }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.3em] mb-0.5 italic"
              style={{ color: skill.color, fontFamily: SERIF_FONT }}
            >
              Practicing
            </p>
            <p
              className="leading-tight mb-1"
              style={{
                fontFamily: SERIF_FONT,
                color: N.ink,
                fontSize: '1.0625rem',
                fontWeight: 600,
              }}
            >
              {practice.label}
            </p>
            <p
              className="text-[11px] italic"
              style={{ color: N.inkSoft, fontFamily: SERIF_FONT }}
            >
              Day {dayN ?? '—'} of {PRACTICE_WINDOW_DAYS}
              {' · '}
              {skill.label}
            </p>
            {/* Practice window progress */}
            <div
              className="h-1 rounded-full overflow-hidden mt-2"
              style={{ background: 'rgba(0,0,0,0.06)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  background: skill.color,
                  width: `${Math.min(100, ((dayN ?? 0) / PRACTICE_WINDOW_DAYS) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <p
            className="text-xs italic mt-3"
            style={{ color: N.muteFaint, fontFamily: SERIF_FONT }}
          >
            No active practice. Pick one from the Library.
          </p>
        )}

        {client.goals && (
          <p
            className="text-xs italic mt-3 line-clamp-2"
            style={{ color: N.inkSoft, fontFamily: SERIF_FONT }}
          >
            "{client.goals}"
          </p>
        )}

        {/* Weight progress — secondary detail */}
        {pct != null && (
          <div className="mt-3">
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: N.inset }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  background: goal.color,
                  width: `${Math.round(pct * 100)}%`,
                }}
              />
            </div>
            <p
              className="text-[10px] uppercase tracking-[0.2em] mt-1.5 italic"
              style={{ color: N.mute, fontFamily: SERIF_FONT }}
            >
              {start} → {target} lb · currently {cur}
            </p>
          </div>
        )}

        {/* Macros — tucked at the bottom as supporting detail (PN secondary) */}
        {(kcal != null || protein != null || carbs != null || fats != null) && (
          <div
            className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t text-xs"
            style={{ borderColor: N.ruleSoft }}
          >
            {kcal != null && <Macro label="kcal" value={`${kcal}`} tone="ink" />}
            {protein != null && <Macro label="P" value={`${protein}g`} tone="coral" />}
            {carbs != null && <Macro label="C" value={`${carbs}g`} tone="sage" />}
            {fats != null && <Macro label="F" value={`${fats}g`} tone="honey" />}
          </div>
        )}
      </div>
    </article>
  );
}


function Macro({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'ink' | 'coral' | 'sage' | 'honey';
}) {
  const color =
    tone === 'coral' ? N.coral : tone === 'sage' ? N.sage : tone === 'honey' ? N.honey : N.ink;
  return (
    <span className="inline-flex items-baseline gap-1">
      <span
        className="text-[10px] uppercase tracking-[0.2em]"
        style={{ color: N.mute }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: SERIF_FONT,
          color,
          fontSize: '0.95rem',
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </span>
  );
}

function AddClientModal({
  onClose,
  qc,
}: {
  onClose: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [goal, setGoal] = useState('maintenance');
  const [practice, setPractice] = useState('eat-slowly');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [startWt, setStartWt] = useState('');
  const [curWt, setCurWt] = useState('');
  const [goalWt, setGoalWt] = useState('');
  const [goals, setGoals] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!name.trim()) throw new Error('Name required');
      const tags: string[] = [`${GOAL_TAG}${goal}`];
      if (practice) {
        tags.push(`${PRACTICE_TAG}${practice}`);
        tags.push(`${PRACTICE_STARTED_TAG}${new Date().toISOString().slice(0, 10)}`);
      }
      const addNum = (prefix: string, raw: string) => {
        const v = parseInt(raw, 10);
        if (Number.isFinite(v) && v > 0) tags.push(`${prefix}${v}`);
      };
      addNum(CALORIES_TAG, kcal);
      addNum(PROTEIN_TAG, protein);
      addNum(CARBS_TAG, carbs);
      addNum(FATS_TAG, fats);
      addNum(STARTING_WEIGHT_TAG, startWt);
      addNum(WEIGHT_LB_TAG, curWt);
      addNum(GOAL_WEIGHT_TAG, goalWt);
      const { error } = await supabase.from('clients').insert({
        trainer_id: user.id,
        full_name: name.trim(),
        email: email.trim() || null,
        goals: goals.trim() || null,
        status: 'active',
        tags,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition-clients'] });
      onClose();
    },
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(47, 36, 25, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6"
        style={{ background: N.card, border: `1px solid ${N.rule}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="leading-none"
            style={{
              fontFamily: SERIF_FONT,
              color: N.ink,
              fontSize: '1.75rem',
              fontWeight: 600,
            }}
          >
            Welcome a new client
          </h3>
          <button onClick={onClose} style={{ color: N.mute }} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Full name" value={name} onChange={setName} autoFocus />
          <Field label="Email (optional)" value={email} onChange={setEmail} type="email" />
          <div>
            <Lbl>Goal</Lbl>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
              style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
            >
              {NUTRITION_GOALS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Lbl>Starting practice — PN curriculum</Lbl>
            <select
              value={practice}
              onChange={(e) => setPractice(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
              style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
            >
              <option value="">— no practice yet —</option>
              {NUTRITION_SKILLS.map((s) => (
                <optgroup key={s.id} label={s.label}>
                  {NUTRITION_PRACTICES.filter((p) => p.skillId === s.id)
                    .sort((a, b) => a.order - b.order)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <p
              className="text-[10px] italic mt-1"
              style={{ color: N.muteFaint, fontFamily: SERIF_FONT }}
            >
              PN recommends starting with "Eat slowly" for almost every new
              client — the highest-ROI habit.
            </p>
          </div>
          <p
            className="text-[10px] uppercase tracking-[0.25em] italic pt-2"
            style={{ color: N.mute, fontFamily: SERIF_FONT }}
          >
            Macros — optional, secondary to practices
          </p>
          <div className="grid grid-cols-4 gap-2">
            <Field label="kcal" value={kcal} onChange={setKcal} type="number" />
            <Field label="P (g)" value={protein} onChange={setProtein} type="number" />
            <Field label="C (g)" value={carbs} onChange={setCarbs} type="number" />
            <Field label="F (g)" value={fats} onChange={setFats} type="number" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Starting lb" value={startWt} onChange={setStartWt} type="number" />
            <Field label="Current lb" value={curWt} onChange={setCurWt} type="number" />
            <Field label="Goal lb" value={goalWt} onChange={setGoalWt} type="number" />
          </div>
          <div>
            <Lbl>Why are they here?</Lbl>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md focus:outline-none italic"
              style={{
                background: N.inset,
                color: N.ink,
                border: `1px solid ${N.rule}`,
                fontFamily: SERIF_FONT,
              }}
            />
          </div>
          {create.error && (
            <p className="text-xs italic" style={{ color: N.danger, fontFamily: SERIF_FONT }}>
              {(create.error as Error).message}
            </p>
          )}
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !name.trim()}
            className="w-full py-2.5 mt-2 rounded-md uppercase tracking-[0.25em] text-xs disabled:opacity-50 italic"
            style={{
              background: N.sage,
              color: '#FFF',
              fontFamily: SERIF_FONT,
            }}
          >
            {create.isPending ? 'Saving…' : 'Welcome them'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <Lbl>{label}</Lbl>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
        style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
      />
    </label>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="block text-[10px] uppercase tracking-[0.25em] mb-1 italic"
      style={{ color: N.mute, fontFamily: SERIF_FONT }}
    >
      {children}
    </span>
  );
}
