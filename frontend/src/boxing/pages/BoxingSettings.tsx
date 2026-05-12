// Boxing gym settings — hub that includes both boxing-native sections
// (identity, gym room defaults) and reuses the solo-trainer settings
// cards (Stripe, Google Calendar, booking, public profile, directory,
// feedback) hosted inside boxing chrome.

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Save,
  CreditCard,
  CalendarDays,
  Globe,
  MapPin,
  LifeBuoy,
  ChevronRight,
  User,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';
import { BOXING_COLORS, FIGHTER_TIERS, WEIGHT_CLASSES } from '../theme';
import {
  BoxingPage,
  BoxingPageHeader,
  BoxingCard,
  BoxingSectionHeader,
  BoxingButton,
} from '../components/BoxingUI';
import { TierBadge } from '../components/FighterRecord';

// Reused solo-trainer cards.
import { StripeStatusCard } from '../../components/StripeStatusCard';
import { GoogleCalendarCard } from '../../components/GoogleCalendarCard';
import { BookingSettingsCard } from '../../components/BookingSettingsCard';
import { PublicProfileSettingsCard } from '../../components/PublicProfileSettingsCard';
import { DirectorySettingsCard } from '../../components/DirectorySettingsCard';
import { FeedbackCard } from '../../components/FeedbackCard';

type Section =
  | 'overview'
  | 'identity'
  | 'tiers'
  | 'weights'
  | 'profile'
  | 'payments'
  | 'booking'
  | 'calendar'
  | 'public_profile'
  | 'directory'
  | 'support';

export function BoxingSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>('overview');

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

  if (section === 'overview') {
    return (
      <BoxingPage>
        <BoxingPageHeader
          eyebrow="The corner"
          title="Settings"
          subtitle="Gym identity, tiers, weight classes, online payments, schedule — everything that runs the gym."
          corner="split"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <HubTile
            onClick={() => setSection('identity')}
            icon={<SettingsIcon size={16} />}
            title="Gym identity"
            blurb="Gym name, branding, contact details."
            accent="red"
          />
          <HubTile
            onClick={() => setSection('tiers')}
            icon={<Layers size={16} />}
            title="Tier system"
            blurb="Recreational / Amateur / Pro — the pipeline."
            accent="blue"
          />
          <HubTile
            onClick={() => setSection('weights')}
            icon={<Layers size={16} />}
            title="Weight classes"
            blurb="USA Boxing amateur + pro divisions on file."
          />
          <HubTile
            onClick={() => setSection('profile')}
            icon={<User size={16} />}
            title="Coach profile"
            blurb="Name, contact, timezone, currency, notifications."
          />
          <HubTile
            onClick={() => setSection('payments')}
            icon={<CreditCard size={16} />}
            title="Online payments (Stripe)"
            blurb="Take dues + camp fees online."
          />
          <HubTile
            onClick={() => setSection('booking')}
            icon={<CalendarDays size={16} />}
            title="Class booking"
            blurb="When fighters can book sessions."
          />
          <HubTile
            onClick={() => setSection('calendar')}
            icon={<CalendarDays size={16} />}
            title="Google Calendar"
            blurb="Mirror sessions to your personal calendar."
          />
          <HubTile
            onClick={() => setSection('public_profile')}
            icon={<Globe size={16} />}
            title="Public gym profile"
            blurb="What prospective fighters see online."
          />
          <HubTile
            onClick={() => setSection('directory')}
            icon={<MapPin size={16} />}
            title="Find-a-gym directory"
            blurb="Show up in the public coach search."
          />
          <HubTile
            onClick={() => setSection('support')}
            icon={<LifeBuoy size={16} />}
            title="Help & feedback"
            blurb="Bugs, requests, anything."
          />
        </div>
      </BoxingPage>
    );
  }

  return (
    <BoxingPage>
      <button
        onClick={() => setSection('overview')}
        className="text-xs uppercase tracking-wider mb-4 inline-flex items-center gap-1 px-2.5 py-1.5 rounded transition-colors hover:opacity-90"
        style={{
          background: BOXING_COLORS.bgPanel,
          border: `1px solid ${BOXING_COLORS.divider}`,
          color: BOXING_COLORS.textSecondary,
        }}
      >
        ← All settings
      </button>

      {section === 'identity' && (
        <IdentitySection trainer={trainer} userId={user?.id} qc={qc} />
      )}
      {section === 'tiers' && <TiersInfoSection />}
      {section === 'weights' && <WeightsInfoSection />}
      {section === 'profile' && trainer && (
        <ProfileSection trainer={trainer} userId={user?.id} qc={qc} />
      )}
      {section === 'payments' && (
        <SolarWrap title="Online payments (Stripe)"><StripeStatusCard /></SolarWrap>
      )}
      {section === 'calendar' && trainer && (
        <SolarWrap title="Google Calendar sync">
          <GoogleCalendarCard trainer={trainer} />
        </SolarWrap>
      )}
      {section === 'booking' && trainer && (
        <SolarWrap title="Class booking">
          <BookingSettingsCard trainer={trainer} />
        </SolarWrap>
      )}
      {section === 'public_profile' && trainer && (
        <SolarWrap title="Public gym profile">
          <PublicProfileSettingsCard trainer={trainer} />
        </SolarWrap>
      )}
      {section === 'directory' && trainer && (
        <SolarWrap title="Find-a-gym directory listing">
          <DirectorySettingsCard trainer={trainer} />
        </SolarWrap>
      )}
      {section === 'support' && (
        <SolarWrap title="Help & feedback">
          <FeedbackCard />
        </SolarWrap>
      )}
    </BoxingPage>
  );
}

