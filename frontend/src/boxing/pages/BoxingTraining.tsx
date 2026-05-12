// Training — the round log. The killer differentiator vs. dojo:
// instead of "did this student attend a class", real boxing coaches
// track "this fighter did 5 rounds mitts + 3 rounds bag + 2 rounds
// sparring today." That's what shows skill progression and conditioning.
//
// V1: an always-visible log form at the top — pick a fighter, fill
// rounds for mitts/bag/sparring/conditioning, hit Log. We stash each
// log row as a `sessions` row with `session_type` encoding the work
// and `notes` carrying the round breakdown. A proper round_log table
// will come later; this fits the existing schema.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, CalendarDays, Plus, Timer } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Session } from '../../lib/database.types';
import { BOXING_COLORS } from '../theme';
import {
  BoxingPage,
  BoxingPageHeader,
  BoxingCard,
  BoxingSectionHeader,
  BoxingButton,
} from '../components/BoxingUI';

type SessionWithClient = Session & { clients: { full_name: string } | null };

const DEFAULT_ROUND_LENGTH_MIN = 3;

export function BoxingTraining() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [fighterId, setFighterId] = useState('');
  const [mitts, setMitts] = useState('');
  const [bag, setBag] = useState('');
  const [sparring, setSparring] = useState('');
  const [conditioning, setConditioning] = useState('');

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

  const { data: weekLog } = useQuery({
    queryKey: ['boxing-training-week', user?.id],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 7);
      const { data, error } = await supabase
        .from('sessions')
        .select('*, clients(full_name)')
        .gte('starts_at', start.toISOString())
        .order('starts_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SessionWithClient[];
    },
  });

  const log = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!fighterId) throw new Error('Pick a fighter');
      const mittsN = Math.max(0, parseInt(mitts || '0', 10));
      const bagN = Math.max(0, parseInt(bag || '0', 10));
      const sparringN = Math.max(0, parseInt(sparring || '0', 10));
      const conditioningN = Math.max(0, parseInt(conditioning || '0', 10));
      const total = mittsN + bagN + sparringN + conditioningN;
      if (total === 0) throw new Error('At least one round needed');

      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + total * DEFAULT_ROUND_LENGTH_MIN * 60_000);
      // Pack the round breakdown into session_type + notes so the row
      // stays readable in tools other than this page.
      const session_type = `Boxing training (${total}R)`;
      const noteParts: string[] = [];
      if (mittsN) noteParts.push(`${mittsN}R mitts`);
      if (bagN) noteParts.push(`${bagN}R bag`);
      if (sparringN) noteParts.push(`${sparringN}R sparring`);
      if (conditioningN) noteParts.push(`${conditioningN}R conditioning`);

      const { error } = await supabase.from('sessions').insert({
        trainer_id: user.id,
        client_id: fighterId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'completed',
        session_type,
        notes: noteParts.join(' · '),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMitts('');
      setBag('');
      setSparring('');
      setConditioning('');
      qc.invalidateQueries({ queryKey: ['boxing-training-week'] });
      qc.invalidateQueries({ queryKey: ['boxing-training-today'] });
    },
  });

  // Top this-week trainers — derive from the week log.
  const weekRollup = useMemo(() => {
    const m = new Map<string, { name: string; sessions: number }>();
    (weekLog ?? []).forEach((s) => {
      const name = s.clients?.full_name ?? 'Unknown';
      const cur = m.get(s.client_id) ?? { name, sessions: 0 };
      cur.sessions++;
      m.set(s.client_id, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.sessions - a.sessions).slice(0, 5);
  }, [weekLog]);

  return (
    <BoxingPage>
      <BoxingPageHeader
        eyebrow="The work"
        title="Training"
        subtitle="Log rounds the moment the bell goes — mitts, bag, sparring, conditioning."
        corner="blue"
      />

      {/* The round log — always visible */}
      <BoxingCard className="mb-6" accent="red">
        <BoxingSectionHeader
          icon={<Timer size={14} />}
          title="Log today's rounds"
          hint="Each round defaults to 3 minutes"
        />
        <div className="p-4 space-y-3">
          <div>
            <label
              className="block text-xs uppercase tracking-wider font-semibold mb-1"
              style={{ color: BOXING_COLORS.textSecondary }}
            >
              Fighter
            </label>
            <select
              value={fighterId}
              onChange={(e) => setFighterId(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={{
                background: BOXING_COLORS.bgInset,
                color: BOXING_COLORS.textPrimary,
                border: `1px solid ${BOXING_COLORS.divider}`,
              }}
            >
              <option value="">Pick a fighter…</option>
              {(fighters ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <RoundField label="Mitts" value={mitts} onChange={setMitts} accent={BOXING_COLORS.red} />
            <RoundField label="Bag" value={bag} onChange={setBag} accent={BOXING_COLORS.blue} />
            <RoundField label="Sparring" value={sparring} onChange={setSparring} accent={BOXING_COLORS.gold} />
            <RoundField
              label="Conditioning"
              value={conditioning}
              onChange={setConditioning}
              accent={BOXING_COLORS.textMuted}
            />
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs" style={{ color: BOXING_COLORS.textMuted }}>
              Total rounds: <strong style={{ color: BOXING_COLORS.textPrimary }}>{
                (parseInt(mitts || '0', 10) || 0) +
                (parseInt(bag || '0', 10) || 0) +
                (parseInt(sparring || '0', 10) || 0) +
                (parseInt(conditioning || '0', 10) || 0)
              }</strong>
            </p>
            <BoxingButton
              variant="gold"
              onClick={() => log.mutate()}
              disabled={log.isPending || !fighterId}
            >
              <Plus size={14} /> {log.isPending ? 'Saving…' : 'Log session'}
            </BoxingButton>
          </div>
          {log.error && (
            <p className="text-xs" style={{ color: BOXING_COLORS.danger }}>
              {(log.error as Error).message}
            </p>
          )}
          {log.isSuccess && !log.isPending && !log.error && (
            <p className="text-xs" style={{ color: BOXING_COLORS.ok }}>
              Session logged.
            </p>
          )}
        </div>
      </BoxingCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <BoxingCard accent="gold">
          <BoxingSectionHeader
            icon={<Dumbbell size={14} />}
            title="This week — top trainers"
            hint="Most sessions logged in the last 7 days"
          />
          {weekRollup.length === 0 ? (
            <p
              className="px-4 py-8 text-sm text-center"
              style={{ color: BOXING_COLORS.textMuted }}
            >
              Nothing logged this week yet.
            </p>
          ) : (
            <ul
              className="divide-y"
              style={{ borderColor: BOXING_COLORS.divider }}
            >
              {weekRollup.map((r, i) => (
                <li
                  key={r.name + i}
                  className="px-4 py-2.5 flex items-center gap-3 text-sm"
                >
                  <span
                    className="text-xs font-mono w-5 text-center"
                    style={{ color: BOXING_COLORS.textMuted }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="flex-1 truncate font-semibold"
                    style={{ color: BOXING_COLORS.textPrimary }}
                  >
                    {r.name}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: BOXING_COLORS.gold }}
                  >
                    {r.sessions} sessions
                  </span>
                </li>
              ))}
            </ul>
          )}
        </BoxingCard>

        <BoxingCard>
          <BoxingSectionHeader
            icon={<CalendarDays size={14} />}
            title="Recent sessions"
            hint={`${(weekLog ?? []).length} this week`}
          />
          {!weekLog || weekLog.length === 0 ? (
            <p
              className="px-4 py-8 text-sm text-center"
              style={{ color: BOXING_COLORS.textMuted }}
            >
              No sessions logged in the last 7 days.
            </p>
          ) : (
            <ul
              className="divide-y"
              style={{ borderColor: BOXING_COLORS.divider }}
            >
              {weekLog.slice(0, 8).map((s) => (
                <li key={s.id} className="px-4 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-semibold truncate"
                      style={{ color: BOXING_COLORS.textPrimary }}
                    >
                      {s.clients?.full_name ?? '—'}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: BOXING_COLORS.textMuted }}
                    >
                      {new Date(s.starts_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {s.notes && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: BOXING_COLORS.textSecondary }}
                    >
                      {s.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </BoxingCard>
      </div>
    </BoxingPage>
  );
}

function RoundField({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  return (
    <div>
      <label
        className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
        style={{ color: accent }}
      >
        {label}
      </label>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="99"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full px-3 py-2 rounded text-lg font-bold font-mono text-center focus:outline-none"
        style={{
          background: BOXING_COLORS.bgInset,
          color: BOXING_COLORS.textPrimary,
          border: `1px solid ${BOXING_COLORS.divider}`,
        }}
      />
    </div>
  );
}
