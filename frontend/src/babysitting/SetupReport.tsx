// "What have they actually done?" — the question behind looking inside an
// account at all.
//
// The admin drawer's tiles say how many clients and how much money. They
// don't say whether the rates were ever filled in, whether any parent has
// a phone number, or whether the register has been touched since setup
// day. This works those out from the same snapshot the app is reading, so
// there is nothing extra to fetch and nothing that can disagree with what
// is on screen.

import { useMemo } from 'react';
import { readParent, readFamilySlug, readWeeklyRate, readHourlyRate, readBalance } from './theme';
import { hydrate } from './lib/config';
import type { ViewAsSnapshot } from './lib/viewAs';

type Verdict = 'done' | 'partly' | 'not-yet';

interface Check {
  label: string;
  verdict: Verdict;
  detail: string;
}

const KID = 'bs:1';

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

function ago(iso: string | null | undefined): string {
  const d = daysSince(iso);
  if (d === null) return 'never';
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  return m === 1 ? 'a month ago' : `${m} months ago`;
}

export function buildReport(s: ViewAsSnapshot): Check[] {
  const cfg = hydrate((s.trainer.public_profile as Record<string, unknown>).babysitting);
  const set = cfg.settings;
  const kids = s.clients.filter((c) => (c.tags ?? []).includes(KID));
  const active = kids.filter((k) => k.status !== 'archived');

  const families = new Map<string, typeof kids>();
  for (const k of active) {
    const slug = readFamilySlug(k) || `solo-${k.id}`;
    families.set(slug, [...(families.get(slug) ?? []), k]);
  }
  const famCount = families.size;
  const famWithContact = Array.from(families.values()).filter((m) =>
    m.some((k) => (k.phone ?? '').trim() || (k.email ?? '').trim()),
  ).length;
  const withParentName = active.filter((k) => readParent(k)).length;
  const withRate = active.filter((k) => readWeeklyRate(k) > 0 || readHourlyRate(k) > 0).length;
  const consenting = active.filter((k) => (k.tags ?? []).includes('smsconsent:1')).length;
  const owed = active.reduce((n, k) => n + Math.max(0, readBalance(k)), 0);

  const lastAttendance = cfg.attendance[0]?.date ?? null;
  const lastPayment = s.payments[0]?.paid_at ?? null;
  const fromParents = s.messages.filter((m) => m.sender === 'client').length;
  const fromSitter = s.messages.filter((m) => m.sender === 'trainer').length;
  const reminderRuns = s.activity.filter((a) => a.action === 'weekly_balance_reminders');
  const joinRequests = s.activity.filter((a) => a.action === 'join_request');

  const three = (n: number, of: number): Verdict =>
    n === 0 ? 'not-yet' : n >= of ? 'done' : 'partly';

  return [
    {
      label: 'Business name',
      verdict: s.trainer.business_name ? 'done' : 'not-yet',
      detail: s.trainer.business_name
        ? `Every text and email goes out as "${s.trainer.business_name}".`
        : 'Messages to parents go out with no business name on them.',
    },
    {
      label: 'Children added',
      verdict: active.length ? 'done' : 'not-yet',
      detail: active.length
        ? `${active.length} in care across ${famCount} ${famCount === 1 ? 'family' : 'families'}.`
        : 'The roster is empty — nothing else in the app can work yet.',
    },
    {
      label: 'A rate on each child',
      verdict: three(withRate, active.length),
      detail: active.length
        ? `${withRate} of ${active.length} have a rate. ${
            set.defaultWeeklyRate > 0 || set.defaultHourlyRate > 0
              ? 'A default rate is set too.'
              : 'No default rate is set, so a new child starts at zero.'
          }`
        : 'No children yet.',
    },
    {
      label: 'A parent name on each child',
      verdict: three(withParentName, active.length),
      detail: active.length
        ? `${withParentName} of ${active.length}. Without one, reminders say "Hi there".`
        : 'No children yet.',
    },
    {
      label: 'A way to reach each family',
      verdict: three(famWithContact, famCount),
      detail: famCount
        ? `${famWithContact} of ${famCount} ${famCount === 1 ? 'family has' : 'families have'} a phone number or an email.${
            famWithContact < famCount ? " The rest can't be sent anything." : ''
          }`
        : 'No families yet.',
    },
    {
      label: 'Parents who said yes to texts',
      verdict: consenting ? 'done' : 'not-yet',
      detail: consenting
        ? `${consenting} of ${active.length}. Only these are ever texted.`
        : 'Nobody has agreed to texts, so no text can legally be sent.',
    },
    {
      label: 'The register (who was here)',
      verdict: lastAttendance ? (daysSince(lastAttendance)! <= 7 ? 'done' : 'partly') : 'not-yet',
      detail: lastAttendance
        ? `${cfg.attendance.length} days recorded, last ${ago(lastAttendance)}.`
        : 'Never used. Attendance is the thing most sitters open the app for.',
    },
    {
      label: 'Money recorded',
      verdict: s.payments.length ? 'done' : 'not-yet',
      detail: s.payments.length
        ? `${s.payments.length} payments, last ${ago(lastPayment)}. ${
            owed > 0 ? `${set.currency}${owed.toFixed(0)} still owed.` : 'Nobody owes anything.'
          }`
        : 'No payment has ever been recorded.',
    },
    {
      label: 'Balance reminders',
      verdict: set.schedule.enabled ? (reminderRuns.length ? 'done' : 'partly') : 'not-yet',
      detail: set.schedule.enabled
        ? reminderRuns.length
          ? `Switched on, and ${reminderRuns.length} ${reminderRuns.length === 1 ? 'run has' : 'runs have'} actually gone out — last ${ago(reminderRuns[0].created_at)}.`
          : 'Switched on, but no run has ever gone out yet.'
        : 'Switched off. Balances are never chased automatically.',
    },
    {
      label: 'Arrival and pickup texts',
      verdict: set.arrivals.enabled ? 'done' : 'not-yet',
      detail: set.arrivals.enabled
        ? 'On — parents hear when their child arrives and goes home.'
        : 'Off. Parents are not told their child arrived.',
    },
    {
      label: 'A way for parents to pay',
      verdict: set.payLink ? 'done' : 'not-yet',
      detail: set.payLink
        ? 'A pay link rides along on every money message.'
        : 'No pay link, so every reminder ends without a way to pay.',
    },
    {
      label: 'Talking to parents in the app',
      verdict: fromParents || fromSitter ? 'done' : 'not-yet',
      detail:
        fromParents || fromSitter
          ? `${fromSitter} sent, ${fromParents} received.`
          : 'The chat has never been used in either direction.',
    },
    {
      label: 'The public sign-up link',
      verdict: joinRequests.length ? 'done' : 'not-yet',
      detail: joinRequests.length
        ? `${joinRequests.length} ${joinRequests.length === 1 ? 'parent has' : 'parents have'} filled it in, last ${ago(joinRequests[0].created_at)}.`
        : 'Nobody has signed up through it yet.',
    },
  ];
}