function HubTile({
  onClick,
  icon,
  title,
  blurb,
  accent,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  blurb: string;
  accent?: 'red' | 'blue';
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-md border p-4 transition-colors hover:opacity-95"
      style={{
        background: BOXING_COLORS.bgPanel,
        borderColor: BOXING_COLORS.divider,
        borderLeftColor:
          accent === 'red'
            ? BOXING_COLORS.red
            : accent === 'blue'
              ? BOXING_COLORS.blue
              : BOXING_COLORS.divider,
        borderLeftWidth: accent ? 3 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: BOXING_COLORS.gold }}>{icon}</span>
        <h3
          className="font-bold uppercase tracking-wider text-sm"
          style={{ color: BOXING_COLORS.textPrimary }}
        >
          {title}
        </h3>
        <ChevronRight
          size={14}
          className="ml-auto"
          style={{ color: BOXING_COLORS.textMuted }}
        />
      </div>
      <p className="text-xs" style={{ color: BOXING_COLORS.textSecondary }}>
        {blurb}
      </p>
    </button>
  );
}

function IdentitySection({
  trainer,
  userId,
  qc,
}: {
  trainer: Trainer | undefined;
  userId: string | undefined;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [name, setName] = useState(trainer?.business_name ?? '');
  useEffect(() => {
    if (trainer?.business_name) setName(trainer.business_name);
  }, [trainer?.business_name]);

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase
        .from('trainers')
        .update({ business_name: name.trim() || null })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer'] }),
  });

  return (
    <BoxingCard accent="red">
      <BoxingSectionHeader icon={<SettingsIcon size={14} />} title="Gym identity" />
      <div className="p-4 space-y-3">
        <div>
          <label
            className="block text-xs uppercase tracking-wider font-semibold mb-1"
            style={{ color: BOXING_COLORS.textSecondary }}
          >
            Gym name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Westside Boxing Club"
            className="w-full px-3 py-2 rounded text-sm focus:outline-none"
            style={{
              background: BOXING_COLORS.bgInset,
              color: BOXING_COLORS.textPrimary,
              border: `1px solid ${BOXING_COLORS.divider}`,
            }}
          />
        </div>
        <BoxingButton onClick={() => save.mutate()} disabled={save.isPending}>
          <Save size={14} /> {save.isPending ? 'Saving…' : 'Save'}
        </BoxingButton>
      </div>
    </BoxingCard>
  );
}

