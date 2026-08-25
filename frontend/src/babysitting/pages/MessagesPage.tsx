// Messages — the heart of the product. Three parts:
//   1. The Thursday Run: every family that owes, message ready — tap
//      Text / Email / Copy, mark done, watch the progress bar fill.
//   2. Automatic sending: pick a day, flip it on — emails go by
//      themselves through her own Gmail (free), texts too when the
//      server has Twilio. Practice mode previews before anything real.
//   3. History: every automatic run, with counts, straight from the log.

import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError } from '../../lib/api';
import { B, readFamilySlug, familyLabel, formatMoney, shortDate, DAY_SHORT, ALL_DAYS } from '../theme';
import { useKids } from '../lib/data';
import {
  useBabysittingConfig,
  appendLog,
  DEFAULT_SETTINGS,
  type BabysittingConfig,
} from '../lib/config';
import { fillTemplate, familySummary, smsLink, mailtoLink } from '../lib/messages';
import { Card, SectionTitle, Btn, Chip, EmptyState, Field, inputStyle } from '../components/ui';

interface RunFamily {
  slug: string;
  label: string;
  parentName: string;
  kidNames: string[];
  balance: number;
  phone: string | null;
  email: string | null;
}

interface DryRunResult {
  dry_run: boolean;
  families?: Array<{ label: string; balance: number; phone: string | null; email: string | null; sms_body: string }>;
  sent_sms?: number;
  sent_email?: number;
  errors?: string[];
  skipped?: string;
}

interface ReminderRunRow {
  id: string;
  created_at: string;
  details: {
    sent_sms?: number;
    sent_email?: number;
    families_checked?: number;
    errors?: string[];
    triggered_by?: string;
  } | null;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MessagesPage() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const { user } = useAuth();
  const { data: kids } = useKids();
  const cfg = useBabysittingConfig();
  const settings = cfg.data?.settings ?? DEFAULT_SETTINGS;

  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState<DryRunResult | null>(null);
  const [runErr, setRunErr] = useState('');

  // Draft state for the automation panel (seeded from saved settings once loaded).
  const [drafts, setDrafts] = useState<{
    smsTemplate: string;
    emailSubject: string;
    emailTemplate: string;
    gmailAddress: string;
    gmailPassword: string;
  } | null>(null);
  const d = drafts ?? {
    smsTemplate: settings.smsTemplate,
    emailSubject: settings.emailSubject,
    emailTemplate: settings.emailTemplate,
    gmailAddress: settings.gmail.address,
    gmailPassword: settings.gmail.appPassword,
  };

  const active = useMemo(() => (kids ?? []).filter((k) => k.status === 'active'), [kids]);

  const families = useMemo<RunFamily[]>(() => {
    const byFam = new Map<string, typeof active>();
    for (const k of active) {
      const slug = readFamilySlug(k) || `solo-${k.id}`;
      byFam.set(slug, [...(byFam.get(slug) ?? []), k]);
    }
    return Array.from(byFam.entries())
      .map(([slug, members]) => {
        const s = familySummary(members);
        return {
          slug,
          label: slug.startsWith('solo-') ? members[0].full_name : familyLabel(slug),
          ...s,
        };
      })
      .filter((f) => f.balance > 0.995)
      .sort((a, b) => b.balance - a.balance);
  }, [active]);

  const muted = settings.mutedFamilies;
  const runFamilies = families.filter((f) => !muted.includes(f.slug));
  const sentToday = cfg.data?.runState?.date === todayKey() ? cfg.data.runState.sent : [];
  const doneCount = runFamilies.filter((f) => sentToday.includes(f.slug)).length;