const TONE: Record<Verdict, { dot: string; word: string }> = {
  done: { dot: '#3f9a6a', word: 'done' },
  partly: { dot: '#d09424', word: 'partly' },
  'not-yet': { dot: '#c0574b', word: 'not yet' },
};

export function SetupReport({ snapshot }: { snapshot: ViewAsSnapshot }) {
  const checks = useMemo(() => buildReport(snapshot), [snapshot]);
  const done = checks.filter((c) => c.verdict === 'done').length;

  return (
    <div
      style={{
        background: '#fff',
        color: '#2b2620',
        borderRadius: 12,
        padding: '14px 16px',
        maxHeight: '55vh',
        overflowY: 'auto',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 2 }}>
        {done} of {checks.length} set up
      </div>
      <p style={{ fontSize: '0.78rem', color: '#6b6156', margin: '0 0 12px' }}>
        Worked out from their own data — nothing here was asked of them.
      </p>
      <div style={{ display: 'grid', gap: 9 }}>
        {checks.map((c) => (
          <div key={c.label} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span
              aria-hidden
              style={{
                width: 9,
                height: 9,
                borderRadius: 99,
                marginTop: 5,
                flex: '0 0 auto',
                background: TONE[c.verdict].dot,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                {c.label}{' '}
                <span style={{ fontWeight: 500, color: TONE[c.verdict].dot }}>
                  — {TONE[c.verdict].word}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b6156', lineHeight: 1.45 }}>
                {c.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
