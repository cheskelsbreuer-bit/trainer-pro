// Dojo settings — full parity with the solo-trainer Settings page, plus
// dojo-specific sections at the top (identity, discipline / belt system).
// We re-use the existing settings card components from src/components/
// rather than re-implementing them — they read/write the same `trainers`
// row and would only diverge cosmetically. The dojo theme provides the
// surrounding chrome (dark sidebar, page header, section dividers) and
// the inner cards keep their existing markup for V1; a follow-up will
// fully restyle each card in dojo aesthetic.

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Save,
  CreditCard,
  CalendarDays,
  Globe,
  MapPin,
  Bell,
  LifeBuoy,
  ChevronRight,
  User,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';
import {
  DOJO_COLORS,
  BELT_SYSTEMS,
  useActiveBeltSystem,
  type BeltSystemId,
} from '../theme';
import {
  DojoPage,
  DojoPageHeader,
  DojoCard,
  DojoSectionHeader,
  DojoButton,
} from '../components/DojoUI';
import { BeltChip } from '../components/BeltChip';

// Solo-trainer settings cards, used in the additional sections below.
import { StripeStatusCard } from '../../components/StripeStatusCard';
import { GoogleCalendarCard } from '../../components/GoogleCalendarCard';
import { BookingSettingsCard } from '../../components/BookingSettingsCard';
import { PublicProfileSettingsCard } from '../../components/PublicProfileSettingsCard';
import { DirectorySettingsCard } from '../../components/DirectorySettingsCard';
import { FeedbackCard } from '../../components/FeedbackCard';

type DojoSection =
  | 'overview'
  | 'identity'
  | 'belts'
  | 'profile'
  | 'business'
  | 'payments'
  | 'booking'
  | 'calendar'
  | 'directory'
  | 'support';

export function DojoSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

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

  const [section, setSection] = useState<DojoSection>('overview');

  if (section === 'overview') {
    return (
      <DojoPage>
        <DojoPageHeader
          eyebrow="The dojo"
          title="Settings"
          subtitle="Everything that runs the dojo — identity, ranks, payments, schedule, public profile, calendar."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DojoHubTile
            onClick={() => setSection('identity')}
            icon={<SettingsIcon size={16} />}
            title="Dojo identity"
            blurb="Name, branding, sensei profile."
            accent="brand"
          />
          <DojoHubTile
            onClick={() => setSection('belts')}
            icon={<ShieldCheck size={16} />}
            title="Discipline & belt system"
            blurb="Karate / BJJ / Taekwondo / Judo / Krav Maga / MMA."
            accent="gold"
          />
          <DojoHubTile
            onClick={() => setSection('profile')}
            icon={<User size={16} />}
            title="Sensei profile"
            blurb="Name, contact, timezone, currency, notifications."
          />
          <DojoHubTile
            onClick={() => setSection('payments')}
            icon={<CreditCard size={16} />}
            title="Online payments (Stripe)"
            blurb="Accept tuition online with Stripe Connect."
          />
          <DojoHubTile
            onClick={() => setSection('booking')}
            icon={<CalendarDays size={16} />}
            title="Class booking"
            blurb="When students can book, lead time, max days ahead."
          />
          <DojoHubTile
            onClick={() => setSection('calendar')}
            icon={<CalendarDays size={16} />}
            title="Google Calendar sync"
            blurb="Mirror classes to your personal calendar."
          />
          <DojoHubTile
            onClick={() => setSection('profile')}
            icon={<Globe size={16} />}
            title="Public dojo profile"
            blurb="The page parents see before they enroll their kids."
          />
          <DojoHubTile
            onClick={() => setSection('directory')}
            icon={<MapPin size={16} />}
            title="Find-a-dojo directory listing"
            blurb="Show up in our public trainer search."
          />
          <DojoHubTile
            onClick={() => setSection('support')}
            icon={<LifeBuoy size={16} />}
            title="Help & feedback"
            blurb="Talk to us. Bugs, requests, anything."
          />
        </div>
      </DojoPage>
    );
  }

  // ── Section views ───────────────────────────────────────────────────
  return (
    <DojoPage>
      <button
        onClick={() => setSection('overview')}
        className="text-xs uppercase tracking-wider mb-4 inline-flex items-center gap-1 px-2.5 py-1.5 rounded transition-colors hover:opacity-90"
        style={{
          background: DOJO_COLORS.bgPanel,
          border: `1px solid ${DOJO_COLORS.divider}`,
          color: DOJO_COLORS.textSecondary,
        }}
      >
        ← All settings
      </button>

      {section === 'identity' && <IdentitySection trainer={trainer} userId={user?.id} qc={qc} />}
      {section === 'belts' && <BeltsSection />}
      {section === 'profile' && trainer && <ProfileSection trainer={trainer} userId={user?.id} qc={qc} />}
      {section === 'payments' && (
        <SolarCardWrap title="Online payments (Stripe)">
          <StripeStatusCard />
        </SolarCardWrap>
      )}
      {section === 'calendar' && trainer && (
        <SolarCardWrap title="Google Calendar sync">
          <GoogleCalendarCard trainer={trainer} />
        </SolarCardWrap>
      )}
      {section === 'booking' && trainer && (
        <SolarCardWrap title="Class booking">
          <BookingSettingsCard trainer={trainer} />
        </SolarCardWrap>
      )}
      {section === 'directory' && trainer && (
        <SolarCardWrap title="Find-a-dojo directory listing">
          <DirectorySettingsCard trainer={trainer} />
        </SolarCardWrap>
      )}
      {section === 'support' && (
        <SolarCardWrap title="Help & feedback">
          <FeedbackCard />
        </SolarCardWrap>
      )}
      {/* Public profile uses the existing card too, but lives under the
          "profile" hub tile slot when chosen as the secondary public-profile
          option above. */}
      {section === 'profile' && trainer && (
        <div className="mt-6">
          <SolarCardWrap title="Public dojo profile">
            <PublicProfileSettingsCard trainer={trainer} />
          </SolarCardWrap>
        </div>
      )}
    </DojoPage>
  );
}

