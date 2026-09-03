// Settings — every section is a closed drawer; tap the one you want and
// it unfolds. Billing (how you bill + automatic weekly billing) lives
// here now, followed by reminder messages, customization, Stripe, her
// comforts, the health check, and CSV exports. Sections have their own
// Save buttons, so the page works regardless of edit mode.

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
import { kidsCsv, paymentsCsv, yearCsv, downloadCsv } from '../lib/csv';
import { Card, SectionTitle, Btn, Field, inputStyle, Collapse, Chip } from '../components/ui';
import { CustomizeStudio } from '../../components/CustomizeStudio';
import { HealthPanel } from '../components/HealthPanel';
import { ComfortPanels } from '../components/ComfortPanels';
import { StripeStatusCard } from '../../components/StripeStatusCard';
import { AutoBillingCard } from '../components/AutoBillingCard';

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

  function saveMode(mode: 'weekly' | 'hourly') {
    if (!cfg.data) return;
    const next = {
      ...cfg.data,
      settings: { ...cfg.data.settings, billingMode: mode },
    };
    cfg.save.mutate(
      appendLog(next, 'settings', `Billing switched to ${mode === 'weekly' ? 'by the week' : 'by the hour'}`),
    );
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

  /** One switch, saved straight away — no Save button for a toggle. */
  function setArrivals(patch: Partial<BabysittingSettings['arrivals']>, note: string) {
    if (!cfg.data) return;
    cfg.save.mutate(
      appendLog(
        {
          ...cfg.data,
          settings: {
            ...cfg.data.settings,
            arrivals: { ...cfg.data.settings.arrivals, ...patch },
          },
        },
        'settings',
        note,
      ),
    );
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

  const mode = cfg.data?.settings.billingMode ?? 'weekly';
  const autoBillingOn = cfg.data?.settings.autoBilling.enabled ?? false;

  const modePill = (m: 'weekly' | 'hourly', label: string) => (
    <button
      type="button"
      onClick={() => saveMode(m)}
      disabled={!canSave}
      style={{
        border: 'none',
        cursor: canSave ? 'pointer' : 'not-allowed',
        borderRadius: 999,
        padding: '9px 18px',
        fontSize: '0.84rem',
        fontWeight: 800,
        fontFamily: B.fontDisplay,
        background: mode === m ? B.accent : '#f2ede4',
        color: mode === m ? '#fff' : B.inkSoft,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 780 }}>
      {/* ── Billing ──────────────────────────────────────────────────── */}
      <Collapse
        title="💛 Billing"
        badge={
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <Chip tone="accent">{mode === 'weekly' ? 'by the week' : 'by the hour'}</Chip>
            <Chip tone={autoBillingOn ? 'green' : 'neutral'}>{autoBillingOn ? 'auto ✓' : 'auto off'}</Chip>
          </span>
        }
      >
        <Card>
          <SectionTitle
            right={
              <Btn size="sm" onClick={saveRates} disabled={!canSave}>
                {cfg.save.isPending ? 'Saving…' : savedNote === 'rates' ? '✓ Saved' : 'Save'}
              </Btn>
            }
          >
            How you bill
          </SectionTitle>
          <p style={mutedLine}>
            Your usual way of charging. It picks what comes up first when you bill someone — you can
            always do the other one for a single bill.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {modePill('weekly', '📅 By the week')}
            {modePill('hourly', '⏱ By the hour')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 14px' }}>
            <Field label="Default weekly rate ($)" hint="Flat rate for a normal week. New kids start with this.">
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
        <AutoBillingCard />
      </Collapse>

      {/* ── Reminder messages ────────────────────────────────────────── */}
      <Collapse title="💬 Reminder messages">
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>How you reach parents</SectionTitle>
        <label
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            cursor: 'pointer',
            padding: '4px 2px',
          }}
        >
          <input
            type="checkbox"
            checked={!!cfg.data?.settings.phoneOnly}
            disabled={cfg.save.isPending}
            onChange={(e) => {
              if (!cfg.data) return;
              const on = e.target.checked;
              cfg.save.mutate(
                appendLog(
                  { ...cfg.data, settings: { ...cfg.data.settings, phoneOnly: on } },
                  'settings',
                  on ? 'Phone only — no email anywhere' : 'Email switched back on',
                ),
              );
            }}
            style={{ width: 20, height: 20, marginTop: 2, accentColor: B.primary, flex: 'none' }}
          />
          <span>
            <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>
              The mothers I work with don't use email
            </span>
            <span style={{ display: 'block', fontSize: '0.83rem', color: B.mute, marginTop: 3, lineHeight: 1.5 }}>
              Takes email out of the app completely — no email box when you add a child, no
              email button next to a family, no choice to make when you send a reminder.
              Everything to a parent is a text. Nothing you've already typed in is deleted.
            </span>
          </span>
        </label>
      </Card>
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
          The wording
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
        {!cfg.data?.settings.phoneOnly && (
          <>
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
          </>
        )}

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
      </Collapse>

      {/* ── Customize studio ─────────────────────────────────────────── */}
      <Collapse title="🚸 Tell parents their child arrived">
        <Card>
          <p style={mutedLine}>
            The moment you tap a child in on the home screen, their parent hears about it — a text
            if they've turned texts on, otherwise an email. It's the thing parents ask for most and
            the thing they never like to phone about.
          </p>
          {(() => {
            const a = cfg.data?.settings.arrivals ?? DEFAULT_SETTINGS.arrivals;
            const row = (
              on: boolean,
              label: string,
              onClick: () => void,
              disabled = false,
            ) => (
              <button
                type="button"
                disabled={disabled}
                onClick={onClick}
                style={{
                  border: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  borderRadius: B.pill,
                  padding: '8px 15px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  opacity: disabled ? 0.45 : 1,
                  background: on ? B.green : '#f2ede4',
                  color: on ? '#fff' : B.inkSoft,
                }}
              >
                {label}
              </button>
            );
            return (
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {row(a.enabled, a.enabled ? '✓ Telling parents' : 'Turn it on', () =>
                    setArrivals(
                      { enabled: !a.enabled },
                      a.enabled ? 'Arrival messages off' : 'Arrival messages on',
                    ),
                  )}
                  {row(
                    a.onArrive,
                    'When they arrive',
                    () => setArrivals({ onArrive: !a.onArrive }, 'Arrival message changed'),
                    !a.enabled,
                  )}
                  {row(
                    a.onPickup,
                    "When they're picked up",
                    () => setArrivals({ onPickup: !a.onPickup }, 'Pickup message changed'),
                    !a.enabled,
                  )}
                </div>
                {a.enabled && (
                  <>
                    <Field label="When they arrive" hint="{kid} is their first name, {time} is the clock time.">
                      <input
                        style={inputStyle}
                        defaultValue={a.arriveTemplate}
                        onBlur={(e) =>
                          e.target.value.trim() !== a.arriveTemplate &&
                          setArrivals({ arriveTemplate: e.target.value.trim() }, 'Arrival wording changed')
                        }
                      />
                    </Field>
                    <Field label="When they're picked up">
                      <input
                        style={inputStyle}
                        defaultValue={a.pickupTemplate}
                        onBlur={(e) =>
                          e.target.value.trim() !== a.pickupTemplate &&
                          setArrivals({ pickupTemplate: e.target.value.trim() }, 'Pickup wording changed')
                        }
                      />
                    </Field>
                    <p style={mutedLine}>
                      One message per child per day, each way — tapping twice won't send it twice.
                      A family that hasn't turned texts on gets the email instead, and a family with
                      neither gets nothing rather than an error.
                    </p>
                  </>
                )}
              </>
            );
          })()}
        </Card>
      </Collapse>

      <Collapse title="🎨 Customize your app">
      <Card>
        <p style={{ ...mutedLine, marginTop: 0 }}>Turn features on or off, pick your colors and fonts, and reorder the menu.</p>
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
      </Collapse>

      {/* ── Online payments ──────────────────────────────────────────── */}
      <Collapse title="💳 Online payments">
      <Card>
        <p style={{ ...mutedLine, marginTop: 0 }}>
          Connect Stripe if you'd like parents to pay you online. A parent portal with bank-transfer
          (ACH) payments arrives in a later step — connecting now means you'll be ready.
        </p>
        <StripeStatusCard />
      </Card>
      </Collapse>

      {/* ── Her comforts ─────────────────────────────────────────────── */}
      <Collapse title="🧰 Make it yours">
        <ComfortPanels />
      </Collapse>

      {/* ── Health check ─────────────────────────────────────────────── */}
      <Collapse title="🩺 Health check">
        <HealthPanel />
      </Collapse>

      {/* ── Your data ────────────────────────────────────────────────── */}
      <Collapse title="🗂 Your data">
      <Card>
        <p style={{ ...mutedLine, marginTop: 0 }}>
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
          <Btn
            kind="soft"
            disabled={!paymentCount && !(cfg.data?.charges.length)}
            onClick={() =>
              downloadCsv(
                `tax-export-${new Date().getFullYear()}.csv`,
                yearCsv(payments ?? [], cfg.data?.charges ?? [], kidName),
              )
            }
          >
            🧾 Tax-season export (everything, one file)
          </Btn>
          <Btn
            kind="ghost"
            onClick={() => {
              const backup = {
                app: 'babysitting',
                exportedAt: new Date().toISOString(),
                kids: kids ?? [],
                payments: payments ?? [],
                config: cfg.data ?? null,
              };
              const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Babysitting_Backup_${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            💾 Full backup (one file, everything)
          </Btn>
        </div>
      </Card>
      </Collapse>
    </div>
  );
}
