// The Work — round-based training. Hero is a TIMER mockup (boxing
// gyms live by the bell). Below: a weekly heatmap of who put in work
// each day. Side rail: the round log form.
//
// This is intentionally NOT structured like the dojo's class-grid +
// "today's classes" pattern. The page reads like a coach's clipboard.

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, RotateCcw, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Session } from '../../lib/database.types';
import { C, DISPLAY_FONT } from '../theme';

type SessWithClient = Session & { clients: { full_name: string } | null };

const ROUND_LEN = 3 * 60;
const REST_LEN = 60;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WorkPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Round timer state — pure UI, no persistence
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'round' | 'rest'>('round');
  const [secondsLeft, setSecondsLeft] = useState(ROUND_LEN);
  const [roundNumber, setRoundNumber] = useState(1);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        if (phase === 'round') {
          setPhase('rest');
          return REST_LEN;
        }
        setPhase('round');
        setRoundNumber((r) => r + 1);
        return ROUND_LEN;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase]);

  function resetTimer() {
    setRunning(false);
    setPhase('round');
    setSecondsLeft(ROUND_LEN);
    setRoundNumber(1);
  }

  // Data
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

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7;
    return new Date(d.getTime() - dow * 86400000);
  }, []);

  const { data: weekLog } = useQuery({
    queryKey: ['boxing-week-log', user?.id, weekStart.toISOString()],
    queryFn: async () => {
      const end = new Date(weekStart.getTime() + 7 * 86400000);
      const { data, error } = await supabase
        .from('sessions')
        .select('*, clients(full_name)')
        .gte('starts_at', weekStart.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SessWithClient[];
    },
  });

  // Build a heatmap: rows = fighters, cols = day of week, value = rounds totaled
  const heatmap = useMemo(() => {
    const map = new Map<string, { name: string; days: number[] }>();
    (fighters ?? []).forEach((f) => {
      map.set(f.id, { name: f.full_name, days: [0, 0, 0, 0, 0, 0, 0] });
    });
    (weekLog ?? []).forEach((s) => {
      const dayIdx = (new Date(s.starts_at).getDay() + 6) % 7;
      // Estimate rounds from session_type like "Boxing training (12R)"
      const m = (s.session_type ?? '').match(/\((\d+)R\)/);
      const rounds = m ? parseInt(m[1], 10) : 1;
      const entry = map.get(s.client_id);
      if (entry) entry.days[dayIdx] += rounds;
    });
    return Array.from(map.values()).filter((e) => e.days.some((d) => d > 0));
  }, [fighters, weekLog]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
      {/* Main column — timer hero + heatmap */}
      <div className="border-b lg:border-b-0 lg:border-r" style={{ borderColor: C.rule }}>
        {/* Timer hero */}
        <div
          className="px-6 sm:px-10 py-10 text-center"
          style={{ background: C.inkSoft, borderBottom: `1px solid ${C.rule}` }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.5em] mb-2"
            style={{ color: phase === 'round' ? C.red : C.beltGold }}
          >
            {phase === 'round' ? `Round ${roundNumber}` : 'Rest'}
          </p>
          <p
            className="font-black"
            style={{
              fontFamily: DISPLAY_FONT,
              color: C.text,
              fontSize: 'clamp(5rem, 14vw, 10rem)',
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}
          >
            {formatClock(secondsLeft)}
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setRunning((r) => !r)}
              className="inline-flex items-center gap-2 px-5 py-2.5 font-bold uppercase tracking-[0.2em] text-sm"
              style={{
                fontFamily: DISPLAY_FONT,
                background: C.red,
                color: '#FFF',
              }}
            >
              {running ? <Pause size={14} /> : <Play size={14} />}
              {running ? 'Hold' : 'Bell'}
            </button>
            <button
              onClick={resetTimer}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.2em]"
              style={{
                fontFamily: DISPLAY_FONT,
                background: 'transparent',
                color: C.textDim,
                border: `1px solid ${C.rule}`,
              }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] mt-3" style={{ color: C.textFaint }}>
            3-min rounds · 1-min rest
          </p>
        </div>

        {/* Heatmap — week of work */}
        <div className="px-6 sm:px-10 py-8">
          <p className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: C.red }}>
            The week
          </p>
          <h2
            className="font-black uppercase mb-5"
            style={{
              fontFamily: DISPLAY_FONT,
              color: C.text,
              fontSize: '2rem',
              letterSpacing: '0.04em',
              lineHeight: 0.95,
            }}
          >
            Rounds put in
          </h2>
          {heatmap.length === 0 ? (
            <p
              className="text-center text-sm py-12 uppercase tracking-[0.3em]"
              style={{ color: C.textFaint }}
            >
              no work logged this week yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th
                      className="text-left px-2 py-2 text-[10px] uppercase tracking-[0.3em]"
                      style={{ color: C.textDim }}
                    />
                    {DAY_LABELS.map((d) => (
                      <th
                        key={d}
                        className="px-2 py-2 text-[10px] uppercase tracking-[0.3em] text-center"
                        style={{ color: C.textDim }}
                      >
                        {d}
                      </th>
                    ))}
                    <th
                      className="px-2 py-2 text-[10px] uppercase tracking-[0.3em] text-right"
                      style={{ color: C.beltGold }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map((row) => {
                    const total = row.days.reduce((s, n) => s + n, 0);
                    return (
                      <tr
                        key={row.name}
                        className="border-t"
                        style={{ borderColor: C.rule }}
                      >
                        <td
                          className="px-2 py-2 font-bold uppercase truncate max-w-[180px]"
                          style={{
                            fontFamily: DISPLAY_FONT,
                            color: C.text,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {row.name}
                        </td>
                        {row.days.map((n, i) => (
                          <td key={i} className="px-1 py-2 text-center">
                            <HeatCell value={n} />
                          </td>
                        ))}
                        <td
                          className="px-2 py-2 text-right font-mono"
                          style={{ color: C.beltGold }}
                        >
                          {total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Side rail — log a round form */}
      <aside className="p-6 sm:p-8">
        <LogForm fighters={fighters ?? []} qc={qc} userId={user?.id} />
        <RecentList weekLog={weekLog ?? []} />
      </aside>
    </div>
  );
}

function HeatCell({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span
        className="inline-block w-6 h-6"
        style={{
          background: C.inkSoft,
          border: `1px solid ${C.rule}`,
        }}
      />
    );
  }
  // Intensity scale — 1-3 light, 4-7 medium, 8+ dark
  const intensity = value >= 8 ? 1 : value >= 4 ? 0.7 : 0.4;
  return (
    <span
      className="inline-flex w-6 h-6 items-center justify-center font-mono text-[10px]"
      style={{
        background: `rgba(225, 15, 31, ${intensity})`,
        color: intensity > 0.5 ? '#FFF' : C.text,
      }}
      title={`${value} rounds`}
    >
      {value}
    </span>
  );
}

function LogForm({
  fighters,
  qc,
  userId,
}: {
  fighters: Client[];
  qc: ReturnType<typeof useQueryClient>;
  userId: string | undefined;
}) {
  const [fighterId, setFighterId] = useState('');
  const [mitts, setMitts] = useState('');
  const [bag, setBag] = useState('');
  const [sparring, setSparring] = useState('');
  const [cond, setCond] = useState('');

  const total =
    (parseInt(mitts || '0', 10) || 0) +
    (parseInt(bag || '0', 10) || 0) +
    (parseInt(sparring || '0', 10) || 0) +
    (parseInt(cond || '0', 10) || 0);

  const log = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in');
      if (!fighterId) throw new Error('Pick a fighter');
      if (total === 0) throw new Error('Need at least one round');
      const now = new Date();
      const parts: string[] = [];
      const mN = parseInt(mitts || '0', 10) || 0;
      const bN = parseInt(bag || '0', 10) || 0;
      const sN = parseInt(sparring || '0', 10) || 0;
      const cN = parseInt(cond || '0', 10) || 0;
      if (mN) parts.push(`${mN}R mitts`);
      if (bN) parts.push(`${bN}R bag`);
      if (sN) parts.push(`${sN}R sparring`);
      if (cN) parts.push(`${cN}R conditioning`);
      const { error } = await supabase.from('sessions').insert({
        trainer_id: userId,
        client_id: fighterId,
        starts_at: now.toISOString(),
        ends_at: new Date(now.getTime() + total * 3 * 60_000).toISOString(),
        status: 'completed',
        session_type: `Boxing training (${total}R)`,
        notes: parts.join(' · '),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMitts(''); setBag(''); setSparring(''); setCond('');
      qc.invalidateQueries({ queryKey: ['boxing-week-log'] });
    },
  });

  return (
    <div className="mb-6">
      <p className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: C.red }}>
        Log a session
      </p>
      <h2
        className="font-black uppercase mb-4"
        style={{
          fontFamily: DISPLAY_FONT,
          color: C.text,
          fontSize: '1.75rem',
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}
      >
        On the books
      </h2>
      <div className="space-y-3">
        <select
          value={fighterId}
          onChange={(e) => setFighterId(e.target.value)}
          className="w-full px-3 py-2 text-sm focus:outline-none"
          style={{ background: C.inkSoft, color: C.text, border: `1px solid ${C.rule}` }}
        >
          <option value="">Pick a fighter…</option>
          {fighters.map((f) => (
            <option key={f.id} value={f.id}>{f.full_name}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <RoundsInput label="Mitts" color={C.red} value={mitts} onChange={setMitts} />
          <RoundsInput label="Bag" color={C.blueCorner} value={bag} onChange={setBag} />
          <RoundsInput label="Sparring" color={C.beltGold} value={sparring} onChange={setSparring} />
          <RoundsInput label="Conditioning" color={C.textDim} value={cond} onChange={setCond} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-[0.3em]" style={{ color: C.textDim }}>
            Total: <strong style={{ color: C.beltGold }}>{total}R</strong>
          </span>
          <button
            onClick={() => log.mutate()}
            disabled={log.isPending || !fighterId || total === 0}
            className="inline-flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-[0.2em] text-xs disabled:opacity-40"
            style={{ fontFamily: DISPLAY_FONT, background: C.beltGold, color: '#1A1208' }}
          >
            <Plus size={13} /> {log.isPending ? 'Saving…' : 'Log'}
          </button>
        </div>
        {log.error && (
          <p className="text-[11px]" style={{ color: C.danger }}>
            {(log.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}

function RoundsInput({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span
        className="block text-[10px] uppercase tracking-[0.3em] mb-1"
        style={{ color }}
      >
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="99"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full px-3 py-2 text-center font-mono text-lg font-bold focus:outline-none"
        style={{
          background: C.inkSoft,
          color: C.text,
          border: `1px solid ${C.rule}`,
        }}
      />
    </label>
  );
}

function RecentList({ weekLog }: { weekLog: SessWithClient[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: C.red }}>
        Most recent
      </p>
      {weekLog.length === 0 ? (
        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: C.textFaint }}>
          no sessions yet
        </p>
      ) : (
        <ul>
          {weekLog.slice(0, 6).map((s) => (
            <li
              key={s.id}
              className="border-t py-2.5"
              style={{ borderColor: C.rule }}
            >
              <p
                className="font-bold uppercase text-sm truncate"
                style={{
                  fontFamily: DISPLAY_FONT,
                  color: C.text,
                  letterSpacing: '0.04em',
                }}
              >
                {s.clients?.full_name ?? '—'}
              </p>
              {s.notes && (
                <p className="text-[11px] mt-0.5" style={{ color: C.textDim }}>
                  {s.notes}
                </p>
              )}
              <p className="text-[10px] uppercase tracking-[0.2em] mt-0.5" style={{ color: C.textFaint }}>
                {new Date(s.starts_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatClock(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