  const history = useQuery({
    queryKey: ['babysitting-reminder-runs', user?.id],
    queryFn: async (): Promise<ReminderRunRow[]> => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, created_at, details')
        .eq('trainer_id', user!.id)
        .eq('action', 'weekly_balance_reminders')
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as ReminderRunRow[];
    },
    enabled: !!user,
  });

  function saveConfig(mutate: (c: BabysittingConfig) => BabysittingConfig, logMsg?: string) {
    if (!cfg.data) return;
    let next = mutate(cfg.data);
    if (logMsg) next = appendLog(next, 'message', logMsg);
    cfg.save.mutate(next);
  }

  function markSent(slug: string, done: boolean) {
    saveConfig((c) => {
      const prev = c.runState?.date === todayKey() ? c.runState.sent : [];
      const sent = done ? Array.from(new Set([...prev, slug])) : prev.filter((s) => s !== slug);
      return { ...c, runState: { date: todayKey(), sent } };
    });
  }

  function toggleMuted(slug: string) {
    saveConfig(
      (c) => ({
        ...c,
        settings: {
          ...c.settings,
          mutedFamilies: c.settings.mutedFamilies.includes(slug)
            ? c.settings.mutedFamilies.filter((s) => s !== slug)
            : [...c.settings.mutedFamilies, slug],
        },
      }),
    );
  }

  function saveAutomation(partial: Partial<BabysittingConfig['settings']>, logMsg: string) {
    saveConfig((c) => ({ ...c, settings: { ...c.settings, ...partial } }), logMsg);
  }

  async function runBackend(dryRun: boolean) {
    setBusy(true);
    setRunErr('');
    setRunResult(null);
    try {
      const res = await api<DryRunResult>('/reminders/weekly-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: dryRun, force: true }),
      });
      setRunResult(res);
      if (!dryRun) {
        saveConfig(
          (c) => c,
          `Automatic run: ${res.sent_email ?? 0} emails, ${res.sent_sms ?? 0} texts`,
        );
        history.refetch();
      }
    } catch (e) {
      setRunErr(e instanceof ApiError ? `${e.status}: ${e.message}` : e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const sampleFill = (tpl: string) =>
    fillTemplate(tpl, { parentName: 'Malky', kidNames: ['Rivky', 'Moishy'], balance: 45 }, settings);

  const toggle = (on: boolean, onClick: () => void, labelOn: string, labelOff: string) => (
    <button
      onClick={onClick}
      disabled={!editMode}
      style={{
        border: 'none',
        cursor: editMode ? 'pointer' : 'not-allowed',
        borderRadius: B.pill,
        padding: '8px 16px',
        fontSize: '0.8rem',
        fontWeight: 800,
        fontFamily: B.fontDisplay,
        background: on ? B.accent : '#f2ede4',
        color: on ? '#fff' : B.inkSoft,
        opacity: editMode ? 1 : 0.6,
      }}
    >
      {on ? labelOn : labelOff}
    </button>
  );

  if (cfg.isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Opening messages…</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* ── 1 · The Thursday Run ─────────────────────────────────── */}
      <Card>
        <SectionTitle
          right={
            runFamilies.length ? (
              <Chip tone={doneCount === runFamilies.length ? 'green' : 'butter'}>
                {doneCount} of {runFamilies.length} done today
              </Chip>
            ) : undefined
          }
        >
          ✉️ The reminder run
        </SectionTitle>
        <div style={{ color: B.inkSoft, fontSize: '0.87rem', marginBottom: 14 }}>
          Every family that owes, message ready. Tap <b>Text</b> and your messaging app opens with it written;
          tap <b>Email</b> for a ready-to-send email; <b>Copy</b> is for Google Voice. Mark each family done as you go.
        </div>

        {runFamilies.length === 0 ? (
          <EmptyState emoji="🎉" title="Nobody owes anything" body="No reminders needed — enjoy the quiet." />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {runFamilies.map((f) => {
              const smsBody = fillTemplate(settings.smsTemplate, f, settings);
              const emailBody = fillTemplate(settings.emailTemplate, f, settings);
              const done = sentToday.includes(f.slug);
              return (
                <div
                  key={f.slug}
                  style={{
                    border: `1.5px solid ${done ? B.accentSoft : B.rule}`,
                    background: done ? B.accentSoft : B.rowAlt,
                    borderRadius: B.radiusSm,
                    padding: '12px 14px',
                    opacity: done ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 800 }}>{f.label}</div>
                    <Chip tone="red">{formatMoney(f.balance)} owed</Chip>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {f.phone && (
                        <a href={smsLink(f.phone, smsBody)} style={{ textDecoration: 'none' }} onClick={() => markSent(f.slug, true)}>
                          <Btn size="sm">📱 Text</Btn>
                        </a>
                      )}
                      {f.email && (
                        <a
                          href={mailtoLink(f.email, settings.emailSubject, emailBody)}
                          style={{ textDecoration: 'none' }}
                          onClick={() => markSent(f.slug, true)}
                        >
                          <Btn size="sm" kind="accent">✉️ Email</Btn>
                        </a>
                      )}
                      <Btn
                        size="sm"
                        kind="ghost"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(smsBody);
                            setCopied(f.slug);
                            setTimeout(() => setCopied(null), 1800);
                          } catch {
                            window.prompt('Copy the message:', smsBody);
                          }
                        }}
                      >
                        {copied === f.slug ? '✓ Copied' : '📋 Copy'}
                      </Btn>
                      <Btn size="sm" kind={done ? 'soft' : 'ghost'} onClick={() => markSent(f.slug, !done)}>
                        {done ? '↩ Not done' : '✓ Done'}
                      </Btn>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: B.inkSoft, marginTop: 6, fontStyle: 'italic' }}>
                    "{smsBody}"
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {families.some((f) => muted.includes(f.slug)) && (
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: B.mute }}>
            Skipped (muted): {families.filter((f) => muted.includes(f.slug)).map((f) => f.label).join(', ')}
          </div>
        )}
      </Card>

      {/* ── 2 · Automatic sending ────────────────────────────────── */}
      <Card>
        <SectionTitle
          right={
            settings.schedule.enabled ? <Chip tone="green">On — {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][settings.schedule.day]}s</Chip> : <Chip tone="neutral">Off</Chip>
          }
        >
          🤖 Automatic sending
        </SectionTitle>
        <div style={{ color: B.inkSoft, fontSize: '0.87rem', marginBottom: 14 }}>
          Pick a day and the reminders go out by themselves. Emails send from your own Gmail (free).
          Always try a <b>practice run</b> first — it shows exactly what would go out, without sending anything.
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          {toggle(
            settings.schedule.enabled,
            () =>
              saveAutomation(
                { schedule: { ...settings.schedule, enabled: !settings.schedule.enabled } },
                settings.schedule.enabled ? 'Automatic sending turned off' : 'Automatic sending turned on',
              ),
            '✓ Automatic sending is ON',
            'Turn automatic sending on',
          )}
          <div style={{ display: 'flex', gap: 5 }}>
            {ALL_DAYS.map((day, i) => (
              <button
                key={day}
                disabled={!editMode}
                onClick={() => saveAutomation({ schedule: { ...settings.schedule, day: i } }, `Send day set to ${DAY_SHORT[day]}`)}
                style={{
                  border: 'none',
                  cursor: editMode ? 'pointer' : 'not-allowed',
                  borderRadius: B.pill,
                  padding: '7px 11px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  background: settings.schedule.day === i ? B.primary : '#f2ede4',
                  color: settings.schedule.day === i ? '#fff' : B.inkSoft,
                }}
              >
                {DAY_SHORT[day]}
              </button>
            ))}
          </div>
          {toggle(
            settings.schedule.emailAuto,
            () => saveAutomation({ schedule: { ...settings.schedule, emailAuto: !settings.schedule.emailAuto } }, 'Email channel toggled'),
            '✉️ Emails: auto',
            '✉️ Emails: off',
          )}
          {toggle(
            settings.schedule.smsAuto,
            () => saveAutomation({ schedule: { ...settings.schedule, smsAuto: !settings.schedule.smsAuto } }, 'Text channel toggled'),
            '📱 Texts: auto',
            '📱 Texts: off',
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 14px' }}>
          <Field label="Your Gmail address" hint="Emails are sent from this address — free, no business needed.">
            <input
              style={inputStyle}
              value={d.gmailAddress}
              onChange={(e) => setDrafts({ ...d, gmailAddress: e.target.value })}
              placeholder="her.email@gmail.com"
              disabled={!editMode}
            />
          </Field>
          <Field
            label="Gmail app password"
            hint='Google → Security → 2-Step Verification → "App passwords". 16 letters.'
          >
            <input
              style={inputStyle}
              type="password"
              value={d.gmailPassword}
              onChange={(e) => setDrafts({ ...d, gmailPassword: e.target.value })}
              placeholder="•••• •••• •••• ••••"
              disabled={!editMode}
            />
          </Field>
        </div>

        <details style={{ marginBottom: 14 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', color: B.inkSoft }}>
            ✏️ Edit the message wording
          </summary>
          <div style={{ marginTop: 12 }}>
            <Field label="Text message" hint="Placeholders: {parent} {kids} {currency}{balance}">
              <textarea
                style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
                value={d.smsTemplate}
                onChange={(e) => setDrafts({ ...d, smsTemplate: e.target.value })}
                disabled={!editMode}
              />
            </Field>
            <Field label="Email subject">
              <input
                style={inputStyle}
                value={d.emailSubject}
                onChange={(e) => setDrafts({ ...d, emailSubject: e.target.value })}
                disabled={!editMode}
              />
            </Field>
            <Field label="Email body">
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                value={d.emailTemplate}
                onChange={(e) => setDrafts({ ...d, emailTemplate: e.target.value })}
                disabled={!editMode}
              />
            </Field>
            <div style={{ background: B.butterSoft, borderRadius: B.radiusSm, padding: '10px 14px', fontSize: '0.84rem', marginBottom: 12 }}>
              <b>Preview:</b> {sampleFill(d.smsTemplate)}
            </div>
          </div>
        </details>

        {editMode && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn
              kind="soft"
              onClick={() =>
                saveAutomation(
                  {
                    smsTemplate: d.smsTemplate,
                    emailSubject: d.emailSubject,
                    emailTemplate: d.emailTemplate,
                    gmail: { address: d.gmailAddress.trim(), appPassword: d.gmailPassword.trim() },
                  },
                  'Message settings saved',
                )
              }
              disabled={cfg.save.isPending}
            >
              {cfg.save.isPending ? 'Saving…' : '💾 Save message settings'}
            </Btn>
            <Btn kind="accent" onClick={() => runBackend(true)} disabled={busy}>
              {busy ? 'Checking…' : '🧪 Practice run (sends nothing)'}
            </Btn>
            <Btn
              onClick={() => {
                if (window.confirm(`Really send now? Reminders go out to ${runFamilies.length} famil${runFamilies.length === 1 ? 'y' : 'ies'}.`)) {
                  void runBackend(false);
                }
              }}
              disabled={busy || !runFamilies.length}
            >
              🚀 Send now for real
            </Btn>
          </div>
        )}

        {runErr && <Chip tone="red" style={{ marginTop: 12 }}>{runErr}</Chip>}
        {runResult && (
          <div style={{ marginTop: 14, border: `1.5px solid ${B.rule}`, borderRadius: B.radiusSm, padding: '12px 14px' }}>
            {runResult.dry_run ? (
              <>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>
                  🧪 Practice run — {(runResult.families ?? []).length} famil{(runResult.families ?? []).length === 1 ? 'y' : 'ies'} would get a reminder:
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {(runResult.families ?? []).map((f, i) => (
                    <div key={i} style={{ fontSize: '0.84rem' }}>
                      <b>{f.label}</b> · {formatMoney(f.balance)} · {f.email ? '✉️' : ''}{f.phone ? ' 📱' : ''}
                      <span style={{ color: B.mute }}> — "{f.sms_body}"</span>
                    </div>
                  ))}
                  {!(runResult.families ?? []).length && <div style={{ color: B.mute, fontSize: '0.85rem' }}>Nothing to send.</div>}
                </div>
              </>
            ) : (
              <div style={{ fontWeight: 800 }}>
                ✅ Sent: {runResult.sent_email ?? 0} emails, {runResult.sent_sms ?? 0} texts.
                {(runResult.errors ?? []).length > 0 && (
                  <div style={{ fontWeight: 600, color: B.red, fontSize: '0.83rem', marginTop: 6 }}>
                    {(runResult.errors ?? []).map((e, i) => (
                      <div key={i}>⚠ {e}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {families.length > 0 && (
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', color: B.inkSoft }}>
              🔕 Skip certain families
            </summary>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {families.map((f) => {
                const isMuted = muted.includes(f.slug);
                return (
                  <button
                    key={f.slug}
                    disabled={!editMode}
                    onClick={() => toggleMuted(f.slug)}
                    style={{
                      border: 'none',
                      cursor: editMode ? 'pointer' : 'not-allowed',
                      borderRadius: B.pill,
                      padding: '6px 13px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      background: isMuted ? '#f2ede4' : B.accentSoft,
                      color: isMuted ? B.mute : B.accentDeep,
                      textDecoration: isMuted ? 'line-through' : 'none',
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </details>
        )}
      </Card>

      {/* ── 3 · History ──────────────────────────────────────────── */}
      <Card>
        <SectionTitle>📜 Automatic runs</SectionTitle>
        {history.data?.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {history.data.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem' }}>
                <span style={{ fontWeight: 700, minWidth: 110 }}>{shortDate(r.created_at)}</span>
                <Chip tone="accent">✉️ {r.details?.sent_email ?? 0}</Chip>
                <Chip tone="primary">📱 {r.details?.sent_sms ?? 0}</Chip>
                <span style={{ color: B.mute }}>
                  {r.details?.families_checked ?? 0} families checked
                  {r.details?.triggered_by === 'cron' ? ' · scheduled' : ' · sent by you'}
                </span>
                {(r.details?.errors ?? []).length > 0 && <Chip tone="red">{(r.details?.errors ?? []).length} issue(s)</Chip>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: B.mute, fontSize: '0.86rem' }}>
            No automatic runs yet. Manual taps from the reminder run above don't appear here — only automatic and "send now" runs.
          </div>
        )}
      </Card>
    </div>
  );
}
