import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/PageHeader';
import { BookingSettingsCard } from '../components/BookingSettingsCard';
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
      <PageHeader title="Settings" subtitle="Your profile and business preferences." />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate();
        }}
        className="space-y-6"
      >
        <Section title="Your profile">
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

        <Section title="Preferences">
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

        <Section title="Notifications">
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

      <div className="mt-8 space-y-6">
        <StudioSettingsCard trainer={trainer} />
        <PublicProfileSettingsCard trainer={trainer} />
        <TestimonialsManagerCard trainer={trainer} />
        <BookingSettingsCard trainer={trainer} />
        <StripeStatusCard />
        <GoogleCalendarCard trainer={trainer} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="font-semibold text-slate-900 mb-4">{title}</h2>
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
