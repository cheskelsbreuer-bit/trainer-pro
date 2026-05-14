// Live coaching sessions — what a PN-trained coach actually does
// every week (weekly 30-min check-in calls, plus initial consults).
//
// Reuses the existing `sessions` table from the solo-trainer side so
// we don't fragment the data model. New for the nutrition app:
//   - Today's sessions surfaced at the top
//   - Type filter: video / in-person / phone
//   - Each session has a join link (video URL) or address (in-person)
//   - Coach can take pre/post-session notes per row
//   - Status flips scheduled → completed when the coach marks it done

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus,
  Video,
  MapPin,
  Phone,
  Calendar,
  X,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Session } from '../../lib/database.types';
import { N, SERIF_FONT } from '../theme';

type SessionWithClient = Session & { clients: { full_name: string } | null };

type SessionKind = 'video' | 'in_person' | 'phone';

const KIND_OPTIONS: { id: SessionKind; label: string; icon: React.ReactNode }[] = [
  { id: 'video', label: 'Video call', icon: <Video size={13} /> },
  { id: 'in_person', label: 'In person', icon: <MapPin size={13} /> },
  { id: 'phone', label: 'Phone', icon: <Phone size={13} /> },
];

export function SessionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'today' | 'upcoming' | 'past'>('upcoming');
  const [adding, setAdding] = useState(false);

  const { data: sessions } = useQuery({
    queryKey: ['nutrition-sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, clients(full_name)')
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SessionWithClient[];
    },
  });

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

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86400000);
    return (sessions ?? []).filter((s) => {
      const t = new Date(s.starts_at).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
  }, [sessions]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (sessions ?? []).filter(
      (s) => new Date(s.starts_at).getTime() >= now,
    );
  }, [sessions]);

  const past = useMemo(() => {
    const now = Date.now();
    return (sessions ?? [])
      .filter((s) => new Date(s.starts_at).getTime() < now)
      .reverse();
  }, [sessions]);

  const list = tab === 'today' ? today : tab === 'upcoming' ? upcoming : past;

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
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
            Sessions
          </h1>
          <p className="mt-1 text-sm" style={{ color: N.mute }}>
            Live coaching — video calls, in-person consults, weekly check-in calls.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-95 transition-opacity"
          style={{ background: N.coral, color: '#FFF' }}
        >
          <Plus size={15} /> Book session
        </button>
      </section>

      {/* Tab strip */}
      <div className="flex items-center gap-1 mb-5 border-b" style={{ borderColor: N.rule }}>
        {(['today', 'upcoming', 'past'] as const).map((t) => {
          const active = tab === t;
          const count = t === 'today' ? today.length : t === 'upcoming' ? upcoming.length : past.length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-2 text-sm font-medium capitalize transition-colors"
              style={{
                color: active ? N.coral : N.mute,
                borderBottom: active ? `2px solid ${N.coral}` : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t} <span style={{ color: N.muteFaint, marginLeft: 4 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Today's banner — only on Today tab */}
      {tab === 'today' && today.length === 0 && (
        <div
          className="rounded-xl p-6 text-center mb-4"
          style={{ background: N.card, border: `1px solid ${N.rule}` }}
        >
          <Calendar size={20} className="mx-auto mb-2" style={{ color: N.mute }} />
          <p className="text-sm" style={{ color: N.mute }}>
            No sessions today. Enjoy a quiet day.
          </p>
        </div>
      )}

      {/* Session list */}
      {list.length === 0 && tab !== 'today' ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: N.card, border: `2px dashed ${N.rule}` }}
        >
          <div
            className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3"
            style={{ background: N.coralSoft, color: N.coral }}
          >
            <Calendar size={22} />
          </div>
          <h3
            className="font-semibold mb-1"
            style={{
              fontFamily: SERIF_FONT,
              color: N.ink,
              fontSize: '1.125rem',
            }}
          >
            {tab === 'upcoming' ? 'No sessions on the calendar' : 'No past sessions yet'}
          </h3>
          {tab === 'upcoming' && (
            <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: N.mute }}>
              Book a session — a 30-min weekly check-in with a client, or an
              initial consult with a new one.
            </p>
          )}
          {tab === 'upcoming' && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg"
              style={{ background: N.coral, color: '#FFF' }}
            >
              <Plus size={14} /> Book your first session
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {list.map((s) => (
            <SessionRow key={s.id} session={s} qc={qc} />
          ))}
        </ul>
      )}

      {adding && (
        <BookSessionModal
          clients={clients ?? []}
          onClose={() => setAdding(false)}
          qc={qc}
        />
      )}
    </div>
  );
}

