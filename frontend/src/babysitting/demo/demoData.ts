// Sample data for the shareable demo — friendly, obviously fictional.
// Only `import type` from app modules, so this file never creates a
// runtime dependency cycle.

import type { Client, Payment, Trainer } from '../../lib/database.types';
import type { BabysittingConfig } from '../lib/config';

const T_ID = 'demo-trainer';

/** A birthday `inDays` from now, born `yearsAgo` years back — so the demo
 *  always has a birthday coming up, whenever someone opens it. */
function birthdayIn(inDays: number, yearsAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() + inDays);
  d.setFullYear(d.getFullYear() - yearsAgo);
  return d.toISOString().slice(0, 10);
}

/** Born this many months ago — keeps the sample ages sensible forever. */
function bornMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

/** A date `inDays` from now (negative = in the past). */
function dateIn(inDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + inDays);
  return d.toISOString().slice(0, 10);
}

function kid(
  id: string,
  name: string,
  fam: string,
  parent: string,
  days: string,
  extra: {
    owed?: number;
    paid?: number;
    dob?: string;
    allergies?: string;
    notes?: string;
    status?: 'active' | 'paused';
    /** Said yes to balance texts. Off unless set — same as real life. */
    texts?: boolean;
  } = {},
): Client {
  return {
    id,
    trainer_id: T_ID,
    auth_user_id: null,
    full_name: name,
    email: `${fam}@example.com`,
    phone: '555-201-3344',
    date_of_birth: extra.dob ?? null,
    goals: null,
    medical_notes: extra.allergies ?? null,
    emergency_contact: 'Bubby — 555-999-1111',
    status: extra.status ?? 'active',
    tags: [
      'bs:1',
      `family:${fam}`,
      `parent:${parent}`,
      `days:${days}`,
      'wrate:120',
      'hrate:12',
      `totalowed:${extra.owed ?? 0}`,
      `totalpaid:${extra.paid ?? 0}`,
      `startdate:${dateIn(-85)}`,
      ...(extra.texts ? ['smsconsent:1'] : []),
      ...(extra.status !== 'paused' && (extra.owed ?? 0) === 960 ? ['ktag:demo-kt1'] : []),
    ],
    rate_per_session: null,
    package_balance: 0,
    notes: extra.notes ?? null,
    created_at: `${dateIn(-85)}T12:00:00Z`,
    updated_at: `${dateIn(-85)}T12:00:00Z`,
  } as Client;
}

export const DEMO_KIDS: Client[] = [
  kid('demo-k1', 'Rivky Gold', 'gold', 'Malky', 'sun-mon-tue-wed-thu', {
    owed: 960,
    paid: 840,
    dob: bornMonthsAgo(29),
    allergies: 'peanuts',
    notes: 'Naps 1–3pm. Loves the red cup.',
    texts: true,
  }),
  kid('demo-k2', 'Moishy Gold', 'gold', 'Malky', 'sun-mon-tue-wed-thu', { owed: 960, paid: 900, dob: bornMonthsAgo(9), texts: true }),
  kid('demo-k3', 'Shaindy Weiss', 'weiss', 'Chani', 'mon-wed-thu', {
    owed: 720,
    paid: 720,
    dob: birthdayIn(5, 2), // turns 2 next week — shows the birthday card
    notes: 'Picked up by 4:15 sharp.',
  }),
  kid('demo-k4', 'Yanky Berger', 'berger', 'Ruchy', 'sun-tue-thu', {
    owed: 840,
    paid: 640,
    dob: bornMonthsAgo(18),
    allergies: 'dairy, eggs',
  }),
  kid('demo-k5', 'Perry Berger', 'berger', 'Ruchy', 'sun-tue-thu', { owed: 600, paid: 600, dob: bornMonthsAgo(6) }),
  kid('demo-k6', 'Tzippy Stern', 'stern', 'Faigy', 'mon-tue-wed', { owed: 480, paid: 380, dob: birthdayIn(18, 3), texts: true }),
  kid('demo-k7', 'Duvid Klein', 'klein', 'Gitty', 'wed-thu', { owed: 240, paid: 260, dob: bornMonthsAgo(14) }),
  kid('demo-k8', 'Blimi Roth', 'roth', 'Esty', 'sun-mon', { owed: 300, paid: 300, dob: bornMonthsAgo(16), status: 'paused' }),
];

