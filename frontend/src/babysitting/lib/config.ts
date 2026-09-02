// Per-sitter app config, stored as one JSON blob under
// trainers.public_profile.babysitting. Holds everything that isn't a
// kid record or a payment: settings, the activity log, away records,
// and the billing history (charges live here — payments live in the
// payments table).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useDemo } from '../demo/flag';

export interface MessageSchedule {
  enabled: boolean;
  /** 'weekly' = a weekday (day), 'monthly' = a date (dayOfMonth). */
  frequency: 'weekly' | 'monthly';
  day: number; // 0=Sunday … 6=Saturday (JS convention) — weekly mode
  dayOfMonth: number; // 1–28 — monthly mode ("every 1st")
  emailAuto: boolean; // send emails automatically on the scheduled day
  smsAuto: boolean; // send texts automatically (needs Twilio on the server)
}

export interface GmailSending {
  address: string;
  appPassword: string; // Gmail "app password" — sends from her own address
}

export interface ReceiptSettings {
  enabled: boolean;
  smsEnabled: boolean; // ALSO text the receipt (when the server has an SMS provider)
  template: string; // {parent} {kids} {currency}{amount} {currency}{balance} {paylink}
}

/** "Did she get there?" — the message a parent actually wants.
 *  Sent the moment the sitter marks a child in or out, through whichever
 *  channel that family has: a text if they turned texts on, otherwise
 *  email. Off until she switches it on: it is one message per child per
 *  morning, which some parents love and some would rather not have. */
export interface ArrivalNotices {
  enabled: boolean;
  onArrive: boolean;
  onPickup: boolean;
  arriveTemplate: string; // {kid} {time} {business}
  pickupTemplate: string;
}

export interface BabysittingSettings {
  currency: string; // '$'
  /** What she calls the children — 'kid'/'kids' by default, but a day
   *  camp says 'camper', a daycare says 'child'. Used in headings and
   *  counts across the app. */
  kidWord: string;
  kidWordPlural: string;
  billingMode: 'weekly' | 'hourly'; // how she usually bills — picks the default everywhere
  defaultWeeklyRate: number;
  defaultHourlyRate: number;
  smsTemplate: string; // {parent} {kids} {currency}{balance}
  emailSubject: string;
  emailTemplate: string;
  schedule: MessageSchedule;
  mutedFamilies: string[]; // family slugs left out of reminder runs
  gmail: GmailSending;
  receipts: ReceiptSettings;
  arrivals: ArrivalNotices;
  appLevel: 'simple' | 'standard' | 'pro'; // how much of the app shows
  familyDiscount: { enabled: boolean; type: 'percent' | 'flat'; value: number }; // 2nd+ siblings
  autoBilling: { enabled: boolean; day: number }; // weekly charges post themselves (day: 0=Sun…6=Sat)
  /** Where parents pay — a Venmo/PayPal.me/Zelle/Stripe payment-link URL.
   *  When set, it rides along on balance reminders and receipts as
   *  {paylink}, so every money text ends with a way to pay right now. */
  payLink: string;
  editPin: string; // '' = no PIN; otherwise 4 digits asked before editing
  readOnlyLock: boolean; // true = editing can't be turned on at all
  paymentMethods: string[]; // her own list of how people pay
}

export interface CustomFieldDef {
  id: string;
  label: string; // e.g. "Doctor", "Pickup password", "Nap schedule"
}

export interface KidTagDef {
  id: string;
  label: string; // e.g. "New", "Potty training"
  color: string; // hex
}

export interface ClosureDay {
  id: string;
  date: string; // YYYY-MM-DD
  name: string; // e.g. "Pesach", "Vacation"
}

/** Which families were already handled in today's manual Thursday Run. */
export interface RunState {
  date: string; // YYYY-MM-DD
  sent: string[]; // family slugs marked done
}

export interface LogEntry {
  id: string;
  ts: string; // ISO
  category: 'kid' | 'payment' | 'charge' | 'away' | 'settings' | 'message';
  action: string;
  details?: string;
}

export interface ChargeEntry {
  id: string;
  ts: string; // ISO — when it was billed
  clientId: string;
  kidName: string;
  familySlug: string;
  amount: number; // negative = credit/discount
  kind: 'week' | 'hours' | 'custom' | 'adjustment';
  hours?: number;
  note?: string;
}

export interface AwayRecord {
  id: string;
  clientId: string;
  kidName: string;
  startedAt: string; // ISO
  endedAt?: string; // ISO — set when the kid returns
  reason?: string;
}

