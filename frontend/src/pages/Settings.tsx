import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Bell,
  Building2,
  Globe,
  Star,
  Calendar,
  CreditCard,
  CalendarDays,
  MapPin,
  Wrench,
  ChevronRight,
  ArrowLeft,
  Briefcase,
  Megaphone,
  Wallet,
  LifeBuoy,
  SlidersHorizontal,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/PageHeader';
import { BookingSettingsCard } from '../components/BookingSettingsCard';
import { DirectorySettingsCard } from '../components/DirectorySettingsCard';
import { SpecialtyToolkit } from '../components/SpecialtyToolkit';
import { FeedbackCard } from '../components/FeedbackCard';
import { AdminRepliesCard } from '../components/AdminRepliesCard';
import { GoogleCalendarCard } from '../components/GoogleCalendarCard';
import { StudioSettingsCard } from '../components/StudioSettingsCard';
import { StripeStatusCard } from '../components/StripeStatusCard';
import { PublicProfileSettingsCard } from '../components/PublicProfileSettingsCard';
import { TestimonialsManagerCard } from '../components/TestimonialsManagerCard';
import { CustomizeStudio } from '../components/CustomizeStudio';
import type { Trainer } from '../lib/database.types';

type Section = 'business' | 'public' | 'booking' | 'customize' | 'support' | null;

