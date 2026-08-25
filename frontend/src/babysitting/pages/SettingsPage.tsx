// Settings — billing defaults, reminder message templates (with a live
// preview), the Customize Studio, Stripe status, and CSV exports. This
// page has its own Save buttons, so it works regardless of edit mode.

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Trainer } from '../../lib/database.types';
import { B } from '../theme';
import { useKids, usePayments } from '../lib/data';
import {
  useBabysittingConfig,
  appendLog,
  DEFAULT_SETTINGS,
  type BabysittingSettings,
} from '../lib/config';
import { fillTemplate } from '../lib/messages';
import { kidsCsv, paymentsCsv, downloadCsv } from '../lib/csv';
import { Card, SectionTitle, Btn, Field, inputStyle } from '../components/ui';
import { CustomizeStudio } from '../../components/CustomizeStudio';
import { HealthPanel } from '../components/HealthPanel';
import { ComfortPanels } from '../components/ComfortPanels';
import { StripeStatusCard } from '../../components/StripeStatusCard';

// The pretend family every template preview renders against.
const SAMPLE_FAMILY: { parentName: string; kidNames: string[]; balance: number } = {
  parentName: 'Malky',
  kidNames: ['Rivky', 'Moishy'],
  balance: 45,
};

const mutedLine: CSSProperties = {
  fontSize: '0.8rem',
  color: B.mute,
  margin: '0 0 14px',
};