function SessionRow({
  session,
  qc,
}: {
  session: SessionWithClient;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const start = new Date(session.starts_at);
  const isPast = start.getTime() < Date.now();
  const kind: SessionKind =
    session.session_type === 'in_person'
      ? 'in_person'
      : session.session_type === 'phone'
        ? 'phone'
        : 'video';
  const kindMeta = KIND_OPTIONS.find((k) => k.id === kind) ?? KIND_OPTIONS[0];
  const isVideoLink =
    session.location && /^https?:\/\//.test(session.location);

  const markComplete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', session.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition-sessions'] }),
  });

  return (
    <li
      className="rounded-xl p-4 flex items-start gap-4"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
        opacity: session.status === 'cancelled' ? 0.5 : 1,
      }}
    >
      {/* Date tile */}
      <div
        className="shrink-0 rounded-lg w-14 h-14 flex flex-col items-center justify-center"
        style={{ background: N.inset }}
      >
        <span
          className="text-[10px] uppercase font-bold tracking-wide"
          style={{ color: N.coral }}
        >
          {start.toLocaleDateString(undefined, { month: 'short' })}
        </span>
        <span
          className="font-bold leading-none tabular-nums"
          style={{
            color: N.ink,
            fontSize: '1.375rem',
            fontFamily: SERIF_FONT,
          }}
        >
          {start.getDate()}
        </span>
      </div>

      {/* Middle column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Link
            to={`/clients/${session.client_id}`}
            className="font-semibold hover:underline"
            style={{ color: N.ink, fontSize: '0.9375rem' }}
          >
            {session.clients?.full_name ?? 'Unknown client'}
          </Link>
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: N.inset,
              color: N.mute,
            }}
          >
            {kindMeta.icon}
            {kindMeta.label}
          </span>
          {session.status === 'completed' && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: N.sageSoft, color: N.sageDeep }}
            >
              Completed
            </span>
          )}
          {session.status === 'no_show' && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: N.honeySoft, color: N.honey }}
            >
              No-show
            </span>
          )}
          {session.status === 'cancelled' && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: N.inset, color: N.mute }}
            >
              Cancelled
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: N.mute }}>
          {start.toLocaleString(undefined, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })}
          {session.ends_at && (
            <>
              {' – '}
              {new Date(session.ends_at).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </>
          )}
        </p>
        {session.location && (
          <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: N.inkSoft }}>
            {isVideoLink ? (
              <>
                <Video size={11} />
                <a
                  href={session.location}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline inline-flex items-center gap-1"
                  style={{ color: N.coral }}
                >
                  {extractDomain(session.location)} <ExternalLink size={10} />
                </a>
              </>
            ) : (
              <>
                <MapPin size={11} /> {session.location}
              </>
            )}
          </p>
        )}
        {session.notes && (
          <p className="text-xs mt-1.5 line-clamp-2" style={{ color: N.mute }}>
            {session.notes}
          </p>
        )}
      </div>

      {/* Right action */}
      {!isPast && session.status === 'scheduled' && (
        <button
          onClick={() => markComplete.mutate()}
          disabled={markComplete.isPending}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
          style={{
            background: 'transparent',
            color: N.sageDeep,
            border: `1px solid ${N.sage}55`,
          }}
          title="Mark this session as completed"
        >
          <Check size={12} /> Done
        </button>
      )}
      {isPast && session.status === 'scheduled' && (
        <button
          onClick={() => markComplete.mutate()}
          disabled={markComplete.isPending}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
          style={{
            background: N.coral,
            color: '#FFF',
          }}
        >
          <Check size={12} /> Mark complete
        </button>
      )}
    </li>
  );
}

function BookSessionModal({
  clients,
  onClose,
  qc,
}: {
  clients: Client[];
  onClose: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { user } = useAuth();
  const [clientId, setClientId] = useState('');
  const [whenIso, setWhenIso] = useState('');
  const [durationMin, setDurationMin] = useState('30');
  const [kind, setKind] = useState<SessionKind>('video');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const book = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!clientId) throw new Error('Pick a client');
      if (!whenIso) throw new Error('Pick a date and time');
      const startsAt = new Date(whenIso);
      const endsAt = new Date(
        startsAt.getTime() + (parseInt(durationMin, 10) || 30) * 60_000,
      );
      const { error } = await supabase.from('sessions').insert({
        trainer_id: user.id,
        client_id: clientId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'scheduled',
        session_type: kind,
        location: location.trim() || null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition-sessions'] });
      onClose();
    },
  });

  const placeholderForLocation =
    kind === 'video'
      ? 'Paste a Zoom / Google Meet link…'
      : kind === 'in_person'
        ? 'Address or studio name'
        : 'Phone number';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(20, 18, 14, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6"
        style={{ background: N.card, border: `1px solid ${N.rule}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            style={{
              fontFamily: SERIF_FONT,
              color: N.ink,
              fontSize: '1.5rem',
              fontWeight: 600,
            }}
          >
            Book a session
          </h3>
          <button onClick={onClose} style={{ color: N.mute }} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Client">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
              style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
            >
              <option value="">Pick a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="When">
              <input
                type="datetime-local"
                value={whenIso}
                onChange={(e) => setWhenIso(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
                style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
              />
            </Field>
            <Field label="Duration (min)">
              <input
                type="number"
                min="15"
                step="15"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
                style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
              />
            </Field>
          </div>

          <Field label="Format">
            <div className="grid grid-cols-3 gap-2">
              {KIND_OPTIONS.map((k) => {
                const active = kind === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKind(k.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-md font-medium transition-colors"
                    style={{
                      background: active ? N.coral : N.inset,
                      color: active ? '#FFF' : N.mute,
                      border: `1px solid ${active ? N.coral : N.rule}`,
                    }}
                  >
                    {k.icon} {k.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field
            label={
              kind === 'video'
                ? 'Video link (Zoom / Meet / etc.)'
                : kind === 'in_person'
                  ? 'Location'
                  : 'Phone number'
            }
          >
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={placeholderForLocation}
              className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
              style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
            />
          </Field>

          <Field label="Notes (optional, just for you)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Agenda, talking points, things to ask…"
              className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
              style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
            />
          </Field>

          {book.error && (
            <p className="text-xs" style={{ color: N.danger }}>
              {(book.error as Error).message}
            </p>
          )}

          <button
            onClick={() => book.mutate()}
            disabled={book.isPending || !clientId || !whenIso}
            className="w-full py-2.5 mt-2 rounded-md text-sm font-semibold disabled:opacity-50"
            style={{ background: N.coral, color: '#FFF' }}
          >
            {book.isPending ? 'Booking…' : 'Book session'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-xs font-medium mb-1"
        style={{ color: N.mute }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
