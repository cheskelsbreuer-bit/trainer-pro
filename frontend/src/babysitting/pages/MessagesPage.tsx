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
import { B, readFamilySlug, familyLabel, readDays, formatMoney, shortDate, DAY_SHORT, ALL_DAYS } from '../theme';
import { useKids } from '../lib/data';
import {
  useBabysittingConfig,
  appendLog,
  DEFAULT_SETTINGS,
  type BabysittingConfig,
} from '../lib/config';
import { fillTemplate, familySummary, smsLink, mailtoLink } from '../lib/messages';
import { useDemo } from '../demo/flag';
import { Card, SectionTitle, Btn, LinkBtn, Chip, EmptyState, Field, inputStyle, Collapse } from '../components/ui';

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

function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MessagesPage() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const { user } = useAuth();
  const demo = useDemo();
  const { data: kids } = useKids();
  const cfg = useBabysittingConfig();
  const settings = cfg.data?.settings ?? DEFAULT_SETTINGS;

  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState<DryRunResult | null>(null);
  const [runErr, setRunErr] = useState('');
  // "Send me a test email" — one tap, real answer.
  const [testState, setTestState] = useState<'idle' | 'busy' | 'ok' | 'fail'>('idle');
  const [testMsg, setTestMsg] = useState('');

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

  const [announceText, setAnnounceText] = useState('');
  const [announceFrom, setAnnounceFrom] = useState('');
  const [announceUntil, setAnnounceUntil] = useState('');
  const [announceBusy, setAnnounceBusy] = useState(false);
  const [announceErr, setAnnounceErr] = useState('');
  // Who gets it: no days picked = everyone. Picking days narrows it to
  // families with a kid here on one of those days, so "closed Tuesday"
  // doesn't reach the Thursday-only families.
  const [announceDays, setAnnounceDays] = useState<string[]>([]);
  // How it goes out. The app post is instant; text and email open her
  // own apps with the note written, one tap per family.
  const [postToApp, setPostToApp] = useState(true);
  const [sendText, setSendText] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  // The last note posted — kept around so she can also text it out.
  const [lastPosted, setLastPosted] = useState('');

  // Every family (with contact info), owing or not — notes go to all.
  const familyGroups = useMemo(() => {
    const byFam = new Map<string, typeof active>();
    for (const k of active) {
      const slug = readFamilySlug(k) || `solo-${k.id}`;
      byFam.set(slug, [...(byFam.get(slug) ?? []), k]);
    }
    return Array.from(byFam.entries()).map(([slug, members]) => ({
      slug,
      label: slug.startsWith('solo-') ? members[0].full_name : familyLabel(slug),
      members,
      days: Array.from(new Set(members.flatMap((m) => readDays(m)))),
      ...familySummary(members),
    }));
  }, [active]);

  /** The families this note is actually for. */
  const announceAudience = useMemo(() => {
    if (!announceDays.length) return familyGroups;
    return familyGroups.filter((f) => f.days.some((d) => announceDays.includes(d)));
  }, [familyGroups, announceDays]);
  const audienceKidCount = announceAudience.reduce((s, f) => s + f.members.length, 0);

  /** The note with its "when" baked into the text, so parents see the
   *  dates wherever it shows up — portal, text, anywhere. */
  function announceBody(): string {
    const body = announceText.trim();
    const fmt = (d: string) =>
      new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (announceFrom && announceUntil) return `${body} (${fmt(announceFrom)} – ${fmt(announceUntil)})`;
    if (announceFrom) return `${body} (from ${fmt(announceFrom)})`;
    if (announceUntil) return `${body} (until ${fmt(announceUntil)})`;
    return body;
  }

  // Announcements the demo has posted this session (memory only).
  const [demoAnnouncements, setDemoAnnouncements] = useState<
    Array<{ id: string; body: string; created_at: string }>
  >([]);

  const announcements = useQuery({
    queryKey: ['babysitting-announcements', demo ? 'demo' : user?.id],
    queryFn: async (): Promise<Array<{ id: string; body: string; created_at: string }>> => {
      if (demo) return demoAnnouncements;
      const { data, error } = await supabase
        .from('messages')
        .select('id, body, created_at')
        .eq('trainer_id', user!.id)
        .eq('sender', 'trainer')
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      const seen = new Set<string>();
      const out: Array<{ id: string; body: string; created_at: string }> = [];
      for (const m of (data ?? []) as Array<{ id: string; body: string; created_at: string }>) {
        if (seen.has(m.body)) continue;
        seen.add(m.body);
        out.push(m);
        if (out.length >= 6) break;
      }
      return out;
    },
    enabled: demo || !!user,
  });

  // The demo's posts live in component state; the real app's come from
  // the messages table.
  const postedAnnouncements = demo ? demoAnnouncements : announcements.data ?? [];

  async function postAnnouncement() {
    if (!announceText.trim()) return;
    const body = announceBody();
    if (demo) {
      setDemoAnnouncements((prev) => [
        { id: `demo-ann-${Date.now()}`, body, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setAnnounceText('');
      setAnnounceFrom('');
      setAnnounceUntil('');
      setLastPosted(body);
      saveConfig((c) => c, `Posted to all parents: "${body.slice(0, 60)}"`);
      return;
    }
    if (!user) return;
    if (!announceAudience.length) {
      setAnnounceErr(
        announceDays.length
          ? 'No family has a kid here on those days. Widen the days, or clear them to reach everyone.'
          : 'Add kids first — there is nobody to post to yet.',
      );
      return;
    }
    // Text / email only: skip the database write, just hand her the links.
    if (!postToApp) {
      setAnnounceText('');
      setAnnounceFrom('');
      setAnnounceUntil('');
      setLastPosted(body);
      saveConfig((c) => c, `Note for ${announceAudience.length} families: "${body.slice(0, 60)}"`);
      return;
    }
    setAnnounceBusy(true);
    setAnnounceErr('');
    try {
      const rows = announceAudience.map((f) => ({
        trainer_id: user.id,
        client_id: f.members[0].id,
        sender: 'trainer',
        body,
        // Marks this as a broadcast note, so the parent's portal can pin
        // it apart from ordinary back-and-forth chat messages.
        attachments: [{ kind: 'announcement' }],
      }));
      const { error } = await supabase.from('messages').insert(rows);
      if (error) throw error;
      setAnnounceText('');
      setAnnounceFrom('');
      setAnnounceUntil('');
      setLastPosted(body);
      saveConfig((c) => c, `Posted to all parents: "${body.slice(0, 60)}"`);
      announcements.refetch();
    } catch (e) {
      setAnnounceErr(e instanceof Error ? e.message : 'Could not post.');
    } finally {
      setAnnounceBusy(false);
    }
  }

  const history = useQuery({
    queryKey: ['babysitting-reminder-runs', demo ? 'demo' : user?.id],
    queryFn: async (): Promise<ReminderRunRow[]> => {
      if (demo) return [];
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
    enabled: demo || !!user,
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
    // In the demo there is no server and no real inbox, so the run is
    // computed right here from the same families and templates the real
    // one uses — she sees exactly what would go out.
    if (demo) {
      await new Promise((r) => setTimeout(r, 650));
      const withEmail = runFamilies.filter((f) => f.email);
      setRunResult({
        dry_run: dryRun,
        families: runFamilies.map((f) => ({
          label: f.label,
          balance: f.balance,
          phone: f.phone,
          email: f.email,
          sms_body: fillTemplate(settings.smsTemplate, f, settings),
        })),
        sent_email: dryRun ? 0 : withEmail.length,
        sent_sms: 0,
      });
      if (!dryRun) {
        saveConfig((c) => c, `Automatic run: ${withEmail.length} emails, 0 texts`);
      }
      setBusy(false);
      return;
    }
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
      {/* ── 1 · The Thursday Run — folded until she opens it ──────── */}
      <Collapse
        title="✉️ The reminder run"
        badge={
          runFamilies.length ? (
            <Chip tone={doneCount === runFamilies.length ? 'green' : 'butter'}>
              {doneCount} of {runFamilies.length} done today
            </Chip>
          ) : (
            <Chip tone="green">nobody owes 🎉</Chip>
          )
        }
      >
      <Card>
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
                        <LinkBtn
                          href={smsLink(f.phone, smsBody)}
                          onClick={() => markSent(f.slug, true)}
                          title={`Text ${f.parentName || 'the parent'}`}
                        >
                          📱 Text
                        </LinkBtn>
                      )}
                      {f.email && (
                        <LinkBtn
                          href={mailtoLink(f.email, settings.emailSubject, emailBody)}
                          kind="accent"
                          onClick={() => markSent(f.slug, true)}
                          title={`Email ${f.parentName || 'the parent'}`}
                        >
                          ✉️ Email
                        </LinkBtn>
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
      </Collapse>

      {/* ── 2 · Automatic sending ────────────────────────────────── */}
      <Card>
        <SectionTitle
          right={
            settings.schedule.enabled ? (
              <Chip tone="green">
                {settings.schedule.frequency === 'monthly'
                  ? `On — the ${ordinal(settings.schedule.dayOfMonth)} of every month`
                  : `On — ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][settings.schedule.day]}s`}
              </Chip>
            ) : (
              <Chip tone="neutral">Off</Chip>
            )
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
          {/* Weekly on a weekday, or monthly on a date ("every 1st") */}
          <div style={{ display: 'flex', gap: 5 }}>
            {(['weekly', 'monthly'] as const).map((f) => (
              <button
                key={f}
                disabled={!editMode}
                onClick={() => saveAutomation({ schedule: { ...settings.schedule, frequency: f } }, `Reminders now ${f}`)}
                style={{
                  border: 'none',
                  cursor: editMode ? 'pointer' : 'not-allowed',
                  borderRadius: B.pill,
                  padding: '7px 13px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  background: settings.schedule.frequency === f ? B.accent : '#f2ede4',
                  color: settings.schedule.frequency === f ? '#fff' : B.inkSoft,
                }}
              >
                {f === 'weekly' ? 'Every week' : 'Once a month'}
              </button>
            ))}
          </div>
          {settings.schedule.frequency === 'weekly' ? (
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
          ) : (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 700, color: B.inkSoft }}>
              on the
              <select
                disabled={!editMode}
                value={settings.schedule.dayOfMonth}
                onChange={(e) =>
                  saveAutomation(
                    { schedule: { ...settings.schedule, dayOfMonth: parseInt(e.target.value, 10) } },
                    `Send date set to the ${ordinal(parseInt(e.target.value, 10))}`,
                  )
                }
                style={{ ...inputStyle, width: 84, padding: '7px 9px' }}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {ordinal(d)}
                  </option>
                ))}
              </select>
              of every month
            </label>
          )}
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

        <Field
          label="💳 Where do they pay? (your payment link)"
          hint="Venmo, PayPal.me, Zelle, or a Stripe payment link. Added to the end of every balance reminder and receipt — so paying is one tap from the text."
        >
          <input
            style={inputStyle}
            defaultValue={settings.payLink}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== settings.payLink) saveAutomation({ payLink: v }, 'Payment link updated');
            }}
            placeholder="https://venmo.com/u/your-name"
            disabled={!editMode}
          />
        </Field>

        <details style={{ marginBottom: 14 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', color: B.inkSoft }}>
            ✏️ Edit the message wording
          </summary>
          <div style={{ marginTop: 12 }}>
            <Field label="Text message" hint="Placeholders: {parent} {kids} {currency}{balance} {paylink}">
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
            <Btn
              kind="ghost"
              disabled={testState === 'busy'}
              onClick={async () => {
                setTestState('busy');
                setTestMsg('');
                if (demo) {
                  await new Promise((r) => setTimeout(r, 600));
                  setTestState('ok');
                  setTestMsg('(demo) A real account emails you right here.');
                  return;
                }
                try {
                  const res = await api<{ sent: boolean; channel?: string; to?: string; error?: string }>(
                    '/reminders/test-email',
                    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
                  );
                  if (res.sent) {
                    setTestState('ok');
                    setTestMsg(`Sent to ${res.to} via ${res.channel}. Check your inbox!`);
                  } else {
                    setTestState('fail');
                    setTestMsg(res.error || 'Send failed.');
                  }
                } catch (e) {
                  setTestState('fail');
                  setTestMsg(e instanceof ApiError ? `${e.status}: ${e.message}` : e instanceof Error ? e.message : 'Failed');
                }
              }}
            >
              {testState === 'busy' ? 'Sending…' : '📬 Send me a test email'}
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

        {testMsg && (
          <div
            style={{
              marginTop: 10,
              fontSize: '0.84rem',
              fontWeight: 700,
              color: testState === 'ok' ? B.green : B.red,
              background: testState === 'ok' ? B.greenSoft : B.redSoft,
              borderRadius: B.radiusSm,
              padding: '8px 12px',
            }}
          >
            {testState === 'ok' ? '✓ ' : '✗ '}
            {testMsg}
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
                      <div key={i}>⚠️ {e}</div>
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

      {/* ── Announcements ────────────────────────────────────────── */}
      <Card>
        <SectionTitle>📣 Note to parents</SectionTitle>
        <div style={{ color: B.inkSoft, fontSize: '0.87rem', marginBottom: 12 }}>
          Write once, choose who gets it and how it reaches them. Good for "closed Tuesday" or "bring bathing suits."
        </div>
        {editMode && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <textarea
                style={{ ...inputStyle, flex: '1 1 260px', minHeight: 54, resize: 'vertical' }}
                value={announceText}
                onChange={(e) => setAnnounceText(e.target.value)}
                placeholder="e.g. We're closed this Tuesday. See everyone Wednesday!"
              />
              <Btn
                onClick={() => void postAnnouncement()}
                disabled={announceBusy || !announceText.trim() || (!postToApp && !sendText && !sendEmail)}
              >
                {announceBusy ? 'Posting…' : postToApp ? '📣 Post to parents' : '📣 Prepare messages'}
              </Btn>
            </div>
            {/* Who gets it */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: B.mute }}>Who gets it?</span>
              <button
                type="button"
                onClick={() => setAnnounceDays([])}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: B.pill,
                  padding: '6px 13px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  background: announceDays.length ? '#f2ede4' : B.primary,
                  color: announceDays.length ? B.inkSoft : '#fff',
                }}
              >
                Everyone
              </button>
              <span style={{ fontSize: '0.74rem', color: B.mute }}>or only kids here on:</span>
              {ALL_DAYS.map((day) => {
                const on = announceDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setAnnounceDays((prev) =>
                        prev.includes(day) ? prev.filter((x) => x !== day) : [...prev, day],
                      )
                    }
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: B.pill,
                      padding: '6px 11px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      background: on ? B.accent : '#f2ede4',
                      color: on ? '#fff' : B.inkSoft,
                    }}
                  >
                    {DAY_SHORT[day]}
                  </button>
                );
              })}
              <Chip tone={announceAudience.length ? 'accent' : 'red'}>
                {announceAudience.length} famil{announceAudience.length === 1 ? 'y' : 'ies'} · {audienceKidCount} kid
                {audienceKidCount === 1 ? '' : 's'}
              </Chip>
            </div>

            {/* How it goes out */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: B.mute }}>How?</span>
              {([
                ['app', postToApp, setPostToApp, '📱 In the app', 'Appears at the top of their parent portal, right away'],
                ['text', sendText, setSendText, '💬 Text it', 'Opens your messaging app with the note written, one tap per family'],
                ['email', sendEmail, setSendEmail, '✉️ Email it', 'Opens your email with the note written, one tap per family'],
              ] as const).map(([key, on, set, label, hint]) => (
                <button
                  key={key}
                  type="button"
                  title={hint}
                  onClick={() => set(!on)}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: B.pill,
                    padding: '6px 13px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    background: on ? B.primary : '#f2ede4',
                    color: on ? '#fff' : B.inkSoft,
                  }}
                >
                  {on ? '✓ ' : ''}
                  {label}
                </button>
              ))}
            </div>
            {!postToApp && (sendText || sendEmail) && (
              <div style={{ fontSize: '0.74rem', color: B.mute, marginTop: 6 }}>
                It won't appear in the app — only the texts/emails you send below.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: B.mute }}>From when to when? (optional)</span>
              <input
                style={{ ...inputStyle, width: 148, padding: '7px 10px' }}
                type="date"
                value={announceFrom}
                onChange={(e) => setAnnounceFrom(e.target.value)}
                title="From"
              />
              <span style={{ color: B.mute, fontSize: '0.8rem', fontWeight: 700 }}>to</span>
              <input
                style={{ ...inputStyle, width: 148, padding: '7px 10px' }}
                type="date"
                value={announceUntil}
                onChange={(e) => setAnnounceUntil(e.target.value)}
                title="Until"
              />
              {(announceFrom || announceUntil) && announceText.trim() && (
                <span style={{ fontSize: '0.78rem', color: B.inkSoft, fontStyle: 'italic' }}>
                  They'll see: "{announceBody()}"
                </span>
              )}
            </div>
          </div>
        )}
        {announceErr && <Chip tone="red" style={{ marginBottom: 10 }}>{announceErr}</Chip>}
        {lastPosted && (
          <div
            style={{
              background: B.accentSoft,
              borderRadius: B.radiusSm,
              padding: '10px 14px',
              marginBottom: 12,
              fontSize: '0.84rem',
            }}
          >
            <div style={{ fontWeight: 800, color: B.accentDeep, marginBottom: 6 }}>
              {postToApp
                ? `✓ Posted to ${announceAudience.length} famil${announceAudience.length === 1 ? "y's" : "ies'"} portal.`
                : '✓ Ready to send.'}
              {(sendText || sendEmail) && ' Tap each family to send it:'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {sendText &&
                announceAudience
                  .filter((f) => f.phone)
                  .map((f) => (
                    <LinkBtn key={`sms-${f.slug}`} kind="ghost" href={smsLink(f.phone!, lastPosted)} title={`Text the ${f.label}`}>
                      📱 {f.label}
                    </LinkBtn>
                  ))}
              {sendEmail &&
                announceAudience
                  .filter((f) => f.email)
                  .map((f) => (
                    <LinkBtn
                      key={`mail-${f.slug}`}
                      kind="ghost"
                      href={mailtoLink(f.email!, 'A note from your babysitter', lastPosted)}
                      title={`Email the ${f.label}`}
                    >
                      ✉️ {f.label}
                    </LinkBtn>
                  ))}
              <Btn
                size="sm"
                kind="ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(lastPosted);
                  } catch {
                    window.prompt('Copy the note:', lastPosted);
                  }
                }}
              >
                📋 Copy the note
              </Btn>
              {sendText && !announceAudience.some((f) => f.phone) && (
                <span style={{ color: B.mute }}>No phone numbers on file for these families.</span>
              )}
              {sendEmail && !announceAudience.some((f) => f.email) && (
                <span style={{ color: B.mute }}>No email addresses on file for these families.</span>
              )}
            </div>
          </div>
        )}
        {postedAnnouncements.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {postedAnnouncements.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: '0.87rem' }}>
                <span style={{ color: B.mute, fontSize: '0.76rem', minWidth: 90 }}>{shortDate(a.created_at)}</span>
                <span>{a.body}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: B.mute, fontSize: '0.84rem' }}>Nothing posted yet.</div>
        )}
      </Card>

      {/* ── Receipts ─────────────────────────────────────────────── */}
      <Card>
        <SectionTitle
          right={settings.receipts.enabled ? <Chip tone="green">On</Chip> : <Chip tone="neutral">Off</Chip>}
        >
          🧾 Payment receipts
        </SectionTitle>
        <div style={{ color: B.inkSoft, fontSize: '0.87rem', marginBottom: 12 }}>
          When you record a payment, the parent automatically gets a thank-you with their new balance —
          by email (your Gmail above) and, once texting is set up on the server, by text too.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          {toggle(
            settings.receipts.enabled,
            () =>
              saveAutomation(
                { receipts: { ...settings.receipts, enabled: !settings.receipts.enabled } },
                settings.receipts.enabled ? 'Payment receipts turned off' : 'Payment receipts turned on',
              ),
            '✓ Receipts are ON',
            'Turn receipts on',
          )}
          {settings.receipts.enabled &&
            toggle(
              settings.receipts.smsEnabled,
              () =>
                saveAutomation(
                  { receipts: { ...settings.receipts, smsEnabled: !settings.receipts.smsEnabled } },
                  settings.receipts.smsEnabled ? 'Receipt texts turned off' : 'Receipt texts turned on',
                ),
              '📱 Also texted',
              '📱 Text it too',
            )}
        </div>
        <div style={{ background: B.butterSoft, borderRadius: B.radiusSm, padding: '10px 14px', fontSize: '0.84rem' }}>
          <b>They'll get:</b>{' '}
          {sampleFill(settings.receipts.template.replace('{amount}', '120'))}
        </div>
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
