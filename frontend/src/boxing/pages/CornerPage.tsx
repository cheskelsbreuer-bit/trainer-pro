// The Corner — settings. Sectioned as a magazine table-of-contents
// at the top; selected section drops below it. NOT the dojo's
// 3-column tile grid pattern.

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';
import { C, DISPLAY_FONT, FIGHTER_TIERS, WEIGHT_CLASSES } from '../theme';
import { StripeStatusCard } from '../../components/StripeStatusCard';
import { GoogleCalendarCard } from '../../components/GoogleCalendarCard';
import { BookingSettingsCard } from '../../components/BookingSettingsCard';
import { PublicProfileSettingsCard } from '../../components/PublicProfileSettingsCard';
import { DirectorySettingsCard } from '../../components/DirectorySettingsCard';
import { FeedbackCard } from '../../components/FeedbackCard';

type Section =
  | 'gym'
  | 'coach'
  | 'tiers'
  | 'weights'
  | 'payments'
  | 'booking'
  | 'calendar'
  | 'profile'
  | 'directory'
  | 'help';

const TOC: { id: Section; label: string; blurb: string }[] = [
  { id: 'gym', label: 'Gym Identity', blurb: 'Name, branding.' },
  { id: 'coach', label: 'Coach Profile', blurb: 'You — your timezone, currency, alerts.' },
  { id: 'tiers', label: 'Tier System', blurb: 'Rec / Amateur / Pro — fixed.' },
  { id: 'weights', label: 'Weight Classes', blurb: 'USA Boxing divisions on file.' },
  { id: 'payments', label: 'Stripe Payments', blurb: 'Take dues online.' },
  { id: 'booking', label: 'Booking Window', blurb: 'When fighters can book sessions.' },
  { id: 'calendar', label: 'Google Calendar', blurb: 'Mirror to your personal calendar.' },
  { id: 'profile', label: 'Public Gym Page', blurb: 'What new fighters see.' },
  { id: 'directory', label: 'Public Directory', blurb: 'Find-a-gym listing.' },
  { id: 'help', label: 'Help & Feedback', blurb: 'Bugs, requests.' },
];

export function CornerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>('gym');

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

  return (
    <div>
      <div
        className="px-4 sm:px-8 py-8 border-b"
        style={{ background: C.inkSoft, borderColor: C.rule }}
      >
        <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.red }}>
          Behind the scenes
        </p>
        <h1
          className="font-black uppercase mt-1"
          style={{
            fontFamily: DISPLAY_FONT,
            color: C.text,
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            letterSpacing: '0.04em',
            lineHeight: 0.9,
          }}
        >
          The Corner
        </h1>
      </div>

      {/* Table of contents — magazine style */}
      <div className="px-4 sm:px-8 py-6 border-b" style={{ borderColor: C.rule }}>
        <p className="text-[10px] uppercase tracking-[0.5em] mb-3" style={{ color: C.textDim }}>
          Contents
        </p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
          {TOC.map((t, i) => {
            const active = section === t.id;
            return (
              <li key={t.id} className="border-b py-2.5" style={{ borderColor: C.rule }}>
                <button
                  onClick={() => setSection(t.id)}
                  className="w-full text-left flex items-baseline justify-between gap-3"
                >
                  <span
                    className="font-bold uppercase text-sm"
                    style={{
                      fontFamily: DISPLAY_FONT,
                      color: active ? C.red : C.text,
                      letterSpacing: '0.08em',
                    }}
                  >
                    <span style={{ color: C.textFaint }}>{String(i + 1).padStart(2, '0')}.</span> {t.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: C.textDim }}>
                    {t.blurb}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Selected section */}
      <div className="px-4 sm:px-8 py-8">
        {section === 'gym' && <GymSection trainer={trainer} userId={user?.id} qc={qc} />}
        {section === 'coach' && trainer && <CoachSection trainer={trainer} userId={user?.id} qc={qc} />}
        {section === 'tiers' && <TiersSection />}
        {section === 'weights' && <WeightsSection />}
        {section === 'payments' && <SolarWrap><StripeStatusCard /></SolarWrap>}
        {section === 'calendar' && trainer && <SolarWrap><GoogleCalendarCard trainer={trainer} /></SolarWrap>}
        {section === 'booking' && trainer && <SolarWrap><BookingSettingsCard trainer={trainer} /></SolarWrap>}
        {section === 'profile' && trainer && <SolarWrap><PublicProfileSettingsCard trainer={trainer} /></SolarWrap>}
        {section === 'directory' && trainer && <SolarWrap><DirectorySettingsCard trainer={trainer} /></SolarWrap>}
        {section === 'help' && <SolarWrap><FeedbackCard /></SolarWrap>}
      </div>
    </div>
  );
}