/** One day's attendance. Stored in the config blob rather than its own
 *  table so it needs no database migration; capped so the blob stays
 *  small (a year of six-day weeks is ~310 entries). */
export interface AttendanceDay {
  date: string; // YYYY-MM-DD
  present: string[]; // client ids — arrived
  absent: string[]; // client ids — didn't come
  /** Arrived AND has since gone home. A subset of `present`: a child who
   *  was picked up was, by definition, here. Optional so days recorded
   *  before pickup existed still read correctly. */
  pickedUp?: string[];
}

/** Recycle bin — deleted payments wait here before they're truly gone. */
export interface BinEntry {
  id: string;
  ts: string; // when it was deleted
  kind: 'payment';
  label: string; // plain English: "$120 — Rivky Gold (zelle, Aug 12)"
  payment: {
    client_id: string;
    amount: number;
    paid_at: string;
    method: string | null;
    description: string | null;
  };
}

export interface BabysittingConfig {
  version: number;
  settings: BabysittingSettings;
  log: LogEntry[]; // newest first, capped
  charges: ChargeEntry[]; // newest first, capped
  away: AwayRecord[];
  bin: BinEntry[]; // newest first, capped 50
  customFields: CustomFieldDef[];
  kidTags: KidTagDef[];
  closures: ClosureDay[];
  attendance: AttendanceDay[]; // newest first, capped
  runState?: RunState;
  /** Sign-up requests she has already added or hidden. */
  handledJoins?: string[];
}

export const DEFAULT_SETTINGS: BabysittingSettings = {
  currency: '$',
  kidWord: 'kid',
  kidWordPlural: 'kids',
  billingMode: 'weekly',
  defaultWeeklyRate: 0,
  defaultHourlyRate: 0,
  smsTemplate:
    // No "from your babysitter" — every text now opens with the business's
    // own name. No em dash either: one non-GSM character halves how much
    // fits in a message segment, and doubles what it costs to send.
    'Hi {parent}! Friendly reminder: the balance for {kids} is {currency}{balance}. Thank you!',
  emailSubject: 'Your babysitting balance',
  emailTemplate:
    'Hi {parent},\n\nJust a friendly note that the current babysitting balance for {kids} is {currency}{balance}.\n\nThank you!',
  schedule: { enabled: false, frequency: 'weekly', day: 4, dayOfMonth: 1, emailAuto: true, smsAuto: false },
  mutedFamilies: [],
  gmail: { address: '', appPassword: '' },
  receipts: {
    enabled: false,
    smsEnabled: true,
    template:
      'Hi {parent}! Received {currency}{amount}, thank you! The balance for {kids} is now {currency}{balance}.',
  },
  arrivals: {
    enabled: false,
    onArrive: true,
    onPickup: true,
    arriveTemplate: '{kid} arrived safely at {time}.',
    pickupTemplate: '{kid} was picked up at {time}.',
  },
  appLevel: 'standard',
  familyDiscount: { enabled: false, type: 'percent', value: 10 },
  autoBilling: { enabled: false, day: 0 },
  payLink: '',
  editPin: '',
  readOnlyLock: false,
  paymentMethods: ['cash', 'check', 'zelle', 'venmo', 'other'],
};

const LOG_CAP = 300;
const ATTENDANCE_CAP = 400;
const CHARGE_CAP = 1000;

