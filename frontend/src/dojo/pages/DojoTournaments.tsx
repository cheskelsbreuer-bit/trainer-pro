// Tournaments — upcoming events, student registrations, results.
// V1 stores tournament rows as session_type='tournament' sessions with
// a session note containing the tournament name. A proper tournament
// table will follow once the sensei flow is validated.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Plus, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Session } from '../../lib/database.types';
import { DOJO_COLORS } from '../theme';
import {
  DojoPage,
  DojoPageHeader,
  DojoCard,
  DojoSectionHeader,
  DojoButton,
} from '../components/DojoUI';

export function DojoTournaments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [whenIso, setWhenIso] = useState('');

  const { data: tournaments } = useQuery({
    queryKey: ['dojo-tournaments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_type', 'tournament')
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (tournaments ?? []).filter(
      (t) => new Date(t.starts_at).getTime() >= now,
    );
  }, [tournaments]);

  const past = useMemo(() => {
    const now = Date.now();
    return (tournaments ?? [])
      .filter((t) => new Date(t.starts_at).getTime() < now)
      .reverse();
  }, [tournaments]);

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!name.trim()) throw new Error('Tournament name required');
      if (!whenIso) throw new Error('Pick a date');
      const startsAt = new Date(whenIso).toISOString();
      const endsAt = new Date(
        new Date(whenIso).getTime() + 8 * 3600_000,
      ).toISOString();
      // Tournaments piggyback on sessions until a proper table exists.
      // We store the tournament name in `notes` to keep `session_type` clean.
      const { error } = await supabase.from('sessions').insert({
        trainer_id: user.id,
        // Self-reference for client_id — the sessions table requires it.
        // A proper schema migration will replace this.
        client_id: user.id,
        starts_at: startsAt,
        ends_at: endsAt,
        status: 'scheduled',
        session_type: 'tournament',
        notes: name.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAdding(false);
      setName('');
      setWhenIso('');
      qc.invalidateQueries({ queryKey: ['dojo-tournaments'] });
    },
  });

  return (
    <DojoPage>
      <DojoPageHeader
        eyebrow="The path"
        title="Tournaments"
        subtitle="Upcoming events, student registrations, and results history."
        action={
          <DojoButton onClick={() => setAdding((s) => !s)}>
            <Plus size={16} /> Add a tournament
          </DojoButton>
        }
      />

      {adding && (
        <DojoCard className="mb-6">
          <DojoSectionHeader icon={<Plus size={14} />} title="New tournament" />
          <div className="p-4 space-y-3">
            <div>
              <label
                className="block text-xs uppercase tracking-wider font-semibold mb-1"
                style={{ color: DOJO_COLORS.textSecondary }}
              >
                Tournament name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Regional Open — Spring Cup"
                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                style={{
                  background: DOJO_COLORS.bgInset,
                  color: DOJO_COLORS.textPrimary,
                  border: `1px solid ${DOJO_COLORS.divider}`,
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs uppercase tracking-wider font-semibold mb-1"
                style={{ color: DOJO_COLORS.textSecondary }}
              >
                When
              </label>
              <input
                type="datetime-local"
                value={whenIso}
                onChange={(e) => setWhenIso(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                style={{
                  background: DOJO_COLORS.bgInset,
                  color: DOJO_COLORS.textPrimary,
                  border: `1px solid ${DOJO_COLORS.divider}`,
                }}
              />
            </div>
            {create.error && (
              <p className="text-xs" style={{ color: DOJO_COLORS.danger }}>
                {(create.error as Error).message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <DojoButton variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </DojoButton>
              <DojoButton
                onClick={() => create.mutate()}
                disabled={create.isPending}
              >
                {create.isPending ? 'Saving…' : 'Save tournament'}
              </DojoButton>
            </div>
          </div>
        </DojoCard>
      )}

      <DojoCard accent="brand" className="mb-6">
        <DojoSectionHeader
          icon={<Trophy size={14} />}
          title="Upcoming"
          hint={`${upcoming.length} on the calendar`}
        />
        {upcoming.length === 0 ? (
          <p
            className="px-4 py-8 text-sm text-center"
            style={{ color: DOJO_COLORS.textMuted }}
          >
            No tournaments scheduled. Add the next one to start tracking
            registrations.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: DOJO_COLORS.divider }}>
            {upcoming.map((t) => (
              <TournamentRow key={t.id} t={t} />
            ))}
          </ul>
        )}
      </DojoCard>

      {past.length > 0 && (
        <DojoCard>
          <DojoSectionHeader
            icon={<Calendar size={14} />}
            title="Past tournaments"
            hint={`${past.length} previous events`}
          />
          <ul className="divide-y" style={{ borderColor: DOJO_COLORS.divider }}>
            {past.map((t) => (
              <TournamentRow key={t.id} t={t} muted />
            ))}
          </ul>
        </DojoCard>
      )}
    </DojoPage>
  );
}

function TournamentRow({ t, muted = false }: { t: Session; muted?: boolean }) {
  const name = t.notes || 'Tournament';
  return (
    <li
      className="px-4 py-3 flex items-center gap-3"
      style={{ opacity: muted ? 0.7 : 1 }}
    >
      <div
        className="w-10 h-10 rounded flex items-center justify-center shrink-0"
        style={{
          background: DOJO_COLORS.bgInset,
          color: DOJO_COLORS.gold,
          border: `1px solid ${DOJO_COLORS.divider}`,
        }}
      >
        <Trophy size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold truncate"
          style={{ color: DOJO_COLORS.textPrimary }}
        >
          {name}
        </p>
        <p className="text-xs" style={{ color: DOJO_COLORS.textSecondary }}>
          {new Date(t.starts_at).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
    </li>
  );
}
