// Stable — the fighter roster as a trading-card wall. Big card grid,
// not a table. Filters above as inline pills (not a card with form
// inputs like the dojo's pattern).

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import {
  C,
  DISPLAY_FONT,
  FIGHTER_TIERS,
  WEIGHT_CLASSES,
  readTier,
  readWeight,
  readStance,
  readCurrentWeight,
  computeRecord,
  TIER_TAG,
  WEIGHT_TAG,
  STANCE_TAG,
  HEIGHT_TAG,
  REACH_TAG,
  WEIGHT_LB_TAG,
  type FightRow,
} from '../theme';
import { FighterCard } from '../components/FighterCard';

export function StablePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [weightFilter, setWeightFilter] = useState('');
  const [adding, setAdding] = useState(false);

  const { data: fighters } = useQuery({
    queryKey: ['boxing-fighters', user?.id],
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

  const { data: fights } = useQuery({
    queryKey: ['boxing-fights', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('boxing_fights').select('*');
      if (error) {
        if ((error.message ?? '').toLowerCase().includes('boxing_fights')) return [] as FightRow[];
        throw error;
      }
      return (data ?? []) as FightRow[];
    },
  });

  const fightsByFighter = useMemo(() => {
    const m = new Map<string, FightRow[]>();
    (fights ?? []).forEach((f) => {
      const a = m.get(f.fighter_id) ?? [];
      a.push(f);
      m.set(f.fighter_id, a);
    });
    return m;
  }, [fights]);

  const cards = useMemo(
    () =>
      (fighters ?? []).map((f) => ({
        id: f.id,
        name: f.full_name,
        record: computeRecord(fightsByFighter.get(f.id) ?? []),
        tier: readTier(f.tags),
        weight: readWeight(f.tags),
        stance: readStance(f.tags),
        currentWeightLb: readCurrentWeight(f.tags),
      })),
    [fighters, fightsByFighter],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cards.filter((c) => {
      if (needle && !c.name.toLowerCase().includes(needle)) return false;
      if (tierFilter && c.tier.id !== tierFilter) return false;
      if (weightFilter && c.weight?.id !== weightFilter) return false;
      return true;
    });
  }, [cards, q, tierFilter, weightFilter]);

  return (
    <div>
      {/* Stable masthead */}
      <div
        className="px-4 sm:px-8 py-6 sm:py-10 border-b"
        style={{ background: C.inkSoft, borderColor: C.rule }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.5em] mb-2"
          style={{ color: C.red }}
        >
          The Roster
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1
            className="font-black uppercase"
            style={{
              fontFamily: DISPLAY_FONT,
              color: C.text,
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              letterSpacing: '0.04em',
              lineHeight: 0.9,
            }}
          >
            The Stable
          </h1>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-widest text-xs"
            style={{
              fontFamily: DISPLAY_FONT,
              background: C.red,
              color: '#FFF',
              letterSpacing: '0.15em',
              border: `1px solid ${C.red}`,
            }}
          >
            <Plus size={14} /> Add Fighter
          </button>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] mt-3" style={{ color: C.textDim }}>
          {fighters ? `${fighters.length} fighters` : 'loading…'}
        </p>
      </div>

      {/* Filter pills — inline, not a boxed form */}
      <div
        className="px-4 sm:px-8 py-3 border-b flex flex-wrap items-center gap-2"
        style={{ borderColor: C.rule }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search…"
          className="flex-1 min-w-[160px] px-3 py-1.5 text-sm focus:outline-none"
          style={{
            background: C.ink,
            color: C.text,
            border: `1px solid ${C.rule}`,
          }}
        />
        <PillGroup
          label="Tier"
          value={tierFilter}
          onChange={setTierFilter}
          options={[
            { v: '', label: 'all' },
            ...FIGHTER_TIERS.map((t) => ({ v: t.id, label: t.label, color: t.color })),
          ]}
        />
        <PillGroup
          label="Weight"
          value={weightFilter}
          onChange={setWeightFilter}
          options={[
            { v: '', label: 'all' },
            ...WEIGHT_CLASSES.map((w) => ({ v: w.id, label: w.label })),
          ]}
          collapsible
        />
      </div>

      {/* Card grid */}
      <div className="px-4 sm:px-8 py-6">
        {filtered.length === 0 ? (
          <p
            className="text-center text-sm py-20 uppercase tracking-[0.3em]"
            style={{ color: C.textFaint }}
          >
            no fighters match
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map((c) => (
              <FighterCard
                key={c.id}
                id={c.id}
                name={c.name}
                record={c.record}
                tier={c.tier}
                weight={c.weight}
                stance={c.stance}
                currentWeightLb={c.currentWeightLb}
                to={null}
              />
            ))}
          </div>
        )}
      </div>

      {adding && <AddFighterModal onClose={() => setAdding(false)} qc={qc} />}
    </div>
  );
}