function DojoHubTile({
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
  accent?: 'brand' | 'gold';
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-md border p-4 transition-colors hover:opacity-95"
      style={{
        background: DOJO_COLORS.bgPanel,
        borderColor: DOJO_COLORS.divider,
        borderLeftColor:
          accent === 'brand'
            ? DOJO_COLORS.brand
            : accent === 'gold'
              ? DOJO_COLORS.gold
              : DOJO_COLORS.divider,
        borderLeftWidth: accent ? 3 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: DOJO_COLORS.gold }}>{icon}</span>
        <h3
          className="font-bold uppercase tracking-wider text-sm"
          style={{ color: DOJO_COLORS.textPrimary }}
        >
          {title}
        </h3>
        <ChevronRight
          size={14}
          className="ml-auto"
          style={{ color: DOJO_COLORS.textMuted }}
        />
      </div>
      <p className="text-xs" style={{ color: DOJO_COLORS.textSecondary }}>
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
  const [dojoName, setDojoName] = useState(trainer?.business_name ?? '');
  useEffect(() => {
    if (trainer?.business_name) setDojoName(trainer.business_name);
  }, [trainer?.business_name]);

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase
        .from('trainers')
        .update({ business_name: dojoName.trim() || null })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer'] }),
  });

  return (
    <DojoCard accent="brand">
      <DojoSectionHeader icon={<SettingsIcon size={14} />} title="Dojo identity" />
      <div className="p-4 space-y-3">
        <div>
          <label
            className="block text-xs uppercase tracking-wider font-semibold mb-1"
            style={{ color: DOJO_COLORS.textSecondary }}
          >
            Dojo name
          </label>
          <input
            value={dojoName}
            onChange={(e) => setDojoName(e.target.value)}
            placeholder="e.g., Iron Wave Karate"
            className="w-full px-3 py-2 rounded text-sm focus:outline-none"
            style={{
              background: DOJO_COLORS.bgInset,
              color: DOJO_COLORS.textPrimary,
              border: `1px solid ${DOJO_COLORS.divider}`,
            }}
          />
          <p className="text-xs mt-2" style={{ color: DOJO_COLORS.textMuted }}>
            Shown in the sidebar, public profile, and student emails.
          </p>
        </div>
        <DojoButton onClick={() => save.mutate()} disabled={save.isPending}>
          <Save size={14} /> {save.isPending ? 'Saving…' : 'Save'}
        </DojoButton>
      </div>
    </DojoCard>
  );
}