function hydrate(raw: unknown): BabysittingConfig {
  const r = (raw ?? {}) as Partial<BabysittingConfig>;
  const s = { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) };
  s.schedule = { ...DEFAULT_SETTINGS.schedule, ...(r.settings?.schedule ?? {}) };
  if (!['weekly', 'monthly'].includes(s.schedule.frequency)) s.schedule.frequency = 'weekly';
  if (!(s.schedule.dayOfMonth >= 1 && s.schedule.dayOfMonth <= 28)) s.schedule.dayOfMonth = 1;
  s.gmail = { ...DEFAULT_SETTINGS.gmail, ...(r.settings?.gmail ?? {}) };
  s.receipts = { ...DEFAULT_SETTINGS.receipts, ...(r.settings?.receipts ?? {}) };
  s.arrivals = { ...DEFAULT_SETTINGS.arrivals, ...(r.settings?.arrivals ?? {}) };
  s.mutedFamilies = Array.isArray(r.settings?.mutedFamilies) ? r.settings!.mutedFamilies : [];
  s.paymentMethods =
    Array.isArray(r.settings?.paymentMethods) && r.settings!.paymentMethods.length
      ? r.settings!.paymentMethods
      : DEFAULT_SETTINGS.paymentMethods;
  if (!['simple', 'standard', 'pro'].includes(s.appLevel)) s.appLevel = 'standard';
  if (!['weekly', 'hourly'].includes(s.billingMode)) s.billingMode = 'weekly';
  if (!s.kidWord?.trim()) s.kidWord = DEFAULT_SETTINGS.kidWord;
  if (!s.kidWordPlural?.trim()) s.kidWordPlural = DEFAULT_SETTINGS.kidWordPlural;
  s.familyDiscount = { ...DEFAULT_SETTINGS.familyDiscount, ...(r.settings?.familyDiscount ?? {}) };
  s.autoBilling = { ...DEFAULT_SETTINGS.autoBilling, ...(r.settings?.autoBilling ?? {}) };
  return {
    version: typeof r.version === 'number' ? r.version : 1,
    settings: s,
    log: Array.isArray(r.log) ? r.log : [],
    charges: Array.isArray(r.charges) ? r.charges : [],
    away: Array.isArray(r.away) ? r.away : [],
    bin: Array.isArray(r.bin) ? r.bin : [],
    customFields: Array.isArray(r.customFields) ? r.customFields : [],
    kidTags: Array.isArray(r.kidTags) ? r.kidTags : [],
    closures: Array.isArray(r.closures) ? r.closures : [],
    attendance: Array.isArray(r.attendance) ? r.attendance : [],
    runState: r.runState,
    handledJoins: Array.isArray(r.handledJoins) ? r.handledJoins.slice(-300) : [],
  };
}

const BIN_CAP = 50;

export function appendBin(
  cfg: BabysittingConfig,
  entry: Omit<BinEntry, 'id' | 'ts'>,
): BabysittingConfig {
  const row: BinEntry = {
    id: freshId('bin'),
    ts: new Date().toISOString(),
    ...entry,
  };
  return { ...cfg, bin: [row, ...cfg.bin].slice(0, BIN_CAP) };
}

interface TrainerProfileRow {
  id: string;
  public_profile: Record<string, unknown> | null;
}

export function useBabysittingConfig() {
  const { user } = useAuth();
  const demo = useDemo();
  const qc = useQueryClient();

  const key = ['babysitting-config', demo ? 'demo' : user?.id];

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<BabysittingConfig> => {
      if (demo) {
        const { demoConfig } = await import('../demo/demoStore');
        return demoConfig();
      }
      const { data, error } = await supabase
        .from('trainers')
        .select('id, public_profile')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      const profile = (data as TrainerProfileRow).public_profile ?? {};
      return hydrate((profile as Record<string, unknown>).babysitting);
    },
    enabled: demo || !!user,
  });

  const save = useMutation({
    mutationFn: async (next: BabysittingConfig) => {
      if (demo) {
        // The demo saves to memory, so her settings changes stick while
        // she plays — and reset on refresh. Nothing leaves the browser.
        const { setDemoConfig } = await import('../demo/demoStore');
        setDemoConfig(next);
        return;
      }
      if (!user) throw new Error('Not signed in');
      // Re-fetch the latest profile so sibling keys (appearance, modules,
      // other verticals) are never clobbered by our write.
      const { data: cur, error: e1 } = await supabase
        .from('trainers')
        .select('public_profile')
        .eq('id', user.id)
        .single();
      if (e1) throw e1;
      const profile = ((cur as { public_profile: Record<string, unknown> } | null)
        ?.public_profile ?? {}) as Record<string, unknown>;
      const nextProfile = { ...profile, babysitting: next };
      const { error } = await supabase
        .from('trainers')
        .update({ public_profile: nextProfile })
        .eq('id', user.id);
      if (error) throw error;
    },
    // Show the change straight away, and build the NEXT change on top of
    // it. Without this, tapping three children into the register in quick
    // succession loses two of them: each tap starts from the same stale
    // config and the last write wins. It also made the register feel
    // dead on a slow phone — tap, nothing, tap again, and the second tap
    // undoes the first.
    onMutate: async (next: BabysittingConfig) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<BabysittingConfig>(key);
      qc.setQueryData(key, next);
      return { previous };
    },
    onError: (_err, _next, ctx) => {
      // Put it back. A tick that stays on screen after the save failed is
      // worse than one that disappears — she'd never know to redo it.
      const c = ctx as { previous?: BabysittingConfig } | undefined;
      if (c?.previous) qc.setQueryData(key, c.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['babysitting-config'] }),
  });

  return { ...query, save };
}

