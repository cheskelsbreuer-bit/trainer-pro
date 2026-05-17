// Studio settings — name, tagline, booking lead times, currency,
// default duration. Below: the standard Trainer Pro panels (Stripe,
// booking, calendar sync, public page, directory, feedback).

import { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';
import { useStudioConfig, DEFAULT_SETTINGS, type StudioSettings } from '../lib/studioConfig';
import { StripeStatusCard } from '../../components/StripeStatusCard';
import { GoogleCalendarCard } from '../../components/GoogleCalendarCard';
import { BookingSettingsCard } from '../../components/BookingSettingsCard';
import { PublicProfileSettingsCard } from '../../components/PublicProfileSettingsCard';
import { DirectorySettingsCard } from '../../components/DirectorySettingsCard';
import { FeedbackCard } from '../../components/FeedbackCard';
import { S, HEADING_FONT } from '../theme';

export function SettingsPage({ trainer }: { trainer: Trainer | undefined }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: cfg, save } = useStudioConfig();
  const [draft, setDraft] = useState<StudioSettings>(cfg?.settings ?? DEFAULT_SETTINGS);

  useEffect(() => {
    if (cfg?.settings) setDraft(cfg.settings);
  }, [cfg?.settings]);

  function saveStudio() {
    if (!cfg) return;
    save.mutate({ ...cfg, settings: draft });
  }

  const saveProfile = useMutation({
    mutationFn: async (patch: Partial<Trainer>) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('trainers').update(patch).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer'] }),
  });

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <p style={lbl}>Configure</p>
        <h1 style={h1}>Settings</h1>
      </div>

      <Card title="🏢 Studio identity">
        <div style={fieldGrid}>
          <Field label="Studio name (shown on public page + header)">
            <input
              value={trainer?.business_name ?? ''}
              onChange={(e) => saveProfile.mutate({ business_name: e.target.value })}
              placeholder="e.g. Flow Studio"
              style={inp}
            />
          </Field>
          <Field label="Tagline (for the public page)">
            <input
              value={draft.studioTagline}
              onChange={(e) => setDraft({ ...draft, studioTagline: e.target.value })}
              onBlur={saveStudio}
              placeholder="Group classes for every body."
              style={inp}
            />
          </Field>
        </div>
      </Card>

      <Card title="💰 Booking & money">
        <div style={fieldGrid}>
          <Field label="Default class duration (min)">
            <input
              type="number"
              min="15"
              step="5"
              value={draft.defaultClassDurationMin}
              onChange={(e) => setDraft({ ...draft, defaultClassDurationMin: parseInt(e.target.value) || 60 })}
              onBlur={saveStudio}
              style={inp}
            />
          </Field>
          <Field label="Currency symbol">
            <select
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
              onBlur={saveStudio}
              style={inp}
            >
              <option value="$">$ — Dollar</option>
              <option value="€">€ — Euro</option>
              <option value="£">£ — Pound</option>
              <option value="₪">₪ — Shekel</option>
              <option value="C$">C$ — Canadian</option>
              <option value="A$">A$ — Australian</option>
            </select>
          </Field>
          <Field label="Booking lead time (minutes before class)">
            <input
              type="number"
              min="0"
              value={draft.bookingLeadMin}
              onChange={(e) => setDraft({ ...draft, bookingLeadMin: parseInt(e.target.value) || 0 })}
              onBlur={saveStudio}
              style={inp}
            />
          </Field>
          <Field label="Cancel-without-forfeit cutoff (minutes before)">
            <input
              type="number"
              min="0"
              value={draft.cancellationCutoffMin}
              onChange={(e) => setDraft({ ...draft, cancellationCutoffMin: parseInt(e.target.value) || 0 })}
              onBlur={saveStudio}
              style={inp}
            />
          </Field>
        </div>
        {save.isSuccess && (
          <p style={{ color: S.ok, fontSize: '0.82rem', margin: '10px 0 0' }}>Saved.</p>
        )}
      </Card>

      <h2
        style={{
          fontSize: '0.9rem',
          fontWeight: 800,
          color: S.ink,
          margin: '32px 0 14px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
      >
        Trainer Pro standard
      </h2>

      <Card title="💳 Online payments (Stripe)">
        <StripeStatusCard />
      </Card>
      {trainer && (
        <>
          <Card title="📅 Booking settings">
            <BookingSettingsCard trainer={trainer} />
          </Card>
          <Card title="🗓 Calendar sync">
            <GoogleCalendarCard trainer={trainer} />
          </Card>
          <Card title="🌐 Public studio page">
            <PublicProfileSettingsCard trainer={trainer} />
          </Card>
          <Card title="📒 Find-a-studio directory">
            <DirectorySettingsCard trainer={trainer} />
          </Card>
        </>
      )}
      <Card title="📨 Help & feedback">
        <FeedbackCard />
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: S.card,
        borderRadius: 12,
        border: `1px solid ${S.rule}`,
        padding: '18px 20px',
        marginBottom: 12,
      }}
    >
      <h3 style={{ margin: '0 0 14px', fontSize: '0.92rem', fontWeight: 700, color: S.ink }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: S.inkSoft, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const lbl: React.CSSProperties = { fontSize: '0.72rem', color: S.mute, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, margin: 0 };
const h1: React.CSSProperties = { fontSize: '1.6rem', fontWeight: 800, color: S.ink, margin: '4px 0 0', lineHeight: 1.1 };
const fieldGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 };
const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', border: `1px solid ${S.rule}`, borderRadius: 8, fontSize: '0.9rem', fontFamily: HEADING_FONT, outline: 'none', background: '#fff' };