function TiersInfoSection() {
  return (
    <BoxingCard accent="blue">
      <BoxingSectionHeader
        icon={<Layers size={14} />}
        title="The tier system"
        hint="Fixed for V1 — these are the standard amateur boxing levels"
      />
      <div className="p-4 space-y-3">
        {FIGHTER_TIERS.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 p-3 rounded"
            style={{
              background: BOXING_COLORS.bgInset,
              border: `1px solid ${BOXING_COLORS.divider}`,
            }}
          >
            <TierBadge tier={t} />
            <p className="text-sm" style={{ color: BOXING_COLORS.textSecondary }}>
              {t.description}
            </p>
          </div>
        ))}
      </div>
    </BoxingCard>
  );
}

function WeightsInfoSection() {
  return (
    <BoxingCard>
      <BoxingSectionHeader
        icon={<Layers size={14} />}
        title="Weight classes"
        hint="USA Boxing pro / amateur standard set"
      />
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {WEIGHT_CLASSES.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between px-3 py-2 rounded"
            style={{
              background: BOXING_COLORS.bgInset,
              border: `1px solid ${BOXING_COLORS.divider}`,
            }}
          >
            <span
              className="text-sm font-bold"
              style={{ color: BOXING_COLORS.textPrimary }}
            >
              {w.label}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: BOXING_COLORS.gold }}
            >
              {w.lbsMax ? `≤ ${w.lbsMax} lb` : 'no cap'}
            </span>
          </div>
        ))}
      </div>
    </BoxingCard>
  );
}

function ProfileSection({
  trainer,
  userId,
  qc,
}: {
  trainer: Trainer;
  userId: string | undefined;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [form, setForm] = useState<Partial<Trainer>>(trainer);
  useEffect(() => setForm(trainer), [trainer]);

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase
        .from('trainers')
        .update({
          full_name: form.full_name?.trim() ?? trainer.full_name,
          phone: form.phone?.trim() || null,
          timezone: form.timezone,
          currency: form.currency,
          notify_email: form.notify_email,
        })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer'] }),
  });

  return (
    <BoxingCard>
      <BoxingSectionHeader icon={<User size={14} />} title="Coach profile" />
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PField
          label="Full name"
          value={form.full_name ?? ''}
          onChange={(v) => setForm({ ...form, full_name: v })}
        />
        <PField
          label="Phone"
          value={form.phone ?? ''}
          onChange={(v) => setForm({ ...form, phone: v })}
        />
        <PField
          label="Timezone"
          value={form.timezone ?? ''}
          onChange={(v) => setForm({ ...form, timezone: v })}
        />
        <PField
          label="Currency"
          value={form.currency ?? 'USD'}
          onChange={(v) => setForm({ ...form, currency: v })}
        />
        <div className="sm:col-span-2 flex items-center gap-2">
          <label
            className="inline-flex items-center gap-2 text-sm"
            style={{ color: BOXING_COLORS.textPrimary }}
          >
            <input
              type="checkbox"
              checked={!!form.notify_email}
              onChange={(e) => setForm({ ...form, notify_email: e.target.checked })}
            />
            Email me when a fighter books, cancels, or no-shows
          </label>
        </div>
      </div>
      <div
        className="px-4 py-3 border-t flex items-center justify-end gap-2"
        style={{ borderColor: BOXING_COLORS.divider }}
      >
        <BoxingButton onClick={() => save.mutate()} disabled={save.isPending}>
          <Save size={14} /> {save.isPending ? 'Saving…' : 'Save profile'}
        </BoxingButton>
      </div>
    </BoxingCard>
  );
}

function PField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        className="block text-xs uppercase tracking-wider font-semibold mb-1"
        style={{ color: BOXING_COLORS.textSecondary }}
      >
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded text-sm focus:outline-none"
        style={{
          background: BOXING_COLORS.bgInset,
          color: BOXING_COLORS.textPrimary,
          border: `1px solid ${BOXING_COLORS.divider}`,
        }}
      />
    </div>
  );
}

function SolarWrap({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <BoxingCard>
      <BoxingSectionHeader icon={<SettingsIcon size={14} />} title={title} />
      <div
        className="p-4"
        style={{
          background: '#FFFFFF',
          color: '#1E293B',
          borderTop: `1px solid ${BOXING_COLORS.divider}`,
        }}
      >
        {children}
      </div>
    </BoxingCard>
  );
}
