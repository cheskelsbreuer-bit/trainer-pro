// Fights — the upcoming fight card + past results. Adding a fight
// either schedules it (no result yet) or records a completed bout with
// W-L-D + decision. Updating a fight closes the loop on a scheduled
// one. Backed by the `boxing_fights` table.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Plus, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import {
  BOXING_COLORS,
  readTierFromTags,
  readWeightFromTags,
  type FightRow,
} from '../theme';
import {
  BoxingPage,
  BoxingPageHeader,
  BoxingCard,
  BoxingSectionHeader,
  BoxingButton,
} from '../components/BoxingUI';
import { TierBadge } from '../components/FighterRecord';

const DECISIONS = ['KO', 'TKO', 'UD', 'SD', 'MD', 'PTS', 'DQ', 'No Contest'];

export function BoxingFights() {
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
    return (fights ?? []).filter(
      (f) => f.result === null && new Date(f.starts_at).getTime() >= now,
    ).reverse();
  }, [fights]);

  const past = useMemo(() => {
    return (fights ?? []).filter((f) => f.result !== null);
  }, [fights]);

  return (
    <BoxingPage>
      <BoxingPageHeader
        eyebrow="The card"
        title="Fights"
        subtitle="Upcoming bouts, recent decisions, the full record of every fight under your corner."
        corner="split"
        action={
          !tableMissing && (
            <BoxingButton onClick={() => setAdding(true)}>
              <Plus size={16} /> Book a fight
            </BoxingButton>
          )
        }
      />

      {tableMissing && (
        <BoxingCard accent="red" className="mb-6">
          <BoxingSectionHeader icon={<Trophy size={14} />} title="One-time setup needed" />
          <div className="p-4 text-sm" style={{ color: BOXING_COLORS.textSecondary }}>
            The <code>boxing_fights</code> table isn't installed yet. Run the
            migration <code>29_boxing_fights.sql</code> in Supabase SQL Editor
            (one-time), then refresh this page.
          </div>
        </BoxingCard>
      )}

      <BoxingCard className="mb-6" accent="red">
        <BoxingSectionHeader
          icon={<Trophy size={14} />}
          title="Upcoming fight card"
          hint={tableMissing ? undefined : `${upcoming.length} bouts scheduled`}
        />
        {tableMissing ? null : upcoming.length === 0 ? (
          <p
            className="px-4 py-8 text-sm text-center"
            style={{ color: BOXING_COLORS.textMuted }}
          >
            No bouts on the calendar. Book one to put it on the card.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: BOXING_COLORS.divider }}>
            {upcoming.map((f) => (
              <FightRowDisplay
                key={f.id}
                fight={f}
                fighters={fighters ?? []}
                onLogResult={() => setEditing(f)}
              />
            ))}
          </ul>
        )}
      </BoxingCard>

      {past.length > 0 && (
        <BoxingCard accent="gold">
          <BoxingSectionHeader
            icon={<Calendar size={14} />}
            title="Past results"
            hint={`${past.length} bouts on record`}
          />
          <ul className="divide-y" style={{ borderColor: BOXING_COLORS.divider }}>
            {past.map((f) => (
              <FightRowDisplay
                key={f.id}
                fight={f}
                fighters={fighters ?? []}
                muted
              />
            ))}
          </ul>
        </BoxingCard>
      )}

      {adding && (
        <FightDrawer
          fighters={fighters ?? []}
          existing={null}
          onClose={() => setAdding(false)}
          qc={qc}
          userId={user?.id}
        />
      )}
      {editing && (
        <FightDrawer
          fighters={fighters ?? []}
          existing={editing}
          onClose={() => setEditing(null)}
          qc={qc}
          userId={user?.id}
        />
      )}
    </BoxingPage>
  );
}