function pay(id: string, kidId: string, amount: number, daysAgo: number, method: string, note?: string): Payment {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id,
    trainer_id: T_ID,
    client_id: kidId,
    amount,
    currency: 'USD',
    payment_type: 'session',
    sessions_covered: 1,
    description: note ?? 'Babysitting payment',
    method,
    reference: null,
    paid_at: d.toISOString(),
    created_at: d.toISOString(),
  } as Payment;
}

// Per-kid sums match each kid's totalpaid tag exactly, so the
// "Check my numbers" health panel shows ✓ in the demo.
export const DEMO_PAYMENTS: Payment[] = [
  pay('demo-p1', 'demo-k1', 120, 2, 'zelle', 'week of Aug 17'),
  pay('demo-p2', 'demo-k3', 240, 3, 'cash', 'two weeks'),
  pay('demo-p3', 'demo-k4', 160, 5, 'check'),
  pay('demo-p4', 'demo-k6', 120, 8, 'zelle'),
  pay('demo-p5', 'demo-k7', 130, 9, 'cash'),
  pay('demo-p6', 'demo-k2', 300, 12, 'check', 'catching up'),
  pay('demo-p7', 'demo-k1', 240, 16, 'zelle'),
  pay('demo-p8', 'demo-k5', 200, 21, 'cash'),
  pay('demo-p9', 'demo-k4', 180, 33, 'zelle'),
  pay('demo-p10', 'demo-k3', 480, 47, 'check'),
  pay('demo-p11', 'demo-k6', 260, 24, 'cash', 'two weeks + hours'),
  pay('demo-p12', 'demo-k7', 130, 25, 'zelle'),
  pay('demo-p13', 'demo-k2', 300, 26, 'check'),
  pay('demo-p14', 'demo-k1', 240, 30, 'zelle'),
  pay('demo-p15', 'demo-k5', 200, 38, 'cash'),
  pay('demo-p16', 'demo-k2', 300, 40, 'check'),
  pay('demo-p17', 'demo-k1', 240, 44, 'zelle'),
  pay('demo-p18', 'demo-k4', 300, 50, 'check', 'first weeks'),
  pay('demo-p19', 'demo-k5', 200, 55, 'cash'),
  pay('demo-p20', 'demo-k8', 300, 60, 'zelle', 'paid before break'),
];

function demoCharges(): BabysittingConfig['charges'] {
  const out: BabysittingConfig['charges'] = [];
  let n = 0;
  for (const k of DEMO_KIDS.slice(0, 7)) {
    for (const w of [1, 8, 15]) {
      const d = new Date();
      d.setDate(d.getDate() - w);
      out.push({
        id: `demo-ch-${++n}`,
        ts: d.toISOString(),
        clientId: k.id,
        kidName: k.full_name,
        familySlug: (k.tags ?? []).find((t) => t.startsWith('family:'))?.slice(7) ?? '',
        amount: 120,
        kind: 'week',
        note: 'auto',
      });
    }
  }
  return out;
}

/** Three weeks of realistic attendance: each kid marked on the weekdays they
 *  actually come, with the odd day off, so the register and the per-kid day
 *  strip both show something true instead of an empty state. */
