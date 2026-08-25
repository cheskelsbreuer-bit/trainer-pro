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

export interface BabysittingConfig {
  version: number;
  settings: BabysittingSettings;
  log: LogEntry[]; // newest first, capped
  charges: ChargeEntry[]; // newest first, capped
  away: AwayRecord[];
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
};

const LOG_CAP = 300;
const CHARGE_CAP = 1000;

function hydrate(raw: unknown): BabysittingConfig {
  const r = (raw ?? {}) as Partial<BabysittingConfig>;
  const s = { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) };
  s.schedule = { ...DEFAULT_SETTINGS.schedule, ...(r.settings?.schedule ?? {}) };
  s.gmail = { ...DEFAULT_SETTINGS.gmail, ...(r.settings?.gmail ?? {}) };
  s.mutedFamilies = Array.isArray(r.settings?.mutedFamilies) ? r.settings!.mutedFamilies : [];
  return {
    version: typeof r.version === 'number' ? r.version : 1,
    settings: s,
    log: Array.isArray(r.log) ? r.log : [],
    charges: Array.isArray(r.charges) ? r.charges : [],
    away: Array.isArray(r.away) ? r.away : [],
    runState: r.runState,
  };
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