export function SettingsPage() {
  const { user } = useAuth();
  const cfg = useBabysittingConfig();
  const { data: kids } = useKids();
  const { data: payments } = usePayments();

  const { data: trainer } = useQuery({
    queryKey: ['trainer', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as Trainer;
    },
    enabled: !!user,
  });

  // ── Local drafts, seeded once from the saved config ─────────────────
  const [weeklyRate, setWeeklyRate] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [sms, setSms] = useState(DEFAULT_SETTINGS.smsTemplate);
  const [emailSubject, setEmailSubject] = useState(DEFAULT_SETTINGS.emailSubject);
  const [emailBody, setEmailBody] = useState(DEFAULT_SETTINGS.emailTemplate);
  const [seeded, setSeeded] = useState(false);
  const [savedNote, setSavedNote] = useState('');

  useEffect(() => {
    if (!cfg.data || seeded) return;
    const s = cfg.data.settings;
    setWeeklyRate(s.defaultWeeklyRate ? String(s.defaultWeeklyRate) : '');
    setHourlyRate(s.defaultHourlyRate ? String(s.defaultHourlyRate) : '');
    setSms(s.smsTemplate);
    setEmailSubject(s.emailSubject);
    setEmailBody(s.emailTemplate);
    setSeeded(true);
  }, [cfg.data, seeded]);

  const canSave = !!cfg.data && !cfg.save.isPending;

  function flash(note: string) {
    setSavedNote(note);
    window.setTimeout(() => setSavedNote(''), 2500);
  }

  function saveRates() {
    if (!cfg.data) return;
    const next = {
      ...cfg.data,
      settings: {
        ...cfg.data.settings,
        defaultWeeklyRate: parseFloat(weeklyRate) || 0,
        defaultHourlyRate: parseFloat(hourlyRate) || 0,
      },
    };
    cfg.save.mutate(appendLog(next, 'settings', 'Updated billing defaults'));
    flash('rates');
  }

  function saveMessages() {
    if (!cfg.data) return;
    const next = {
      ...cfg.data,
      settings: {
        ...cfg.data.settings,
        smsTemplate: sms,
        emailSubject,
        emailTemplate: emailBody,
      },
    };
    cfg.save.mutate(appendLog(next, 'settings', 'Updated reminder messages'));
    flash('messages');
  }

  function resetMessages() {
    setSms(DEFAULT_SETTINGS.smsTemplate);
    setEmailSubject(DEFAULT_SETTINGS.emailSubject);
    setEmailBody(DEFAULT_SETTINGS.emailTemplate);
  }

  // Live preview uses the drafts, not the saved config.
  const previewSettings: BabysittingSettings = useMemo(
    () => ({
      ...(cfg.data?.settings ?? DEFAULT_SETTINGS),
      smsTemplate: sms,
      emailSubject,
      emailTemplate: emailBody,
    }),
    [cfg.data, sms, emailSubject, emailBody],
  );

  const kidCount = (kids ?? []).length;
  const paymentCount = (payments ?? []).length;
  const kidName = (id: string) => (kids ?? []).find((k) => k.id === id)?.full_name ?? '—';

  if (cfg.isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Loading your settings…</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 780 }}>
      {/* ── Billing defaults ─────────────────────────────────────────── */}
      <Card>
        <SectionTitle
          right={
            <Btn size="sm" onClick={saveRates} disabled={!canSave}>
              {cfg.save.isPending ? 'Saving…' : savedNote === 'rates' ? '✓ Saved' : 'Save'}
            </Btn>
          }
        >
          💛 Billing defaults
        </SectionTitle>
        <p style={mutedLine}>New kids start with these rates — you can always change them per kid.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 14px' }}>
          <Field label="Default weekly rate ($)" hint="Flat rate for a normal week.">
            <input
              style={inputStyle}
              type="number"
              min="0"
              value={weeklyRate}
              onChange={(e) => setWeeklyRate(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Default hourly rate ($)" hint="For billing by the hour.">
            <input
              style={inputStyle}
              type="number"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
      </Card>

      {/* ── Reminder messages ────────────────────────────────────────── */}
      <Card>
        <SectionTitle
          right={
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn size="sm" kind="ghost" onClick={resetMessages} disabled={cfg.save.isPending}>
                Reset to default
              </Btn>
              <Btn size="sm" onClick={saveMessages} disabled={!canSave}>
                {cfg.save.isPending ? 'Saving…' : savedNote === 'messages' ? '✓ Saved' : 'Save'}
              </Btn>
            </div>
          }
        >
          💬 Reminder messages
        </SectionTitle>
        <p style={mutedLine}>
          These fill in automatically when you text or email a balance. You can use{' '}
          <code style={{ fontSize: '0.78rem' }}>{'{parent}'}</code>,{' '}
          <code style={{ fontSize: '0.78rem' }}>{'{kids}'}</code> and{' '}
          <code style={{ fontSize: '0.78rem' }}>{'{currency}{balance}'}</code> — they become the real
          names and amount for each family.
        </p>
        <Field label="Text message">
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
            value={sms}
            onChange={(e) => setSms(e.target.value)}
          />
        </Field>
        <Field label="Email subject">
          <input style={inputStyle} value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
        </Field>
        <Field label="Email message">
          <textarea
            style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
          />
        </Field>

        {/* Live preview against a sample family */}
        <Card
          pad={16}
          style={{ background: B.rowAlt, boxShadow: 'none', borderRadius: B.radius, marginTop: 4 }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              color: B.mute,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            Preview · Malky, mom of Rivky &amp; Moishy, owes $45
          </div>
          <div style={{ display: 'grid', gap: 10, fontSize: '0.85rem', color: B.ink }}>
            <div>
              <span style={{ fontWeight: 800, color: B.accentDeep }}>📱 Text: </span>
              {fillTemplate(sms, SAMPLE_FAMILY, previewSettings)}
            </div>
            <div>
              <span style={{ fontWeight: 800, color: B.accentDeep }}>✉️ Email: </span>
              <span style={{ fontWeight: 700 }}>{emailSubject}</span>
              <div style={{ whiteSpace: 'pre-wrap', color: B.inkSoft, marginTop: 4 }}>
                {fillTemplate(emailBody, SAMPLE_FAMILY, previewSettings)}
              </div>
            </div>
          </div>
        </Card>
      </Card>

      {/* ── Customize studio ─────────────────────────────────────────── */}
      <Card>
        <SectionTitle>🎨 Customize your app</SectionTitle>
        <p style={mutedLine}>Turn features on or off, pick your colors and fonts, and reorder the menu.</p>
        <CustomizeStudio
          templateSlugs={trainer?.template_slugs?.length ? trainer.template_slugs : ['babysitting']}
          accent={trainer?.primary_color || '#d96f4e'}
          navItems={[
            { to: '/', label: 'Home' },
            { to: '/kids', label: 'Kids' },
            { to: '/families', label: 'Families' },
            { to: '/billing', label: 'Billing' },
            { to: '/reports', label: 'Reports' },
            { to: '/away', label: 'Away' },
            { to: '/former', label: 'Former' },
            { to: '/log', label: 'Log' },
            { to: '/settings', label: 'Settings' },
          ]}
        />
      </Card>

      {/* ── Online payments ──────────────────────────────────────────── */}
      <Card>
        <SectionTitle>💳 Online payments</SectionTitle>
        <p style={mutedLine}>
          Connect Stripe if you'd like parents to pay you online. A parent portal with bank-transfer
          (ACH) payments arrives in a later step — connecting now means you'll be ready.
        </p>
        <StripeStatusCard />
      </Card>

      {/* ── Her comforts ─────────────────────────────────────────────── */}
      <ComfortPanels />

      {/* ── Health check ─────────────────────────────────────────────── */}
      <HealthPanel />

      {/* ── Your data ────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle>🗂 Your data</SectionTitle>
        <p style={mutedLine}>
          Everything lives in your own database — nothing is locked in. Download a copy any time.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn
            kind="soft"
            disabled={!kidCount}
            onClick={() => downloadCsv('kids.csv', kidsCsv(kids ?? []))}
          >
            ⬇ Kids &amp; families ({kidCount} {kidCount === 1 ? 'kid' : 'kids'})
          </Btn>
          <Btn
            kind="soft"
            disabled={!paymentCount}
            onClick={() => downloadCsv('payments.csv', paymentsCsv(payments ?? [], kidName))}
          >
            ⬇ Payment history ({paymentCount} {paymentCount === 1 ? 'payment' : 'payments'})
          </Btn>
        </div>
      </Card>
    </div>
  );
}
