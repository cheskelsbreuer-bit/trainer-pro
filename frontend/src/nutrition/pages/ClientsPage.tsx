// Clients — magazine-style portrait cards. Each client is a profile
// "page" in the issue: initial letter as photo placeholder (sage tile),
// serif name, italic goal, weight progress bar, macro chip row.
//
// NOT a table. NOT a fighter trading card. The visual story is
// "this is a person we're tending to."

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import {
  N,
  SERIF_FONT,
  NUTRITION_GOALS,
  readGoal,
  readCalorieTarget,
  readProteinTarget,
  readCarbsTarget,
  readFatsTarget,
  readCurrentWeight,
  readGoalWeight,
  readStartingWeight,
  computeProgressToGoal,
  GOAL_TAG,
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
    <div className="px-6 sm:px-12 pt-10 max-w-6xl mx-auto">
      {/* Issue-title style header */}
      <section className="mb-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: N.coral }}>
          The Roster
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
          People We're Tending To
        </h2>
        <p
          className="mt-2 text-sm italic"
          style={{ color: N.mute, fontFamily: SERIF_FONT }}
        >
          {clients ? `${clients.length} clients in your practice` : 'loading…'}
        </p>
      </section>

      {/* Quiet filter strip */}
      <div className="mb-8 flex items-center gap-3 flex-wrap justify-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search clients…"
          className="px-3 py-1.5 text-sm focus:outline-none rounded-md italic"
          style={{
            background: N.card,
            color: N.ink,
            border: `1px solid ${N.rule}`,
            fontFamily: SERIF_FONT,
            width: 220,
          }}
        />
        <div className="flex items-center gap-1.5">
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
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] rounded-md"
          style={{
            background: N.sage,
            color: '#FFF',
            fontFamily: SERIF_FONT,
            fontStyle: 'italic',
          }}
        >
          <Plus size={13} /> Add a client
        </button>
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
  const goal = readGoal(client.tags);
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
        {client.goals && (
          <p
            className="text-xs italic mt-1 line-clamp-2"
            style={{ color: N.inkSoft, fontFamily: SERIF_FONT }}
          >
            "{client.goals}"
          </p>
        )}

        {/* Weight progress — only when we have starting + current + goal */}
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

        {/* Macro chip row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs">
          {kcal != null && <Macro label="kcal" value={`${kcal}`} tone="ink" />}
          {protein != null && <Macro label="P" value={`${protein}g`} tone="coral" />}
          {carbs != null && <Macro label="C" value={`${carbs}g`} tone="sage" />}
          {fats != null && <Macro label="F" value={`${fats}g`} tone="honey" />}
          {kcal == null && protein == null && carbs == null && fats == null && (
            <span
              className="italic text-[11px]"
              style={{ color: N.muteFaint, fontFamily: SERIF_FONT }}
            >
              No macro plan set
            </span>
          )}
        </div>
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