function FightRowDisplay({
  fight,
  fighters,
  muted,
  onLogResult,
}: {
  fight: FightRow;
  fighters: Client[];
  muted?: boolean;
  onLogResult?: () => void;
}) {
  const fighter = fighters.find((f) => f.id === fight.fighter_id);
  const tier = readTierFromTags(fighter?.tags);
  const weight = readWeightFromTags(fighter?.tags);

  const resultColor =
    fight.result === 'win'
      ? BOXING_COLORS.ok
      : fight.result === 'loss'
        ? BOXING_COLORS.danger
        : fight.result === 'draw'
          ? BOXING_COLORS.textMuted
          : BOXING_COLORS.textSecondary;
  const resultLabel =
    fight.result === 'win'
      ? 'WIN'
      : fight.result === 'loss'
        ? 'LOSS'
        : fight.result === 'draw'
          ? 'DRAW'
          : 'SCHEDULED';

  return (
    <li
      className="px-4 py-3 flex items-center gap-4"
      style={{ opacity: muted ? 0.85 : 1 }}
    >
      <div
        className="font-mono font-bold text-xs uppercase tracking-wider px-2 py-1 rounded shrink-0"
        style={{
          background: BOXING_COLORS.bgInset,
          color: BOXING_COLORS.gold,
          border: `1px solid ${BOXING_COLORS.divider}`,
          minWidth: 64,
          textAlign: 'center',
        }}
      >
        {new Date(fight.starts_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span
            className="font-bold truncate"
            style={{ color: BOXING_COLORS.textPrimary }}
          >
            {fighter?.full_name ?? 'Unknown fighter'}
          </span>
          <TierBadge tier={tier} />
          <span
            className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
            style={{ color: resultColor, border: `1px solid ${resultColor}55` }}
          >
            {resultLabel}
            {fight.decision ? ` · ${fight.decision}` : ''}
          </span>
        </div>
        <p
          className="text-xs flex items-center gap-2 flex-wrap"
          style={{ color: BOXING_COLORS.textSecondary }}
        >
          <span>
            vs.{' '}
            <span style={{ color: BOXING_COLORS.textPrimary }}>
              {fight.opponent_name || 'TBD'}
            </span>
          </span>
          {weight && (
            <span style={{ color: BOXING_COLORS.textMuted }}>
              · {weight.label}
            </span>
          )}
          {fight.venue && (
            <span
              className="inline-flex items-center gap-1"
              style={{ color: BOXING_COLORS.textMuted }}
            >
              <MapPin size={11} /> {fight.venue}
            </span>
          )}
        </p>
      </div>
      {onLogResult && fight.result === null && (
        <BoxingButton variant="gold" onClick={onLogResult}>
          <CheckCircle2 size={14} /> Log result
        </BoxingButton>
      )}
    </li>
  );
}

function FightDrawer({
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
    existing?.starts_at
      ? new Date(existing.starts_at).toISOString().slice(0, 16)
      : '',
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
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg rounded-md border"
        style={{
          background: BOXING_COLORS.bgPanel,
          borderColor: BOXING_COLORS.divider,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <BoxingSectionHeader
          icon={<Trophy size={14} />}
          title={existing ? 'Update fight' : 'Book a fight'}
        />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Lbl>Fighter</Lbl>
            <select
              value={fighterId}
              onChange={(e) => setFighterId(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={input()}
            >
              <option value="">Pick a fighter…</option>
              {fighters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Lbl>Opponent</Lbl>
            <input
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Name (or TBD)"
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={input()}
            />
          </div>
          <div>
            <Lbl>Date / time</Lbl>
            <input
              type="datetime-local"
              value={whenIso}
              onChange={(e) => setWhenIso(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={input()}
            />
          </div>
          <div className="sm:col-span-2">
            <Lbl>Venue (optional)</Lbl>
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Arena, city"
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={input()}
            />
          </div>
          <div>
            <Lbl>Result</Lbl>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as 'win' | 'loss' | 'draw' | '')}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={input()}
            >
              <option value="">Scheduled (no result yet)</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="draw">Draw</option>
            </select>
          </div>
          <div>
            <Lbl>Decision</Lbl>
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={input()}
            >
              <option value="">—</option>
              {DECISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Lbl>Notes (optional)</Lbl>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={input()}
            />
          </div>
          {save.error && (
            <p
              className="text-xs sm:col-span-2"
              style={{ color: BOXING_COLORS.danger }}
            >
              {(save.error as Error).message}
            </p>
          )}
        </div>
        <div
          className="px-4 py-3 border-t flex items-center justify-end gap-2"
          style={{ borderColor: BOXING_COLORS.divider }}
        >
          <BoxingButton variant="ghost" onClick={onClose}>
            Cancel
          </BoxingButton>
          <BoxingButton onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : existing ? 'Update' : 'Save fight'}
          </BoxingButton>
        </div>
      </div>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-xs uppercase tracking-wider font-semibold mb-1"
      style={{ color: BOXING_COLORS.textSecondary }}
    >
      {children}
    </label>
  );
}
function input(): React.CSSProperties {
  return {
    background: BOXING_COLORS.bgInset,
    color: BOXING_COLORS.textPrimary,
    border: `1px solid ${BOXING_COLORS.divider}`,
  };
}
