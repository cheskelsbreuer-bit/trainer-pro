// ── UnifiedHome — the combined app's home screen ────────────────────
//
// The first thing a multi-discipline coach sees in their all-in-one app.
// A clean, modern welcome with their disciplines, a real client count,
// and big quick-action cards. Fully themed by --tp-* so it wears the
// coach's chosen colors + fonts.

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Wallet, CalendarClock, SlidersHorizontal, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Trainer } from '../lib/database.types';
import { pickTemplateUx } from '../lib/templateUx';
import { workspacesFor } from '../lib/workspaces';

export function UnifiedHome({
  trainer,
  preview = false,
}: {
  trainer: Trainer | undefined;
  preview?: boolean;
}) {
  const { user } = useAuth();
  const slugs = trainer?.template_slugs ?? [];
  const ux = pickTemplateUx(slugs);
  const disciplines = workspacesFor(slugs);
  const people = ux.clientNounPlural;

  const { data: clientCount } = useQuery({
    queryKey: ['unified-client-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', user!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && !preview,
  });
  const count = preview ? 128 : clientCount;

  const firstName = (trainer?.full_name?.trim().split(/\s+/)[0]) || 'there';
  const businessName = trainer?.business_name?.trim() || trainer?.full_name?.trim() || 'your business';

  return (
    <div style={{ padding: '36px 32px', maxWidth: 1120, margin: '0 auto' }}>
      {/* Greeting */}
      <p
        style={{
          fontSize: '0.74rem',
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--tp-primary, #4f46e5)',
          margin: 0,
        }}
      >
        Your workspace
      </p>
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          margin: '6px 0 4px',
          lineHeight: 1.1,
          fontFamily: 'var(--tp-font-display, inherit)',
        }}
      >
        Good to see you, {firstName}.
      </h1>
      <p style={{ color: 'var(--tp-ink-soft, #64748b)', margin: 0, fontSize: '0.96rem' }}>
        {businessName} — everything you run, in one place.
      </p>

      {/* Disciplines */}
      {disciplines.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
          {disciplines.map((d) => (
            <div
              key={d.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--tp-surface, #fff)',
                border: '1px solid var(--tp-rule, #e8ecf3)',
                borderRadius: 'var(--tp-radius, 14px)',
                padding: '12px 16px',
                minWidth: 180,
              }}
            >
              <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{d.emoji}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{d.label}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--tp-ink-soft, #94a3b8)' }}>
                  Active
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick action cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
          marginTop: 26,
        }}
      >
        <ActionCard
          to="/clients"
          icon={<Users size={20} />}
          title={capitalize(people)}
          value={count === undefined ? '—' : String(count)}
          subtitle={`Manage your ${people}`}
        />
        <ActionCard
          to="/payments"
          icon={<Wallet size={20} />}
          title="Payments"
          subtitle="Record a payment, see who owes"
        />
        <ActionCard
          to="/sessions"
          icon={<CalendarClock size={20} />}
          title="Schedule"
          subtitle="Sessions, classes & bookings"
        />
        <ActionCard
          to="/settings"
          icon={<SlidersHorizontal size={20} />}
          title="Customize your app"
          subtitle="Features, colors, fonts & layout"
        />
      </div>

      {/* Customize banner */}
      <Link
        to="/settings"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginTop: 22,
          textDecoration: 'none',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--tp-primary, #4f46e5) 12%, var(--tp-surface, #fff)), var(--tp-surface, #fff))',
          border: '1px solid color-mix(in srgb, var(--tp-primary, #4f46e5) 30%, transparent)',
          borderRadius: 'var(--tp-radius, 16px)',
          padding: '18px 20px',
          color: 'var(--tp-ink, #0f172a)',
        }}
      >
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--tp-primary, #4f46e5)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={22} />
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--tp-font-display, inherit)' }}>
            Make this app yours
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '0.86rem', color: 'var(--tp-ink-soft, #64748b)' }}>
            Turn features on or off, pick your colors and fonts, and arrange your menu — across every discipline you run.
          </p>
        </div>
        <ArrowRight size={20} style={{ color: 'var(--tp-primary, #4f46e5)', flexShrink: 0 }} />
      </Link>
    </div>
  );
}

function ActionCard({
  to,
  icon,
  title,
  value,
  subtitle,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  value?: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        textDecoration: 'none',
        background: 'var(--tp-surface, #fff)',
        border: '1px solid var(--tp-rule, #e8ecf3)',
        borderRadius: 'var(--tp-radius, 16px)',
        padding: '18px 18px 16px',
        color: 'var(--tp-ink, #0f172a)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          width: 40,
          height: 40,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          background: 'color-mix(in srgb, var(--tp-primary, #4f46e5) 12%, transparent)',
          color: 'var(--tp-primary, #4f46e5)',
        }}
      >
        {icon}
      </span>
      {value !== undefined && (
        <p
          style={{
            margin: '12px 0 0',
            fontSize: '1.9rem',
            fontWeight: 800,
            lineHeight: 1,
            fontFamily: 'var(--tp-font-display, inherit)',
          }}
        >
          {value}
        </p>
      )}
      <p style={{ margin: value !== undefined ? '6px 0 0' : '12px 0 0', fontWeight: 700, fontSize: '0.96rem' }}>
        {title}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--tp-ink-soft, #94a3b8)' }}>
        {subtitle}
      </p>
    </Link>
  );
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