function BeltsSection() {
  // Persists per-browser via localStorage; every dojo page reads this hook
  // so changing it here applies everywhere (Belts page, Students filter,
  // dashboard belt distribution, promotion logic).
  const [system, setSystem] = useActiveBeltSystem();
  return (
    <DojoCard accent="gold">
      <DojoSectionHeader
        icon={<ShieldCheck size={14} />}
        title="Discipline & belt system"
        hint="Drives the Belts page and promotion order across the dojo"
      />
      <div className="p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(BELT_SYSTEMS) as BeltSystemId[]).map((id) => {
            const active = system === id;
            return (
              <button
                key={id}
                onClick={() => setSystem(id)}
                className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                style={{
                  background: active ? DOJO_COLORS.brand : DOJO_COLORS.bgInset,
                  color: active ? DOJO_COLORS.onBrand : DOJO_COLORS.textSecondary,
                  border: `1px solid ${active ? DOJO_COLORS.brand : DOJO_COLORS.divider}`,
                }}
              >
                {BELT_SYSTEMS[id].label}
              </button>
            );
          })}
        </div>
        <p className="text-xs" style={{ color: DOJO_COLORS.textMuted }}>
          Pick your discipline — the Belts page, Students roster, and
          promotion order all switch to match. Saved on this browser.
        </p>
        <div className="space-y-1.5 mt-2">
          {BELT_SYSTEMS[system].belts.map((b) => (
            <BeltChip key={b.id} belt={b} size="md" />
          ))}
        </div>
      </div>
    </DojoCard>
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
          notify_sms: form.notify_sms,
          sms_phone: form.sms_phone?.trim() || null,
        })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer'] }),
  });

  return (
    <DojoCard>
      <DojoSectionHeader icon={<User size={14} />} title="Sensei profile" />
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ProfileField
          label="Full name"
          value={form.full_name ?? ''}
          onChange={(v) => setForm({ ...form, full_name: v })}
        />
        <ProfileField
          label="Phone"
          value={form.phone ?? ''}
          onChange={(v) => setForm({ ...form, phone: v })}
        />
        <ProfileField
          label="Timezone"
          value={form.timezone ?? ''}
          onChange={(v) => setForm({ ...form, timezone: v })}
        />
        <ProfileField
          label="Currency"
          value={form.currency ?? 'USD'}
          onChange={(v) => setForm({ ...form, currency: v })}
        />
        <div className="sm:col-span-2 flex items-center gap-2 pt-1">
          <Bell size={14} style={{ color: DOJO_COLORS.gold }} />
          <label
            className="inline-flex items-center gap-2 text-sm"
            style={{ color: DOJO_COLORS.textPrimary }}
          >
            <input
              type="checkbox"
              checked={!!form.notify_email}
              onChange={(e) => setForm({ ...form, notify_email: e.target.checked })}
            />
            Email me when a student books, cancels, or no-shows
          </label>
        </div>
      </div>
      <div
        className="px-4 py-3 border-t flex items-center justify-end gap-2"
        style={{ borderColor: DOJO_COLORS.divider }}
      >
        <DojoButton onClick={() => save.mutate()} disabled={save.isPending}>
          <Save size={14} /> {save.isPending ? 'Saving…' : 'Save profile'}
        </DojoButton>
      </div>
    </DojoCard>
  );
}

function ProfileField({
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
        style={{ color: DOJO_COLORS.textSecondary }}
      >
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded text-sm focus:outline-none"
        style={{
          background: DOJO_COLORS.bgInset,
          color: DOJO_COLORS.textPrimary,
          border: `1px solid ${DOJO_COLORS.divider}`,
        }}
      />
    </div>
  );
}

/** Wrapper that hosts an existing solo-trainer card inside a dojo-styled
 * frame. The inner card keeps its own (light) markup for V1 — a follow-up
 * will fully re-skin each card in dojo aesthetic. */
function SolarCardWrap({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <DojoCard>
      <DojoSectionHeader icon={<SettingsIcon size={14} />} title={title} />
      <div
        className="p-4"
        style={{
          background: '#FFFFFF',
          color: '#1E293B',
          borderTop: `1px solid ${DOJO_COLORS.divider}`,
        }}
      >
        {children}
      </div>
    </DojoCard>
  );
}