function demoAttendance(): BabysittingConfig['attendance'] {
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const out: BabysittingConfig['attendance'] = [];
  for (let back = 21; back >= 1; back--) {
    const d = new Date();
    d.setDate(d.getDate() - back);
    const key = DAY_KEYS[d.getDay()];
    const date = d.toISOString().slice(0, 10);
    const present: string[] = [];
    const absent: string[] = [];
    for (const k of DEMO_KIDS) {
      if (k.status !== 'active') continue;
      const days = (k.tags ?? []).find((t) => t.startsWith('days:'))?.slice(5).split('-') ?? [];
      if (!days.includes(key)) continue;
      // A predictable sprinkle of days off — no randomness, so the demo
      // looks the same every time someone opens it.
      if ((back + k.id.charCodeAt(k.id.length - 1)) % 11 === 0) absent.push(k.id);
      else present.push(k.id);
    }
    if (present.length || absent.length) out.push({ date, present, absent });
  }
  return out;
}

export const DEMO_CONFIG: BabysittingConfig = {
  version: 1,
  settings: {
    currency: '$',
    kidWord: 'kid',
    kidWordPlural: 'kids',
    billingMode: 'weekly',
    defaultWeeklyRate: 120,
    defaultHourlyRate: 12,
    smsTemplate:
      'Hi {parent}! Friendly reminder: the balance for {kids} is {currency}{balance}. Thank you!',
    emailSubject: 'Your babysitting balance',
    emailTemplate:
      'Hi {parent},\n\nJust a friendly note that the current babysitting balance for {kids} is {currency}{balance}.\n\nThank you!',
    schedule: { enabled: true, frequency: 'monthly', day: 4, dayOfMonth: 1, emailAuto: true, smsAuto: true },
    mutedFamilies: [],
    gmail: { address: 'leah.littleones@gmail.com', appPassword: '••••••••' },
    receipts: {
      enabled: true,
      smsEnabled: true,
      template:
        'Hi {parent}! Received {currency}{amount}, thank you! The balance for {kids} is now {currency}{balance}.',
    },
    appLevel: 'pro',
    familyDiscount: { enabled: true, type: 'percent', value: 10 },
    autoBilling: { enabled: true, day: 0 },
    payLink: 'https://venmo.com/u/leahs-little-ones',
    editPin: '',
    readOnlyLock: false,
    paymentMethods: ['cash', 'check', 'zelle', 'venmo', 'other'],
  },
  log: [
    {
      id: 'demo-lg1',
      ts: new Date(Date.now() - 3600e3).toISOString(),
      category: 'payment',
      action: 'Payment $120 — Rivky Gold',
      details: 'zelle',
    },
    {
      id: 'demo-lg2',
      ts: new Date(Date.now() - 86400e3).toISOString(),
      category: 'charge',
      action: 'Auto-billed the week: $756 across 7 kids',
      details: 'automatic weekly billing',
    },
    {
      id: 'demo-lg3',
      ts: new Date(Date.now() - 2 * 86400e3).toISOString(),
      category: 'message',
      action: 'Automatic run: 4 emails, 0 texts',
    },
    {
      id: 'demo-lg4',
      ts: new Date(Date.now() - 3 * 86400e3).toISOString(),
      category: 'away',
      action: 'Blimi Roth marked away',
      details: 'family trip',
    },
  ],
  charges: demoCharges(),
  away: [
    {
      id: 'demo-aw1',
      clientId: 'demo-k8',
      kidName: 'Blimi Roth',
      startedAt: new Date(Date.now() - 3 * 86400e3).toISOString(),
      reason: 'Family trip',
    },
  ],
  bin: [],
  customFields: [
    { id: 'demo-cf1', label: 'Doctor' },
    { id: 'demo-cf2', label: 'Pickup password' },
  ],
  kidTags: [
    { id: 'demo-kt1', label: 'New', color: '#4f9d94' },
    { id: 'demo-kt2', label: 'Potty training', color: '#b98420' },
  ],
  attendance: demoAttendance(),
  closures: [
    { id: 'demo-cl1', date: dateIn(9), name: 'Yom Tov — closed' },
    { id: 'demo-cl2', date: dateIn(10), name: 'Yom Tov — closed' },
  ],
};

export const DEMO_TRAINER = {
  id: T_ID,
  full_name: 'Leah',
  business_name: "Leah's Little Ones",
  template_slugs: ['babysitting'],
  public_profile: {},
} as unknown as Trainer;
