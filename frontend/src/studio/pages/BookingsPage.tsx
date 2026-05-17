// Bookings — the upcoming reservation list. Mom (or the studio
// manager) uses this to see today and tomorrow's roster per class,
// mark attendance / no-shows, and field cancellations.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import { useStudioConfig, type Booking, isoDate, classInstancesForDate } from '../lib/studioConfig';
import { S, fmtTime, shortDate, HEADING_FONT } from '../theme';

const DAYS_AHEAD = 7;

export function BookingsPage() {
  const { user } = useAuth();
  const { data: cfg, save } = useStudioConfig();
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'all'>('upcoming');

  const { data: clients = [] } = useQuery({
    queryKey: ['studio-clients', user?.id],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', user!.id);
      if (error) throw error;
      return (data ?? []) as Client[];
    },
    enabled: !!user,
  });

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  // Build the list of (date, scheduledClass, bookings) for upcoming days
  const groups = useMemo(() => {
    if (!cfg) return [];
    const out: { dateLabel: string; iso: string; classes: ReturnType<typeof classInstancesForDate> }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = filter === 'today' ? 1 : DAYS_AHEAD;
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = isoDate(d);
      const dateLabel =
        i === 0
          ? 'Today'
          : i === 1
            ? 'Tomorrow'
            : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const classes = classInstancesForDate(cfg, d);
      if (filter === 'all' || classes.some((c) => c.booked.length > 0)) {
        out.push({ dateLabel, iso, classes });
      }
    }
    return out;
  }, [cfg, filter]);

  function setStatus(b: Booking, status: Booking['status']) {
    if (!cfg) return;
    save.mutate({
      ...cfg,
      bookings: cfg.bookings.map((x) => (x.id === b.id ? { ...x, status } : x)),
    });
  }

  if (!cfg) return <p style={{ color: S.mute }}>Loading…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={lbl}>Reservations</p>
          <h1 style={h1}>Bookings</h1>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['today', 'upcoming', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? S.primary : '#fff',
                color: filter === f ? '#fff' : S.mute,
                border: `1px solid ${filter === f ? S.primary : S.rule}`,
                padding: '6px 14px',
                borderRadius: 16,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontFamily: HEADING_FONT,
              }}
            >
              {f === 'upcoming' ? `Next ${DAYS_AHEAD} days` : f}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div style={emptyCard}>
          <p style={{ color: S.mute, margin: 0 }}>
            No bookings to show. Members can book classes from your public page once you publish a schedule.
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.iso} style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: S.ink, margin: '0 0 8px' }}>
              {g.dateLabel}{' '}
              <span style={{ color: S.muteFaint, fontWeight: 500 }}>{shortDate(g.iso)}</span>
            </h3>
            {g.classes.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: S.muteFaint, margin: 0 }}>No classes scheduled.</p>
            ) : (
              g.classes.map(({ sc, booked }) => {
                const type = cfg.classTypes.find((t) => t.id === sc.classTypeId);
                const inst = cfg.instructors.find((i) => i.id === sc.instructorId);
                return (
                  <div
                    key={sc.id}
                    style={{
                      background: S.card,
                      borderRadius: 12,
                      padding: 18,
                      border: `1px solid ${S.rule}`,
                      borderLeft: `4px solid ${type?.color ?? S.primary}`,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: S.ink, fontSize: '0.95rem' }}>
                          {fmtTime(sc.startTime)} — {type?.name ?? 'Class'}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: S.mute }}>
                          {inst ? `with ${inst.name}` : 'Unassigned'} · {sc.room ?? 'Main room'}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: S.mute }}>
                        {booked.length} / {sc.capacity}
                      </span>
                    </div>
                    {booked.length === 0 ? (
                      <p style={{ margin: 0, color: S.muteFaint, fontSize: '0.83rem' }}>No bookings yet.</p>
                    ) : (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {booked.map((b) => {
                          const m = clientById.get(b.clientId);
                          return (
                            <li
                              key={b.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '7px 0',
                                borderTop: `1px solid ${S.ruleSoft}`,
                                fontSize: '0.86rem',
                              }}
                            >
                              <span style={{ fontWeight: 600, color: S.ink }}>{m?.full_name ?? 'Unknown'}</span>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <StatusPill status={b.status} />
                                {b.status !== 'attended' && (
                                  <button onClick={() => setStatus(b, 'attended')} style={tinyBtn(S.ok)}>
                                    ✓ Attended
                                  </button>
                                )}
                                {b.status !== 'no-show' && (
                                  <button onClick={() => setStatus(b, 'no-show')} style={tinyBtn(S.danger)}>
                                    ✗ No-show
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })
            )}
          </section>
        ))
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Booking['status'] }) {
  const map: Record<Booking['status'], { bg: string; fg: string }> = {
    reserved: { bg: S.primarySoft, fg: S.primary },
    attended: { bg: S.okSoft, fg: S.ok },
    'no-show': { bg: S.dangerSoft, fg: S.danger },
    canceled: { bg: S.ruleSoft, fg: S.mute },
    waitlist: { bg: S.warnSoft, fg: S.warn },
  };
  const c = map[status];
  return (
    <span style={{ background: c.bg, color: c.fg, padding: '2px 9px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

const lbl: React.CSSProperties = { fontSize: '0.72rem', color: S.mute, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, margin: 0 };
const h1: React.CSSProperties = { fontSize: '1.6rem', fontWeight: 800, color: S.ink, margin: '4px 0 0', lineHeight: 1.1 };
const emptyCard: React.CSSProperties = { background: S.card, border: `1px dashed ${S.rule}`, borderRadius: 12, padding: 28, textAlign: 'center' };
function tinyBtn(color: string): React.CSSProperties {
  return { background: 'transparent', color, border: `1px solid ${color}66`, padding: '3px 9px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', fontFamily: HEADING_FONT };
}
