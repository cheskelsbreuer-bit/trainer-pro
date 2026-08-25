// Per-sitter app config, stored as one JSON blob under
// trainers.public_profile.babysitting. Holds everything that isn't a
// kid record or a payment: settings, the activity log, away records,
// and the billing history (charges live here — payments live in the
// payments table).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export interface MessageSchedule {
  enabled: boolean;
  day: number; // 0=Sunday … 6=Saturday (JS convention)
  emailAuto: boolean; // send emails automatically on the scheduled day
  smsAuto: boolean; // send texts automatically (needs Twilio on the server)
}

export interface GmailSending {
  address: string;
  appPassword: string; // Gmail "app password" — sends from her own address
}

export interface ReceiptSettings {
  enabled: boolean;
  template: string; // {parent} {kids} {currency}{amount} {currency}{balance}
}

export interface BabysittingSettings {
  currency: string; // '$'
  defaultWeeklyRate: number;
  defaultHourlyRate: number;
  smsTemplate: string; // {parent} {kids} {currency}{balance}
  emailSubject: string;
  emailTemplate: string;
  schedule: MessageSchedule;
  mutedFamilies: string[]; // family slugs left out of reminder runs
  gmail: GmailSending;
  receipts: ReceiptSettings;
  appLevel: 'simple' | 'standard' | 'pro'; // how much of the app shows
  familyDiscount: { enabled: boolean; type: 'percent' | 'flat'; value: number }; // 2nd+ siblings
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
  runState?: RunState;
}

export const DEFAULT_SETTINGS: BabysittingSettings = {
  currency: '$',
  defaultWeeklyRate: 0,
  defaultHourlyRate: 0,
  smsTemplate:
    'Hi {parent}! Friendly reminder from your babysitter: the balance for {kids} is {currency}{balance}. Thank you!',
  emailSubject: 'Your babysitting balance',
  emailTemplate:
    'Hi {parent},\n\nJust a friendly note that the current babysitting balance for {kids} is {currency}{balance}.\n\nThank you!',
  schedule: { enabled: false, day: 4, emailAuto: true, smsAuto: false },
  mutedFamilies: [],
  gmail: { address: '', appPassword: '' },
  receipts: {
    enabled: false,
    template:
      'Hi {parent}! Received {currency}{amount} — thank you! The balance for {kids} is now {currency}{balance}.',
  },
  appLevel: 'standard',
  familyDiscount: { enabled: false, type: 'percent', value: 10 },
  editPin: '',
  readOnlyLock: false,
  paymentMethods: ['cash', 'check', 'zelle', 'venmo', 'other'],
};

const LOG_CAP = 300;
const CHARGE_CAP = 1000;

function hydrate(raw: unknown): BabysittingConfig {
  const r = (raw ?? {}) as Partial<BabysittingConfig>;
  const s = { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) };
  s.schedule = { ...DEFAULT_SETTINGS.schedule, ...(r.settings?.schedule ?? {}) };
  s.gmail = { ...DEFAULT_SETTINGS.gmail, ...(r.settings?.gmail ?? {}) };
  s.receipts = { ...DEFAULT_SETTINGS.receipts, ...(r.settings?.receipts ?? {}) };
  s.mutedFamilies = Array.isArray(r.settings?.mutedFamilies) ? r.settings!.mutedFamilies : [];
  s.paymentMethods =
    Array.isArray(r.settings?.paymentMethods) && r.settings!.paymentMethods.length
      ? r.settings!.paymentMethods
      : DEFAULT_SETTINGS.paymentMethods;
  if (!['simple', 'standard', 'pro'].includes(s.appLevel)) s.appLevel = 'standard';
  s.familyDiscount = { ...DEFAULT_SETTINGS.familyDiscount, ...(r.settings?.familyDiscount ?? {}) };
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
    runState: r.runState,
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
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['babysitting-config', user?.id],
    queryFn: async (): Promise<BabysittingConfig> => {
      const { data, error } = await supabase
        .from('trainers')
        .select('id, public_profile')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      const profile = (data as TrainerProfileRow).public_profile ?? {};
      return hydrate((profile as Record<string, unknown>).babysitting);
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async (next: BabysittingConfig) => {
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['babysitting-config'] }),
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
