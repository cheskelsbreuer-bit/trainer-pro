import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, CheckCircle2, ArrowLeft, AlertCircle, Users, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  computeAvailableSlots,
  readableErrorCode,
  type BookingSettings,
  type BusySlot,
  type ComputedSlot,
} from '../lib/booking';

interface TrainerBookingInfo {
  kind: 'trainer';
  trainer: {
    full_name: string;
    business_name: string | null;
    primary_color: string | null;
    timezone: string | null;
    currency: string | null;
    logo_url: string | null;
  };
  settings: BookingSettings;
  busy: BusySlot[];
  now: string;
}

interface StudioBookingInfo {
  kind: 'studio';
  studio: {
    name: string;
    primary_color: string | null;
    logo_url: string | null;
    intro_text: string | null;
  };
  trainers: {
    id: string;
    full_name: string;
    business_name: string | null;
    slug: string | null;
    primary_color: string | null;
    logo_url: string | null;
    booking_settings: BookingSettings;
  }[];
  busy: (BusySlot & { trainer_id: string })[];
  now: string;
}

type BookingInfo = TrainerBookingInfo | StudioBookingInfo;

export function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ComputedSlot | null>(null);
  const [confirmed, setConfirmed] = useState<{ start: Date; end: Date } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-booking', slug],
    queryFn: async (): Promise<BookingInfo | null> => {
      if (!slug) return null;
      // Use v2 RPC if it exists, fall back to v1 (for backwards-compat during migration)
      const { data, error } = await supabase.rpc('public_booking_info_v2', { p_slug: slug });
      if (error) {
        // Fall back to v1 if v2 isn't deployed yet
        const fb = await supabase.rpc('public_booking_info', { p_slug: slug });
        if (fb.error) throw error;
        return fb.data ? ({ kind: 'trainer', ...(fb.data as object) } as BookingInfo) : null;
      }
      return data as BookingInfo | null;
    },
    enabled: !!slug,
  });

  const slotsByDay = useMemo(() => {
    if (!data || data.kind !== 'trainer') return [];
    return computeAvailableSlots(data.settings, data.busy, new Date(data.now));
  }, [data]);

  if (isLoading) {
    return (
      <FullPageMessage>
        <div className="text-slate-500">Loading…</div>
      </FullPageMessage>
    );
  }

  if (isError || !data) {
    return (
      <FullPageMessage>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
            <AlertCircle size={20} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Booking unavailable</h1>
          <p className="text-sm text-slate-500 mt-1">
            This booking link is inactive, expired, or doesn't exist.
          </p>
        </div>
      </FullPageMessage>
    );
  }

  // Studio mode: show trainer picker, click → navigate to specific trainer's slug
  if (data.kind === 'studio') {
    const sColor = data.studio.primary_color || '#2d6a9f';
    return (
      <div className="min-h-screen bg-slate-50">
        <header
          className="text-white py-10 px-6"
          style={{ background: `linear-gradient(135deg, ${sColor}, ${darken(sColor, 12)})` }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
              {data.studio.logo_url ? (
                <img src={data.studio.logo_url} alt="" className="w-14 h-14 rounded-full object-cover bg-white/10" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
                  <Users size={28} />
                </div>
              )}
              <div>
                <p className="text-white/80 text-sm">Book a session at</p>
                <h1 className="text-2xl md:text-3xl font-bold">{data.studio.name}</h1>
              </div>
            </div>
            {data.studio.intro_text && (
              <p className="mt-4 text-white/90 max-w-prose">{data.studio.intro_text}</p>
            )}
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-6 py-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Choose your trainer</h2>
          {data.trainers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
              No trainers available right now. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.trainers.map((t) => {
                const tColor = t.primary_color || sColor;
                return (
                  <button
                    key={t.id}
                    onClick={() => t.slug && navigate(`/book/${t.slug}`)}
                    disabled={!t.slug}
                    className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition flex items-center gap-3 text-left disabled:opacity-50"
                  >
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: tColor }}
                      >
                        {t.full_name
                          .split(' ')
                          .map((p) => p[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join('')}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{t.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {t.business_name ?? 'Personal trainer'}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                );
              })}
            </div>
          )}
        </main>
        <footer className="text-center text-xs text-slate-400 py-8">
          Powered by Trainer Pro
        </footer>
      </div>
    );
  }

  // Trainer mode (existing flow)
  const trainerColor = data.trainer.primary_color || '#2d6a9f';
  const heading = data.trainer.business_name || data.trainer.full_name;

  if (confirmed) {
    return (
      <FullPageMessage>
        <div className="text-center max-w-md">
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: `${trainerColor}1a`, color: trainerColor }}
          >
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Booked!</h1>
          <p className="text-slate-600 mt-2">
            {heading} will see your request and confirm soon.
          </p>
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Your session
            </div>
            <div className="mt-1 font-semibold text-slate-900">
              {confirmed.start.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="text-sm text-slate-600">
              {confirmed.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              {' – '}
              {confirmed.end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-6">
            You'll get a confirmation message once {heading} approves.
          </p>
        </div>
      </FullPageMessage>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <header
        className="text-white py-10 px-6"
        style={{
          background: `linear-gradient(135deg, ${trainerColor}, ${darken(trainerColor, 12)})`,
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            {data.trainer.logo_url ? (
              <img src={data.trainer.logo_url} alt="" className="w-14 h-14 rounded-full object-cover bg-white/10" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center text-2xl font-semibold">
                {heading
                  .split(' ')
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')}
              </div>
            )}
            <div>
              <p className="text-white/80 text-sm">Book a session with</p>
              <h1 className="text-2xl md:text-3xl font-bold">{heading}</h1>
            </div>
          </div>
          {data.settings.intro_text && (
            <p className="mt-4 text-white/90 max-w-prose">{data.settings.intro_text}</p>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {selected ? (
          <BookingForm
            slug={slug!}
            slot={selected}
            color={trainerColor}
            onBack={() => setSelected(null)}
            onSuccess={(start, end) => setConfirmed({ start, end })}
          />
        ) : (
          <SlotPicker daysOfSlots={slotsByDay} color={trainerColor} onPick={setSelected} />
        )}
      </main>

      <footer className="text-center text-xs text-slate-400 py-8">
        Powered by Trainer Pro
      </footer>
    </div>
  );
}

function SlotPicker({
  daysOfSlots,
  color,
  onPick,
}: {
  daysOfSlots: { day: Date; slots: ComputedSlot[] }[];
  color: string;
  onPick: (s: ComputedSlot) => void;
}) {
  if (daysOfSlots.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
        <Calendar className="mx-auto text-slate-300 mb-3" size={36} />
        <h2 className="font-semibold text-slate-900">No times available right now</h2>
        <p className="text-sm text-slate-500 mt-1">Please check back soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {daysOfSlots.map((d) => (
        <section key={d.day.toISOString()} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-3">
            {d.day.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          <div className="flex flex-wrap gap-2">
            {d.slots.map((s) => (
              <button
                key={s.start.toISOString()}
                onClick={() => onPick(s)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:text-white hover:shadow-md transition"
                style={{
                  // hover styled inline: rely on CSS variables
                  // (Tailwind doesn't compose hover bg from a runtime color)
                  ['--hoverBg' as string]: color,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = color)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              >
                {s.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function BookingForm({
  slug,
  slot,
  color,
  onBack,
  onSuccess,
}: {
  slug: string;
  slot: ComputedSlot;
  color: string;
  onBack: () => void;
  onSuccess: (start: Date, end: Date) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('public_booking_request', {
        p_slug: slug,
        p_email: email,
        p_full_name: name,
        p_phone: phone || null,
        p_starts_at: slot.start.toISOString(),
        p_duration_min: Math.round((slot.end.getTime() - slot.start.getTime()) / 60_000),
        p_notes: notes || null,
      });
      if (error) {
        // Postgres functions raise with code P0001 and message text we set
        throw new Error(readableErrorCode(error.message));
      }
      return data;
    },
    onSuccess: () => onSuccess(slot.start, slot.end),
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"
      >
        <ArrowLeft size={14} /> Pick a different time
      </button>

      <div className="bg-slate-50 rounded-xl p-4 mb-5 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: color }}
        >
          <Clock size={18} />
        </div>
        <div>
          <div className="font-semibold text-slate-900">
            {slot.start.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <div className="text-sm text-slate-600">
            {slot.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            {' – '}
            {slot.end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="space-y-3"
      >
        <Field label="Your name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="Email" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="Phone (optional)">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="Anything I should know? (optional)">
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Goals, injuries, preferences…"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        {submit.error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
            <MapPin size={14} className="mt-0.5 flex-shrink-0" />
            {(submit.error as Error).message}
          </div>
        )}

        <button
          type="submit"
          disabled={submit.isPending || !name.trim() || !email.trim()}
          className="w-full px-4 py-2.5 text-white font-medium rounded-lg shadow-sm disabled:opacity-50"
          style={{ backgroundColor: color }}
        >
          {submit.isPending ? 'Booking…' : 'Confirm booking'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function FullPageMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">{children}</div>
    </div>
  );
}

// Naive HSL-darken for the gradient header. Color must be a 6-char hex like "#2d6a9f".
function darken(hex: string, percent: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - Math.round(255 * (percent / 100)));
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - Math.round(255 * (percent / 100)));
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - Math.round(255 * (percent / 100)));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