function freshId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function appendLog(
  cfg: BabysittingConfig,
  category: LogEntry['category'],
  action: string,
  details?: string,
): BabysittingConfig {
  const entry: LogEntry = {
    id: freshId('lg'),
    ts: new Date().toISOString(),
    category,
    action,
    details,
  };
  return { ...cfg, log: [entry, ...cfg.log].slice(0, LOG_CAP) };
}

export function appendCharge(
  cfg: BabysittingConfig,
  charge: Omit<ChargeEntry, 'id' | 'ts'> & { ts?: string },
): BabysittingConfig {
  const entry: ChargeEntry = {
    id: freshId('ch'),
    ts: charge.ts ?? new Date().toISOString(),
    clientId: charge.clientId,
    kidName: charge.kidName,
    familySlug: charge.familySlug,
    amount: charge.amount,
    kind: charge.kind,
    hours: charge.hours,
    note: charge.note,
  };
  return { ...cfg, charges: [entry, ...cfg.charges].slice(0, CHARGE_CAP) };
}


/** Mark one kid present / absent / unmarked for a day. Returns a new
 *  config — the caller saves it, like every other edit here. */
export function setAttendance(
  cfg: BabysittingConfig,
  date: string,
  clientId: string,
  state: 'present' | 'absent' | 'picked_up' | 'clear',
): BabysittingConfig {
  const rest = cfg.attendance.filter((d) => d.date !== date);
  const day = cfg.attendance.find((d) => d.date === date) ?? { date, present: [], absent: [] };
  const present = day.present.filter((id) => id !== clientId);
  const absent = day.absent.filter((id) => id !== clientId);
  const pickedUp = (day.pickedUp ?? []).filter((id) => id !== clientId);
  // Picked up means arrived and then went home, so it implies present.
  if (state === 'present' || state === 'picked_up') present.push(clientId);
  if (state === 'picked_up') pickedUp.push(clientId);
  if (state === 'absent') absent.push(clientId);
  const next: AttendanceDay = { date, present, absent, pickedUp };
  const kept = present.length || absent.length ? [next, ...rest] : rest;
  return {
    ...cfg,
    attendance: kept
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, ATTENDANCE_CAP),
  };
}

/** Mark several kids at once — the "everyone's here" tap. */
export function setAttendanceMany(
  cfg: BabysittingConfig,
  date: string,
  clientIds: string[],
  state: 'present' | 'absent',
): BabysittingConfig {
  let next = cfg;
  for (const id of clientIds) next = setAttendance(next, date, id, state);
  return next;
}

/** Mark a public sign-up request as dealt with — added, or hidden.
 *  Capped, because this list only ever needs to cover what is still on
 *  screen. */
export function markJoinHandled(cfg: BabysittingConfig, id: string): BabysittingConfig {
  const seen = new Set(cfg.handledJoins ?? []);
  seen.add(id);
  return { ...cfg, handledJoins: Array.from(seen).slice(-300) };
}

export function attendanceFor(cfg: BabysittingConfig | undefined, date: string): AttendanceDay {
  const day = cfg?.attendance.find((d) => d.date === date);
  return day
    ? { ...day, pickedUp: day.pickedUp ?? [] }
    : { date, present: [], absent: [], pickedUp: [] };
}

/** The individual days behind the tally, newest last, so a sitter can point
 *  at a date when a parent says "she wasn't there that Thursday". Only days
 *  actually marked appear — a day nobody touched is not a claim either way. */
export function attendanceHistory(
  cfg: BabysittingConfig | undefined,
  clientId: string,
  sinceDays = 35,
): Array<{ date: string; here: boolean }> {
  const cut = new Date();
  cut.setDate(cut.getDate() - sinceDays);
  const cutKey = cut.toISOString().slice(0, 10);
  const out: Array<{ date: string; here: boolean }> = [];
  for (const d of cfg?.attendance ?? []) {
    if (d.date < cutKey) continue;
    if (d.present.includes(clientId)) out.push({ date: d.date, here: true });
    else if (d.absent.includes(clientId)) out.push({ date: d.date, here: false });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** How many days this kid was here / out across the stored history. */
export function attendanceTally(
  cfg: BabysittingConfig | undefined,
  clientId: string,
  sinceDays = 30,
): { here: number; out: number } {
  const cut = new Date();
  cut.setDate(cut.getDate() - sinceDays);
  const cutKey = cut.toISOString().slice(0, 10);
  let here = 0;
  let out = 0;
  for (const d of cfg?.attendance ?? []) {
    if (d.date < cutKey) continue;
    if (d.present.includes(clientId)) here++;
    else if (d.absent.includes(clientId)) out++;
  }
  return { here, out };
}