function PillGroup({
  label,
  value,
  onChange,
  options,
  collapsible = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string; color?: string }[];
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className="text-[10px] uppercase tracking-[0.3em] mr-1"
        style={{ color: C.textDim }}
        onClick={() => collapsible && setOpen((o) => !o)}
      >
        {label}:
      </span>
      {open
        ? options.map((o) => {
            const active = o.v === value;
            return (
              <button
                key={o.v}
                onClick={() => onChange(o.v)}
                className="px-2 py-0.5 text-[11px] uppercase tracking-widest"
                style={{
                  fontFamily: DISPLAY_FONT,
                  letterSpacing: '0.1em',
                  background: active ? (o.color ?? C.red) : 'transparent',
                  color: active ? '#FFF' : C.textDim,
                  border: `1px solid ${active ? (o.color ?? C.red) : C.rule}`,
                }}
              >
                {o.label}
              </button>
            );
          })
        : (
          <button
            onClick={() => setOpen(true)}
            className="px-2 py-0.5 text-[11px] uppercase tracking-widest"
            style={{
              fontFamily: DISPLAY_FONT,
              background: 'transparent',
              color: C.textDim,
              border: `1px solid ${C.rule}`,
            }}
          >
            {options.find((o) => o.v === value)?.label ?? 'all'} ▾
          </button>
        )}
    </div>
  );
}

function AddFighterModal({
  onClose,
  qc,
}: {
  onClose: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState('rec');
  const [weight, setWeight] = useState('');
  const [stance, setStance] = useState<'orthodox' | 'southpaw'>('orthodox');
  const [heightIn, setHeightIn] = useState('');
  const [reachIn, setReachIn] = useState('');
  const [currentLb, setCurrentLb] = useState('');
  const [dob, setDob] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!name.trim()) throw new Error('Name required');
      const tags: string[] = [`${TIER_TAG}${tier}`];
      if (weight) tags.push(`${WEIGHT_TAG}${weight}`);
      tags.push(`${STANCE_TAG}${stance}`);
      const h = parseInt(heightIn, 10);
      if (Number.isFinite(h) && h > 0) tags.push(`${HEIGHT_TAG}${h}`);
      const r = parseInt(reachIn, 10);
      if (Number.isFinite(r) && r > 0) tags.push(`${REACH_TAG}${r}`);
      const w = parseInt(currentLb, 10);
      if (Number.isFinite(w) && w > 0) tags.push(`${WEIGHT_LB_TAG}${w}`);
      const { error } = await supabase.from('clients').insert({
        trainer_id: user.id,
        full_name: name.trim(),
        email: email.trim() || null,
        date_of_birth: dob || null,
        status: 'active',
        tags,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boxing-fighters'] });
      onClose();
    },
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-6"
        style={{
          background: C.ink,
          border: `1px solid ${C.rule}`,
          borderTop: `4px solid ${C.red}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="font-black uppercase"
            style={{ fontFamily: DISPLAY_FONT, color: C.text, fontSize: '1.5rem', letterSpacing: '0.05em' }}
          >
            Sign a fighter
          </h2>
          <button onClick={onClose} style={{ color: C.textDim }}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <Input label="Name" value={name} onChange={setName} autoFocus />
          <Input label="Email (optional)" value={email} onChange={setEmail} type="email" />
          <SelectField label="Tier" value={tier} onChange={setTier}>
            {FIGHTER_TIERS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </SelectField>
          <SelectField label="Weight class" value={weight} onChange={setWeight}>
            <option value="">— not set —</option>
            {WEIGHT_CLASSES.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}{w.lbsMax ? ` (≤ ${w.lbsMax} lb)` : ''}
              </option>
            ))}
          </SelectField>
          <SelectField label="Stance" value={stance} onChange={(v) => setStance(v as 'orthodox' | 'southpaw')}>
            <option value="orthodox">Orthodox</option>
            <option value="southpaw">Southpaw</option>
          </SelectField>
          {/* Tale of the tape inputs — every real boxing app captures these */}
          <div className="grid grid-cols-3 gap-2">
            <Input label="Height (in)" value={heightIn} onChange={setHeightIn} type="number" />
            <Input label="Reach (in)" value={reachIn} onChange={setReachIn} type="number" />
            <Input label="Current lb" value={currentLb} onChange={setCurrentLb} type="number" />
          </div>
          <Input label="Date of birth (optional)" value={dob} onChange={setDob} type="date" />
          {create.error && (
            <p className="text-xs" style={{ color: C.danger }}>
              {(create.error as Error).message}
            </p>
          )}
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !name.trim()}
            className="w-full py-3 mt-2 font-black uppercase tracking-[0.2em]"
            style={{
              fontFamily: DISPLAY_FONT,
              background: C.red,
              color: '#FFF',
              fontSize: '1rem',
            }}
          >
            {create.isPending ? 'Saving…' : 'Sign Fighter'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
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
      <span
        className="block text-[10px] uppercase tracking-[0.3em] mb-1"
        style={{ color: C.textDim }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm focus:outline-none"
        style={{
          background: C.inkSoft,
          color: C.text,
          border: `1px solid ${C.rule}`,
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="block text-[10px] uppercase tracking-[0.3em] mb-1"
        style={{ color: C.textDim }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm focus:outline-none"
        style={{
          background: C.inkSoft,
          color: C.text,
          border: `1px solid ${C.rule}`,
        }}
      >
        {children}
      </select>
    </label>
  );
}
