// Fight Night — every upcoming bout rendered as its own FIGHT POSTER,
// stacked vertically. Past results below as a compact "history book"
// reading more like newspaper coverage than a SaaS table.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import {
  C,
  DISPLAY_FONT,
  readTier,
  readWeight,
  readStance,
  computeRecord,
  type FightRow,
} from '../theme';
import { FightPoster } from '../components/FightPoster';

const DECISIONS = ['KO', 'TKO', 'UD', 'SD', 'MD', 'PTS', 'DQ', 'No Contest'];

export function FightNightPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<FightRow | null>(null);

  const { data: fighters } = useQuery({
    queryKey: ['boxing-fighters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });

  const { data: fights, error: loadError } = useQuery({
    queryKey: ['boxing-fights', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boxing_fights')
        .select('*')
        .order('starts_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FightRow[];
    },
  });

  const tableMissing =
    loadError &&
    (loadError as Error).message?.toLowerCase().includes('boxing_fights');

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (fights ?? [])
      .filter((f) => f.result === null && new Date(f.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [fights]);

  const past = useMemo(() => {
    return (fights ?? []).filter((f) => f.result !== null);
  }, [fights]);

  const fightsByFighter = useMemo(() => {
    const m = new Map<string, FightRow[]>();
    (fights ?? []).forEach((f) => {
      const a = m.get(f.fighter_id) ?? [];
      a.push(f);
      m.set(f.fighter_id, a);
    });
    return m;
  }, [fights]);

  return (
    <div>
      {/* Masthead */}
      <div
        className="px-4 sm:px-8 py-8 border-b flex items-end justify-between gap-3 flex-wrap"
        style={{ background: C.inkSoft, borderColor: C.rule }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: C.red }}>
            The Calendar
          </p>
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
            Fight Night
          </h1>
        </div>
        {!tableMissing && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-[0.2em] text-xs"
            style={{ fontFamily: DISPLAY_FONT, background: C.red, color: '#FFF' }}
          >
            <Plus size={14} /> Book Bout
          </button>
        )}
      </div>

      {tableMissing && (
        <div
          className="m-4 sm:m-8 p-6 border"
          style={{
            background: C.inkSoft,
            borderColor: C.rule,
            borderLeft: `4px solid ${C.red}`,
          }}
        >
          <p
            className="font-black uppercase mb-2"
            style={{
              fontFamily: DISPLAY_FONT,
              color: C.text,
              fontSize: '1.25rem',
              letterSpacing: '0.05em',
            }}
          >
            One-time setup
          </p>
          <p className="text-sm" style={{ color: C.textDim }}>
            Run the migration <code>29_boxing_fights.sql</code> in Supabase, then refresh.
          </p>
        </div>
      )}

      {/* Upcoming — stacked posters */}
      {!tableMissing && (
        <div className="px-4 sm:px-8 py-6 space-y-6">
          {upcoming.length === 0 ? (
            <p
              className="text-center text-sm py-16 uppercase tracking-[0.3em]"
              style={{ color: C.textFaint }}
            >
              no bouts on the card
            </p>
          ) : (
            upcoming.map((f) => {
              const fighter = (fighters ?? []).find((x) => x.id === f.fighter_id);
              if (!fighter) return null;
              const tier = readTier(fighter.tags);
              const weight = readWeight(fighter.tags);
              const stance = readStance(fighter.tags);
              const record = computeRecord(fightsByFighter.get(fighter.id) ?? []);
              return (
                <div key={f.id} className="relative">
                  <FightPoster
                    banner={isWithinDays(f.starts_at, 14) ? 'Main Event' : 'On the Card'}
                    date={f.starts_at}
                    venue={f.venue}
                    variant="card"
                    red={{
                      name: fighter.full_name,
                      record,
                      tier: { label: tier.label, color: tier.color },
                      weightLabel: weight?.label ?? null,
                      stance,
                    }}
                    blue={f.opponent_name ? { name: f.opponent_name } : null}
                  />
                  <button
                    onClick={() => setEditing(f)}
                    className="absolute bottom-3 right-3 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold"
                    style={{
                      fontFamily: DISPLAY_FONT,
                      background: C.beltGold,
                      color: '#1A1208',
                    }}
                  >
                    Log Result
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* History book — newspaper style */}
      {past.length > 0 && (
        <section className="border-t" style={{ borderColor: C.rule }}>
          <div
            className="px-4 sm:px-8 py-4 flex items-baseline justify-between"
            style={{ background: C.inkSoft }}
          >
            <h2
              className="font-black uppercase"
              style={{
                fontFamily: DISPLAY_FONT,
                color: C.text,
                fontSize: '1.5rem',
                letterSpacing: '0.05em',
              }}
            >
              History Book
            </h2>
            <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: C.textDim }}>
              {past.length} bouts
            </span>
          </div>
          <ul>
            {past.map((f) => {
              const fighter = (fighters ?? []).find((x) => x.id === f.fighter_id);
              const tone = f.result === 'win' ? C.ok : f.result === 'loss' ? C.danger : C.textDim;
              return (
                <li
                  key={f.id}
                  className="px-4 sm:px-8 py-4 border-t grid grid-cols-[60px_70px_1fr_auto] gap-4 items-center"
                  style={{ borderColor: C.rule }}
                >
                  <span
                    className="font-black uppercase text-center"
                    style={{
                      fontFamily: DISPLAY_FONT,
                      color: tone,
                      fontSize: '1.5rem',
                      letterSpacing: '0.05em',
                      lineHeight: 0.9,
                    }}
                  >
                    {(f.result ?? '').slice(0, 1).toUpperCase()}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-[0.2em] font-mono"
                    style={{ color: C.textDim }}
                  >
                    {new Date(f.starts_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit',
                    })}
                  </span>
                  <div className="min-w-0">
                    <p
                      className="font-bold uppercase truncate"
                      style={{
                        fontFamily: DISPLAY_FONT,
                        color: C.text,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {fighter?.full_name ?? '—'}{' '}
                      <span style={{ color: C.textDim, fontWeight: 400 }}>
                        vs. {f.opponent_name ?? 'TBA'}
                      </span>
                    </p>
                    <p className="text-[11px]" style={{ color: C.textDim }}>
                      {f.decision ? `${f.decision}` : ''}{f.venue ? `${f.decision ? ' · ' : ''}${f.venue}` : ''}
                    </p>
                  </div>
                  {f.venue && (
                    <MapPin size={12} style={{ color: C.textFaint }} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {adding && (
        <FightModal
          fighters={fighters ?? []}
          existing={null}
          onClose={() => setAdding(false)}
          qc={qc}
          userId={user?.id}
        />
      )}
      {editing && (
        <FightModal
          fighters={fighters ?? []}
          existing={editing}
          onClose={() => setEditing(null)}
          qc={qc}
          userId={user?.id}
        />
      )}
    </div>
  );
}

function isWithinDays(iso: string, n: number): boolean {
  const diff = (new Date(iso).getTime() - Date.now()) / 86400000;
  return diff >= 0 && diff <= n;
}

function FightModal({
  fighters,
  existing,
  onClose,
  qc,
  userId,
}: {
  fighters: Client[];
  existing: FightRow | null;
  onClose: () => void;
  qc: ReturnType<typeof useQueryClient>;
  userId: string | undefined;
}) {
  const [fighterId, setFighterId] = useState(existing?.fighter_id ?? '');
  const [opponent, setOpponent] = useState(existing?.opponent_name ?? '');
  const [whenIso, setWhenIso] = useState(
    existing?.starts_at ? new Date(existing.starts_at).toISOString().slice(0, 16) : '',
  );
  const [venue, setVenue] = useState(existing?.venue ?? '');
  const [result, setResult] = useState<'win' | 'loss' | 'draw' | ''>(
    existing?.result ?? '',
  );
  const [decision, setDecision] = useState(existing?.decision ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in');
      if (!fighterId) throw new Error('Pick a fighter');
      if (!whenIso) throw new Error('Pick a date');
      const payload = {
        trainer_id: userId,
        fighter_id: fighterId,
        opponent_name: opponent.trim() || null,
        starts_at: new Date(whenIso).toISOString(),
        venue: venue.trim() || null,
        result: result || null,
        decision: decision || null,
        notes: notes.trim() || null,
      };
      if (existing) {
        const { error } = await supabase
          .from('boxing_fights')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('boxing_fights').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boxing-fights'] });
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
        className="w-full max-w-lg p-6"
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
            style={{
              fontFamily: DISPLAY_FONT,
              color: C.text,
              fontSize: '1.5rem',
              letterSpacing: '0.05em',
            }}
          >
            {existing ? 'Update Bout' : 'Book a Bout'}
          </h2>
          <button onClick={onClose} style={{ color: C.textDim }}>
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Sel label="Fighter" value={fighterId} onChange={setFighterId} className="sm:col-span-2">
            <option value="">Pick a fighter…</option>
            {fighters.map((f) => (
              <option key={f.id} value={f.id}>{f.full_name}</option>
            ))}
          </Sel>
          <Txt label="Opponent" value={opponent} onChange={setOpponent} placeholder="Name (or TBD)" />
          <Txt
            label="Date / time"
            value={whenIso}
            onChange={setWhenIso}
            type="datetime-local"
          />
          <Txt label="Venue (optional)" value={venue} onChange={setVenue} className="sm:col-span-2" />
          <Sel label="Result" value={result} onChange={(v) => setResult(v as 'win' | 'loss' | 'draw' | '')}>
            <option value="">Scheduled (no result)</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="draw">Draw</option>
          </Sel>
          <Sel label="Decision" value={decision} onChange={setDecision}>
            <option value="">—</option>
            {DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Sel>
          <div className="sm:col-span-2">
            <span className="block text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: C.textDim }}>
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{
                background: C.inkSoft,
                color: C.text,
                border: `1px solid ${C.rule}`,
              }}
            />
          </div>
          {save.error && (
            <p className="text-xs sm:col-span-2" style={{ color: C.danger }}>
              {(save.error as Error).message}
            </p>
          )}
        </div>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full py-3 mt-4 font-black uppercase tracking-[0.2em]"
          style={{ fontFamily: DISPLAY_FONT, background: C.red, color: '#FFF' }}
        >
          {save.isPending ? 'Saving…' : existing ? 'Update Bout' : 'Sign the Card'}
        </button>
      </div>
    </div>
  );
}

function Txt({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: C.textDim }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm focus:outline-none"
        style={{ background: C.inkSoft, color: C.text, border: `1px solid ${C.rule}` }}
      />
    </label>
  );
}

function Sel({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: C.textDim }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm focus:outline-none"
        style={{ background: C.inkSoft, color: C.text, border: `1px solid ${C.rule}` }}
      >
        {children}
      </select>
    </label>
  );
}
