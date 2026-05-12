// Tournaments — upcoming events, results history. Backed by a real
// `dojo_tournaments` table (supabase/27_dojo_tournaments.sql) so the
// data model isn't piggybacking on the sessions FK chain.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Plus, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { DOJO_COLORS } from '../theme';
import {
  DojoPage,
  DojoPageHeader,
  DojoCard,
  DojoSectionHeader,
  DojoButton,
} from '../components/DojoUI';

interface DojoTournament {
  id: string;
  trainer_id: string;
  name: string;
  starts_at: string;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export function DojoTournaments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [whenIso, setWhenIso] = useState('');
  const [location, setLocation] = useState('');

  const { data: tournaments, error: loadError } = useQuery({
    queryKey: ['dojo-tournaments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dojo_tournaments')
        .select('*')
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DojoTournament[];
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
      const { error } = await supabase.from('dojo_tournaments').insert({
        trainer_id: user.id,
        name: name.trim(),
        starts_at: startsAt,
        location: location.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAdding(false);
      setName('');
      setWhenIso('');
      setLocation('');
      qc.invalidateQueries({ queryKey: ['dojo-tournaments'] });
    },
  });

  // If the dojo_tournaments table doesn't exist yet (migration 27 not run),
  // the load throws a "relation does not exist" error from PostgREST. Show
  // a friendly note instead of a generic crash banner.
  const tableMissing =
    loadError &&
    (loadError as Error).message?.toLowerCase().includes('dojo_tournaments');

  return (
    <DojoPage>
      <DojoPageHeader
        eyebrow="The path"
        title="Tournaments"
        subtitle="Upcoming events, locations, results history."
        action={
          !tableMissing && (
            <DojoButton onClick={() => setAdding((s) => !s)}>
              <Plus size={16} /> Add a tournament
            </DojoButton>
          )
        }
      />

      {tableMissing && (
        <DojoCard accent="brand" className="mb-6">
          <DojoSectionHeader
            icon={<Trophy size={14} />}
            title="One-time setup needed"
          />
          <div className="p-4 text-sm" style={{ color: DOJO_COLORS.textSecondary }}>
            The tournaments table isn't installed yet. In Supabase SQL Editor,
            run migration <code>27_dojo_tournaments.sql</code> (one-time, ~30
            seconds), then refresh this page.
          </div>
        </DojoCard>
      )}

      {adding && (
        <DojoCard className="mb-6">
          <DojoSectionHeader icon={<Plus size={14} />} title="New tournament" />
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
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
            <div>
              <label
                className="block text-xs uppercase tracking-wider font-semibold mb-1"
                style={{ color: DOJO_COLORS.textSecondary }}
              >
                Location (optional)
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, venue"
                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                style={{
                  background: DOJO_COLORS.bgInset,
                  color: DOJO_COLORS.textPrimary,
                  border: `1px solid ${DOJO_COLORS.divider}`,
                }}
              />
            </div>
            {create.error && (
              <p
                className="text-xs sm:col-span-2"
                style={{ color: DOJO_COLORS.danger }}
              >
                {(create.error as Error).message}
              </p>
            )}
            <div className="sm:col-span-2 flex justify-end gap-2">
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
          hint={tableMissing ? undefined : `${upcoming.length} on the calendar`}
        />
        {tableMissing ? null : upcoming.length === 0 ? (
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

function TournamentRow({ t, muted = false }: { t: DojoTournament; muted?: boolean }) {
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
          {t.name}
        </p>
        <p
          className="text-xs flex items-center gap-2"
          style={{ color: DOJO_COLORS.textSecondary }}
        >
          <span>
            {new Date(t.starts_at).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          {t.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {t.location}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}
