import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Settings2, Bell, Building2, Globe, Star, Calendar, CreditCard, CalendarDays, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/PageHeader';
import { BookingSettingsCard } from '../components/BookingSettingsCard';
import { DirectorySettingsCard } from '../components/DirectorySettingsCard';
import { FeedbackCard } from '../components/FeedbackCard';
import { AdminRepliesCard } from '../components/AdminRepliesCard';
import { GoogleCalendarCard } from '../components/GoogleCalendarCard';
import { StudioSettingsCard } from '../components/StudioSettingsCard';
import { StripeStatusCard } from '../components/StripeStatusCard';
import { PublicProfileSettingsCard } from '../components/PublicProfileSettingsCard';
import { TestimonialsManagerCard } from '../components/TestimonialsManagerCard';
import type { Trainer } from '../lib/database.types';

export function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Trainer>>({});
  const [saved, setSaved] = useState(false);

  const { data: trainer } = useQuery({
    queryKey: ['trainer', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('trainers').select('*').eq('id', user!.id).single();
      if (error) throw error;
      return data as Trainer;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (trainer) setForm(trainer);
  }, [trainer]);

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('trainers')
        .update({
          full_name: form.full_name?.trim(),
          business_name: form.business_name?.trim() || null,
          phone: form.phone?.trim() || null,
          timezone: form.timezone,
          currency: form.currency,
          primary_color: form.primary_color,
          notify_email: form.notify_email,
          notify_sms: form.notify_sms,
          sms_phone: form.sms_phone?.trim() || null,
        })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', user?.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (!trainer) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Everything that controls your business — your profile, what clients see, how you get paid, and how we tell you about new sessions."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate();
        }}
        className="space-y-6"
      >
        <Section
          icon={<User size={18} />}
          color="blue"
          title="About you"
          description="Your name, business name, and contact info. This shows up on your booking page, in receipts, and on your client portal."
        >
          <Field label="Full name">
            <input
              type="text"
              value={form.full_name ?? ''}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Business name">
            <input
              type="text"
              value={form.business_name ?? ''}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={trainer.email ?? user?.email ?? ''}
              disabled
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500"
            />
          </Field>
        </Section>

        <Section
          icon={<Settings2 size={18} />}
          color="purple"
          title="Preferences"
          description="Time zone we use for sessions, currency for payments, and your brand color (used on buttons and your client portal)."
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Timezone">
              <input
                type="text"
                value={form.timezone ?? ''}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="America/New_York"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="Currency">
              <select
                value={form.currency ?? 'USD'}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="ILS">ILS (₪)</option>
              </select>
            </Field>
          </div>
          <Field label="Brand color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primary_color ?? '#2d6a9f'}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="h-10 w-16 border border-slate-300 rounded-lg cursor-pointer"
              />
              <span className="text-sm text-slate-500 font-mono">{form.primary_color}</span>
            </div>
          </Field>
        </Section>

        <Section
          icon={<Bell size={18} />}
          color="amber"
          title="What we email you"
          description="We can send you a daily morning email with today's sessions. Optional SMS reminders for clients are coming soon."
        >
          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={form.notify_email ?? true}
              onChange={(e) => setForm({ ...form, notify_email: e.target.checked })}
              className="w-4 h-4"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">Email reminders</p>
              <p className="text-xs text-slate-500">Send me an email summary each morning of today's sessions.</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={form.notify_sms ?? false}
              onChange={(e) => setForm({ ...form, notify_sms: e.target.checked })}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">SMS reminders (Phase 2)</p>
              <p className="text-xs text-slate-500">Text my clients before each session. Requires Twilio setup.</p>
            </div>
          </label>
          {form.notify_sms && (
            <Field label="SMS sender phone">
              <input
                type="tel"
                value={form.sms_phone ?? ''}
                onChange={(e) => setForm({ ...form, sms_phone: e.target.value })}
                placeholder="+1 555 555 5555"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          )}
        </Section>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={update.isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-2 rounded-lg font-medium"
          >
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-sm text-emerald-600">✓ Saved</span>}
        </div>
      </form>

      <div className="mt-10">
        <div className="border-t border-slate-200 pt-8 mb-6">
          <h2 className="text-lg font-bold text-slate-900">Set up the rest of your business</h2>
          <p className="text-sm text-slate-500 mt-1">
            These are all optional. Skip any you don't need — you can come back later.
          </p>
        </div>
        <div className="space-y-6">
          <CardWrapper
            icon={<Building2 size={18} />}
            color="cyan"
            title="Studio mode"
            description="If you have other trainers working under your business, invite them here. Each gets their own login but you all share clients."
          >
            <StudioSettingsCard trainer={trainer} />
          </CardWrapper>

          <CardWrapper
            icon={<Globe size={18} />}
            color="indigo"
            title="Your public profile"
            description="A free marketing page at trainerpro.coach/p/your-name. Add your photo, bio, and gallery so people can find you."
          >
            <PublicProfileSettingsCard trainer={trainer} />
          </CardWrapper>

          <CardWrapper
            icon={<MapPin size={18} />}
            color="amber"
            title="Trainer directory listing"
            description="Anyone visiting trainerpro.coach/find-trainers can search for trainers by city and specialty. Set your service area to attract local clients — or hide your listing if you don't want new leads."
          >
            <DirectorySettingsCard trainer={trainer} />
          </CardWrapper>

          <CardWrapper
            icon={<Star size={18} />}
            color="pink"
            title="Testimonials"
            description="Quotes from happy clients. They show up on your public profile to help convince new people to book."
          >
            <TestimonialsManagerCard trainer={trainer} />
          </CardWrapper>

          <CardWrapper
            icon={<Calendar size={18} />}
            color="emerald"
            title="Booking page"
            description="Lets clients book sessions themselves. Set the hours you're available and how long sessions are."
          >
            <BookingSettingsCard trainer={trainer} />
          </CardWrapper>

          <CardWrapper
            icon={<CreditCard size={18} />}
            color="rose"
            title="Card payments (Stripe)"
            description="Connect Stripe to take card payments. Without this, you can still log cash and Venmo/Zelle payments by hand."
          >
            <StripeStatusCard />
          </CardWrapper>

          <CardWrapper
            icon={<CalendarDays size={18} />}
            color="blue"
            title="Google Calendar sync"
            description="Optional: every session you log here automatically appears in your personal Google Calendar. Coming this week."
          >
            <GoogleCalendarCard trainer={trainer} />
          </CardWrapper>
        </div>

        <div className="border-t border-slate-200 pt-8 mt-10 mb-6">
          <h2 className="text-lg font-bold text-slate-900">Talk to us</h2>
          <p className="text-sm text-slate-500 mt-1">
            Your feedback shapes what we build next — and we reply.
          </p>
        </div>
        <div className="space-y-5">
          <AdminRepliesCard />
          <FeedbackCard />
        </div>
      </div>
    </div>
  );
}

function CardWrapper({
  icon,
  color,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  color: SectionColor;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${COLOR_CLASSES[color]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="ml-12">{children}</div>
    </div>
  );
}

type SectionColor = 'blue' | 'purple' | 'amber' | 'cyan' | 'indigo' | 'pink' | 'emerald' | 'rose';

const COLOR_CLASSES: Record<SectionColor, string> = {
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  amber: 'bg-amber-100 text-amber-600',
  cyan: 'bg-cyan-100 text-cyan-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  pink: 'bg-pink-100 text-pink-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  rose: 'bg-rose-100 text-rose-600',
};

function Section({
  icon,
  color,
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  color?: SectionColor;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <header className="flex items-start gap-3 mb-4">
        {icon && color && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${COLOR_CLASSES[color]}`}>
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