export function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Trainer>>({});
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState<Section>(null);

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

  // ─── Hub view ──────────────────────────────────────────────────────
  if (section === null) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <PageHeader
          title="Settings"
          subtitle="Pick a category to set up. Everything's optional — set up what you need now, come back for the rest."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HubTile
            onClick={() => setSection('customize')}
            icon={<SlidersHorizontal size={22} />}
            color="violet"
            title="Customize your app"
            description="Turn features on/off, pick your colors & fonts, and arrange your menu. This is what makes your app yours."
            items={['Features (all your disciplines)', 'Colors, fonts & theme', 'Menu order']}
          />
          <HubTile
            onClick={() => setSection('business')}
            icon={<Briefcase size={22} />}
            color="blue"
            title="Your business"
            description="Profile, branding, notifications, studio team."
            items={['About you', 'Notifications', 'Studio mode']}
          />
          <HubTile
            onClick={() => setSection('public')}
            icon={<Megaphone size={22} />}
            color="indigo"
            title="What clients see"
            description="Your public website, directory listing, testimonials, and the toolkit unlocked by your specialties."
            items={[
              'Public profile',
              'Directory listing & specialties',
              'Your toolkit (mini-apps)',
              'Testimonials',
            ]}
          />
          <HubTile
            onClick={() => setSection('booking')}
            icon={<Wallet size={22} />}
            color="amber"
            title="Booking & money"
            description="How clients book and how you get paid."
            items={['Booking page', 'Stripe payments', 'Google Calendar sync']}
          />
          <HubTile
            onClick={() => setSection('support')}
            icon={<LifeBuoy size={22} />}
            color="rose"
            title="Talk to us"
            description="Send feedback, see replies from the Trainer Pro team."
            items={['Messages from Trainer Pro', 'Send feedback']}
          />
        </div>
      </div>
    );
  }

  // ─── Section drilldown ─────────────────────────────────────────────
  const sectionMeta: Record<Exclude<Section, null>, { title: string; sub: string }> = {
    customize: {
      title: 'Customize your app',
      sub: 'Features, design, and layout — build your exact app.',
    },
    business: {
      title: 'Your business',
      sub: 'Your name, business name, contact info, branding, and team.',
    },
    public: {
      title: 'What clients see',
      sub: 'Your public-facing presence on Trainer Pro.',
    },
    booking: {
      title: 'Booking & money',
      sub: 'Self-serve booking, card payments, calendar integration.',
    },
    support: {
      title: 'Talk to us',
      sub: 'Your feedback shapes what we build next — and we reply.',
    },
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button
        type="button"
        onClick={() => setSection(null)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft size={14} /> Back to Settings
      </button>
      <PageHeader title={sectionMeta[section].title} subtitle={sectionMeta[section].sub} />

      {section === 'customize' && (
        <CustomizeStudio
          templateSlugs={trainer.template_slugs?.length ? trainer.template_slugs : ['solo_trainer']}
          accent={trainer.primary_color || '#2563eb'}
          navItems={[
            { to: '/', label: 'Dashboard' },
            { to: '/clients', label: 'Clients' },
            { to: '/sessions', label: 'Sessions' },
            { to: '/payments', label: 'Payments' },
            { to: '/workouts', label: 'Workouts' },
            { to: '/progress', label: 'Progress' },
            { to: '/settings', label: 'Settings' },
          ]}
        />
      )}

      {section === 'business' && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate();
            }}
            className="space-y-6"
          >
            <CardWrapper
              icon={<User size={18} />}
              color="blue"
              title="About you"
              description="Your name, business name, and contact info. This shows up on your booking page, in receipts, and on your client portal."
            >
              <div className="space-y-4">
                <Field label="Full name">
                  <input
                    type="text"
                    value={form.full_name ?? ''}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Field>
                <Field label="Business name (optional)">
                  <input
                    type="text"
                    value={form.business_name ?? ''}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Field>
                <Field label="Phone (optional)">
                  <input
                    type="tel"
                    value={form.phone ?? ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Field>
                <Field label="Brand color">
                  <input
                    type="color"
                    value={form.primary_color ?? '#2563eb'}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="h-10 w-20 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </Field>
              </div>
            </CardWrapper>

            <CardWrapper
              icon={<Bell size={18} />}
              color="amber"
              title="Notifications"
              description="How we tell you about new bookings, cancellations, and reminders. Email is on by default."
            >
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.notify_email}
                    onChange={(e) => setForm({ ...form, notify_email: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-900">
                    Email notifications
                  </span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.notify_sms}
                    onChange={(e) => setForm({ ...form, notify_sms: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-900">SMS notifications</span>
                </label>
                {form.notify_sms && (
                  <Field label="SMS phone number">
                    <input
                      type="tel"
                      value={form.sms_phone ?? ''}
                      onChange={(e) => setForm({ ...form, sms_phone: e.target.value })}
                      placeholder="+1 555 555 5555"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </Field>
                )}
              </div>
            </CardWrapper>

            <div className="flex items-center gap-3 pt-2 ml-12">
              <button
                type="submit"
                disabled={update.isPending}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-2 rounded-lg font-medium"
              >
                {update.isPending ? 'Saving…' : 'Save profile changes'}
              </button>
              {saved && <span className="text-sm text-emerald-600">✓ Saved</span>}
            </div>
          </form>

          <CardWrapper
            icon={<Building2 size={18} />}
            color="cyan"
            title="Studio mode"
            description="If you have other trainers working under your business, invite them here. Each gets their own login but you all share clients."
          >
            <StudioSettingsCard trainer={trainer} />
          </CardWrapper>
        </div>
      )}

      {section === 'public' && (
        <div className="space-y-6">
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
            description="Anyone visiting trainerpro.coach/find-trainers can search for trainers by city and specialty. Set your service area + pick what you train; uncheck to hide."
          >
            <DirectorySettingsCard trainer={trainer} />
          </CardWrapper>

          <CardWrapper
            icon={<Wrench size={18} />}
            color="emerald"
            title="Your toolkit"
            description="The mini-apps unlocked by the specialties you picked above. Coming-soon tools have a thumbs-up button — clicking it tells us to prioritize that one for you."
          >
            <SpecialtyToolkit trainer={trainer} />
          </CardWrapper>

          <CardWrapper
            icon={<Star size={18} />}
            color="pink"
            title="Testimonials"
            description="Quotes from happy clients. They show up on your public profile to help convince new people to book."
          >
            <TestimonialsManagerCard trainer={trainer} />
          </CardWrapper>
        </div>
      )}

      {section === 'booking' && (
        <div className="space-y-6">
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
            description="Optional: every session you log here automatically appears in your personal Google Calendar."
          >
            <GoogleCalendarCard trainer={trainer} />
          </CardWrapper>
        </div>
      )}

      {section === 'support' && (
        <div className="space-y-5">
          <AdminRepliesCard />
          <FeedbackCard />
        </div>
      )}
    </div>
  );
}

/* ─────────────── Hub tile ─────────────── */
function HubTile({
  icon,
  color,
  title,
  description,
  items,
  onClick,
}: {
  icon: React.ReactNode;
  color: 'blue' | 'indigo' | 'amber' | 'rose' | 'violet';
  title: string;
  description: string;
  items: string[];
  onClick: () => void;
}) {
  const colors: Record<string, string> = {
    blue: 'from-blue-50 to-sky-50 border-blue-200 text-blue-700',
    indigo: 'from-indigo-50 to-violet-50 border-indigo-200 text-indigo-700',
    amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-700',
    rose: 'from-rose-50 to-pink-50 border-rose-200 text-rose-700',
    violet: 'from-violet-50 to-fuchsia-50 border-violet-200 text-violet-700',
  };
  const iconBg: Record<string, string> = {
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-600',
    amber: 'bg-amber-500',
    rose: 'bg-rose-600',
    violet: 'bg-violet-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group bg-gradient-to-br ${colors[color]} border-2 rounded-2xl p-6 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all`}
    >
      <div className="flex items-start gap-4 mb-3">
        <div
          className={`w-12 h-12 rounded-xl ${iconBg[color]} text-white flex items-center justify-center shadow-md flex-shrink-0`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
            {title}
            <ChevronRight
              size={16}
              className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
            />
          </h3>
          <p className="text-sm text-slate-600 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <ul className="space-y-1 ml-1 mt-2">
        {items.map((item) => (
          <li
            key={item}
            className="text-xs text-slate-600 flex items-center gap-1.5 before:content-['·'] before:text-slate-400 before:font-bold"
          >
            {item}
          </li>
        ))}
      </ul>
    </button>
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
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${COLOR_CLASSES[color]}`}
        >
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
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  amber: 'bg-amber-100 text-amber-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  pink: 'bg-pink-100 text-pink-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  rose: 'bg-rose-100 text-rose-700',
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
