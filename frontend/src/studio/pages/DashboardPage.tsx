// Studio dashboard — today's classes, capacity counts, week-to-date
// revenue, and quick-jump tiles.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Sparkles, DollarSign } from 'lucide-react';
import { useStudioConfig, classInstancesForDate } from '../lib/studioConfig';
import { S, fmtTime } from '../theme';

export function DashboardPage() {
  const { data: cfg, isLoading } = useStudioConfig();
  const today = useMemo(() => new Date(), []);

  if (isLoading || !cfg) return <p style={{ color: S.mute }}>Loading…</p>;

  const todayClasses = classInstancesForDate(cfg, today);
  const todayBooked = todayClasses.reduce((sum, c) => sum + c.booked.length, 0);
  const todayCapacity = todayClasses.reduce((sum, c) => sum + c.sc.capacity, 0);
  const activePasses = cfg.passes.filter(
    (p) => !p.expiresOn || p.expiresOn >= new Date().toISOString().slice(0, 10),
  ).length;

  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '0.72rem', color: S.mute, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, margin: 0 }}>
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: S.ink, margin: '4px 0 0', lineHeight: 1.1 }}>
          Studio today
        </h1>
      </header>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <Tile icon={<Calendar size={16} />} value={String(todayClasses.length)} label="Classes today" tone="primary" />
        <Tile
          icon={<Users size={16} />}
          value={`${todayBooked} / ${todayCapacity || '—'}`}
          label="Booked / capacity"
          tone="accent"
        />
        <Tile icon={<Sparkles size={16} />} value={String(cfg.classTypes.length)} label="Class types" tone="primary" />
        <Tile icon={<DollarSign size={16} />} value={String(activePasses)} label="Active passes" tone="accent" />
      </div>

      {/* Today's classes */}
      <section
        style={{
          background: S.card,
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${S.rule}`,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: S.ink, margin: 0 }}>Today's schedule</h2>
          <Link to="/schedule" style={{ color: S.primary, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
            See full week →
          </Link>
        </div>
        {todayClasses.length === 0 ? (
          <p style={{ color: S.mute, fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
            No classes scheduled for today.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {todayClasses.map(({ sc, booked }) => {
              const type = cfg.classTypes.find((t) => t.id === sc.classTypeId);
              const inst = cfg.instructors.find((i) => i.id === sc.instructorId);
              const fillPct = sc.capacity > 0 ? Math.round((booked.length / sc.capacity) * 100) : 0;
              return (
                <li
                  key={sc.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 200px',
                    gap: 16,
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: `1px solid ${S.ruleSoft}`,
                  }}
                >
                  <span style={{ fontWeight: 700, color: S.ink, fontSize: '0.95rem' }}>{fmtTime(sc.startTime)}</span>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 9px',
                        borderRadius: 12,
                        background: (type?.color || S.primary) + '22',
                        color: type?.color || S.primary,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        marginBottom: 3,
                      }}
                    >
                      {type?.name || 'Class'}
                    </span>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: S.mute }}>
                      {inst ? `with ${inst.name}` : 'No instructor assigned'} · {sc.room || 'Main room'}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: S.ink }}>
                      {booked.length} / {sc.capacity}
                    </p>
                    <div style={{ background: S.ruleSoft, borderRadius: 4, height: 6, marginTop: 4 }}>
                      <div
                        style={{
                          background: fillPct >= 100 ? S.danger : fillPct >= 80 ? S.warn : S.ok,
                          height: '100%',
                          width: `${Math.min(100, fillPct)}%`,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Quick jumps if not set up yet */}
      {cfg.classTypes.length === 0 && (
        <section
          style={{
            background: S.primarySoft,
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${S.primary}22`,
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: S.primaryDeep, margin: '0 0 6px' }}>
            👋 Set up your studio in 3 steps
          </h3>
          <p style={{ color: S.mute, fontSize: '0.88rem', margin: '0 0 14px' }}>
            Add your class types, your instructors, and your weekly schedule. Members and bookings come next.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <QuickLink to="/classes" label="1 · Add class types" />
            <QuickLink to="/instructors" label="2 · Add instructors" />
            <QuickLink to="/schedule" label="3 · Build the schedule" />
          </div>
        </section>
      )}
    </div>
  );
}

function Tile({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: 'primary' | 'accent';
}) {
  const color = tone === 'primary' ? S.primary : S.accent;
  return (
    <div
      style={{
        background: S.card,
        borderRadius: 12,
        padding: '14px 18px',
        border: `1px solid ${S.rule}`,
      }}
    >
      <div style={{ color, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, marginBottom: 6 }}>
        {icon}
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      </div>
      <p style={{ fontSize: '1.6rem', fontWeight: 800, color: S.ink, margin: 0, lineHeight: 1.1 }}>{value}</p>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      style={{
        background: '#fff',
        color: S.primary,
        border: `1px solid ${S.primary}33`,
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: '0.85rem',
        fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  );
}