function GymSection({
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
    <div className="max-w-xl">
      <SectionTitle title="Gym identity" />
      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: C.textDim }}>
          Gym name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Westside Boxing Club"
          className="w-full px-3 py-2 text-sm focus:outline-none"
          style={{ background: C.inkSoft, color: C.text, border: `1px solid ${C.rule}` }}
        />
      </label>
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="inline-flex items-center gap-2 mt-4 px-4 py-2 font-bold uppercase tracking-[0.2em] text-xs"
        style={{ fontFamily: DISPLAY_FONT, background: C.red, color: '#FFF' }}
      >
        <Save size={13} /> {save.isPending ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

function CoachSection({
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
    <div className="max-w-2xl">
      <SectionTitle title="Coach profile" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="Full name"
          value={form.full_name ?? ''}
          onChange={(v) => setForm({ ...form, full_name: v })}
        />
        <Field
          label="Phone"
          value={form.phone ?? ''}
          onChange={(v) => setForm({ ...form, phone: v })}
        />
        <Field
          label="Timezone"
          value={form.timezone ?? ''}
          onChange={(v) => setForm({ ...form, timezone: v })}
        />
        <Field
          label="Currency"
          value={form.currency ?? 'USD'}
          onChange={(v) => setForm({ ...form, currency: v })}
        />
        <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm" style={{ color: C.text }}>
          <input
            type="checkbox"
            checked={!!form.notify_email}
            onChange={(e) => setForm({ ...form, notify_email: e.target.checked })}
          />
          Email me when a fighter books, cancels, or no-shows
        </label>
      </div>
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="inline-flex items-center gap-2 mt-4 px-4 py-2 font-bold uppercase tracking-[0.2em] text-xs"
        style={{ fontFamily: DISPLAY_FONT, background: C.red, color: '#FFF' }}
      >
        <Save size={13} /> {save.isPending ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}

function TiersSection() {
  return (
    <div className="max-w-2xl">
      <SectionTitle title="The pipeline" />
      <ol>
        {FIGHTER_TIERS.map((t, i) => (
          <li
            key={t.id}
            className="grid grid-cols-[40px_140px_1fr] gap-4 items-baseline py-3 border-b"
            style={{ borderColor: C.rule }}
          >
            <span
              className="font-black"
              style={{
                fontFamily: DISPLAY_FONT,
                color: C.textFaint,
                fontSize: '2rem',
                lineHeight: 1,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              className="font-black uppercase"
              style={{
                fontFamily: DISPLAY_FONT,
                color: t.color,
                letterSpacing: '0.15em',
                fontSize: '1rem',
              }}
            >
              {t.label}
            </span>
            <span className="text-sm" style={{ color: C.textDim }}>
              {t.description}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function WeightsSection() {
  return (
    <div className="max-w-3xl">
      <SectionTitle title="Weight classes — USA Boxing" />
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
        {WEIGHT_CLASSES.map((w, i) => (
          <li
            key={w.id}
            className="flex items-baseline justify-between border-b py-2 text-sm"
            style={{ borderColor: C.rule }}
          >
            <span style={{ color: C.text }}>
              <span style={{ color: C.textFaint }}>{String(i + 1).padStart(2, '0')}.</span>{' '}
              <span className="font-bold uppercase" style={{ fontFamily: DISPLAY_FONT, letterSpacing: '0.05em' }}>
                {w.label}
              </span>
            </span>
            <span className="font-mono" style={{ color: C.beltGold }}>
              {w.lbsMax ? `≤ ${w.lbsMax} lb` : 'no cap'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2
      className="font-black uppercase mb-4 pb-2 border-b"
      style={{
        fontFamily: DISPLAY_FONT,
        color: C.text,
        fontSize: '1.5rem',
        letterSpacing: '0.08em',
        borderColor: C.rule,
      }}
    >
      {title}
    </h2>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: C.textDim }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm focus:outline-none"
        style={{ background: C.inkSoft, color: C.text, border: `1px solid ${C.rule}` }}
      />
    </label>
  );
}

function SolarWrap({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-4"
      style={{
        background: '#FFFFFF',
        color: '#1E293B',
        border: `1px solid ${C.rule}`,
      }}
    >
      {children}
    </div>
  );
}
