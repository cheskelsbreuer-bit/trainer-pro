import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Dumbbell,
  ArrowRight,
  ArrowLeft,
  Users,
  Target,
  Palette,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Trainer } from '../lib/database.types';

type ClientCount = '0' | '1-5' | '6-15' | '16-30' | '30+';
type Specialty =
  | 'strength'
  | 'weight_loss'
  | 'general_fitness'
  | 'athletic_performance'
  | 'mobility_rehab'
  | 'other';

interface Props {
  trainer: Trainer;
}

const TOTAL_STEPS = 5;

export function OnboardingWizard({ trainer }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(trainer.full_name ?? '');
  const [businessName, setBusinessName] = useState(trainer.business_name ?? '');
  const [clientCount, setClientCount] = useState<ClientCount | null>(
    (trainer.client_count_estimate as ClientCount | null) ?? null,
  );
  const [specialty, setSpecialty] = useState<Specialty | null>(
    (trainer.specialty as Specialty | null) ?? null,
  );
  const [brand, setBrand] = useState(trainer.primary_color ?? '#2563eb');

  const finish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('trainers')
        .update({
          full_name: fullName.trim() || trainer.full_name,
          business_name: businessName.trim() || null,
          client_count_estimate: clientCount,
          specialty,
          primary_color: brand,
          onboarded_at: new Date().toISOString(),
        })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', user?.id] });
    },
  });

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const canAdvance = (() => {
    if (step === 2) return fullName.trim().length > 0;
    if (step === 3) return clientCount !== null;
    if (step === 4) return specialty !== null;
    return true;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}% set up</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 rounded-full"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-900/10 p-8 md:p-12 border border-slate-100">
          {step === 1 && <StepWelcome />}
          {step === 2 && (
            <StepBusiness
              fullName={fullName}
              setFullName={setFullName}
              businessName={businessName}
              setBusinessName={setBusinessName}
            />
          )}
          {step === 3 && (
            <StepClientCount value={clientCount} onChange={setClientCount} />
          )}
          {step === 4 && <StepSpecialty value={specialty} onChange={setSpecialty} />}
          {step === 5 && (
            <StepBrand
              brand={brand}
              setBrand={setBrand}
              businessName={businessName || fullName || 'Your business'}
            />
          )}

          {/* error from save */}
          {finish.error && (
            <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              Couldn't save: {(finish.error as Error).message}
            </div>
          )}

          {/* nav buttons */}
          <div className="mt-9 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 1 || finish.isPending}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                step === 1
                  ? 'invisible'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ArrowLeft size={14} /> Back
            </button>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={next}
                disabled={!canAdvance}
                className="flex items-center gap-1.5 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:from-slate-300 disabled:to-slate-300 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-blue-600/30 transition"
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => finish.mutate()}
                disabled={finish.isPending}
                className="flex items-center gap-1.5 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/30 transition"
              >
                {finish.isPending ? 'Setting up…' : <>Take me to my dashboard <ArrowRight size={14} /></>}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          You can change all of these later in Settings.
        </p>
      </div>
    </div>
  );
}

/* ─────────────── Step 1: Welcome ─────────────── */
function StepWelcome() {
  return (
    <div className="text-center">
      <div className="inline-flex w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white items-center justify-center mb-5 shadow-xl shadow-blue-600/40">
        <Dumbbell size={42} strokeWidth={2.5} />
      </div>
      <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold mb-4">
        <Sparkles size={12} /> Welcome to Trainer Pro
      </div>
      <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
        Let's set up your business{' '}
        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          in 2 minutes.
        </span>
      </h1>
      <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
        A few quick questions and we'll have your dashboard ready. You can skip nothing — just
        the basics. Promise.
      </p>
      <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
        {[
          { icon: <Users size={16} />, label: 'Your business' },
          { icon: <Target size={16} />, label: 'What you do' },
          { icon: <Palette size={16} />, label: 'Your brand' },
          { icon: <CheckCircle2 size={16} />, label: 'Ready to go' },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 rounded-xl text-slate-600"
          >
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-600">
              {s.icon}
            </div>
            <span className="text-[11px] font-medium">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Step 2: Business basics ─────────────── */
function StepBusiness({
  fullName,
  setFullName,
  businessName,
  setBusinessName,
}: {
  fullName: string;
  setFullName: (v: string) => void;
  businessName: string;
  setBusinessName: (v: string) => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Step 1"
        title="What should clients call you?"
        subtitle="This shows up on your booking page and in receipts."
      />
      <div className="space-y-4 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Your name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Trainer"
            autoFocus
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Business name <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Jane Strong Coaching"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500 mt-1.5">
            Leave blank if you train under your own name.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Step 3: Client count ─────────────── */
function StepClientCount({
  value,
  onChange,
}: {
  value: ClientCount | null;
  onChange: (v: ClientCount) => void;
}) {
  const options: { val: ClientCount; label: string; sub: string }[] = [
    { val: '0', label: 'Just starting out', sub: 'No clients yet' },
    { val: '1-5', label: '1–5 clients', sub: 'Building momentum' },
    { val: '6-15', label: '6–15 clients', sub: 'Got a steady book' },
    { val: '16-30', label: '16–30 clients', sub: 'Full-time grind' },
    { val: '30+', label: '30+ clients', sub: 'Studio-level' },
  ];
  return (
    <div>
      <StepHeader
        eyebrow="Step 2"
        title="How many clients do you train right now?"
        subtitle="Just a rough number. Helps us suggest the right setup."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto">
        {options.map((o) => (
          <button
            key={o.val}
            type="button"
            onClick={() => onChange(o.val)}
            className={`text-left p-4 rounded-xl border-2 transition ${
              value === o.val
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900">{o.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{o.sub}</div>
              </div>
              {value === o.val && (
                <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Step 4: Specialty ─────────────── */
function StepSpecialty({
  value,
  onChange,
}: {
  value: Specialty | null;
  onChange: (v: Specialty) => void;
}) {
  const options: { val: Specialty; label: string; emoji: string }[] = [
    { val: 'strength', label: 'Strength training', emoji: '🏋️' },
    { val: 'weight_loss', label: 'Weight loss', emoji: '⚖️' },
    { val: 'general_fitness', label: 'General fitness', emoji: '💪' },
    { val: 'athletic_performance', label: 'Athletic performance', emoji: '🏃' },
    { val: 'mobility_rehab', label: 'Mobility & rehab', emoji: '🧘' },
    { val: 'other', label: 'A bit of everything', emoji: '✨' },
  ];
  return (
    <div>
      <StepHeader
        eyebrow="Step 3"
        title="What do you mostly train people for?"
        subtitle="Pick the closest fit. We'll seed your workout templates."
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-w-2xl mx-auto">
        {options.map((o) => (
          <button
            key={o.val}
            type="button"
            onClick={() => onChange(o.val)}
            className={`p-4 rounded-xl border-2 transition text-center ${
              value === o.val
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="text-3xl mb-1.5">{o.emoji}</div>
            <div className="text-sm font-medium text-slate-800">{o.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Step 5: Brand color ─────────────── */
function StepBrand({
  brand,
  setBrand,
  businessName,
}: {
  brand: string;
  setBrand: (v: string) => void;
  businessName: string;
}) {
  const presets = [
    '#2563eb', // blue
    '#0ea5e9', // sky
    '#0d9488', // teal
    '#16a34a', // green
    '#ca8a04', // amber
    '#ea580c', // orange
    '#dc2626', // red
    '#db2777', // pink
    '#7c3aed', // violet
    '#1e293b', // slate dark
  ];
  return (
    <div>
      <StepHeader
        eyebrow="Step 4"
        title="Pick your brand color."
        subtitle="Buttons, highlights, and your client portal will use this."
      />

      {/* Live preview */}
      <div
        className="rounded-2xl p-6 mb-6 max-w-md mx-auto text-center transition-colors"
        style={{
          background: `linear-gradient(135deg, ${brand} 0%, ${shade(brand, -20)} 100%)`,
        }}
      >
        <div className="text-white/80 text-xs font-medium mb-1">PREVIEW</div>
        <div className="text-white text-xl font-bold mb-3">{businessName}</div>
        <button
          type="button"
          className="bg-white text-slate-900 px-4 py-2 rounded-lg font-medium text-sm shadow"
        >
          Book a session
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-4 max-w-md mx-auto">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setBrand(c)}
            aria-label={`Choose ${c}`}
            className={`w-10 h-10 rounded-full transition ${
              brand.toLowerCase() === c.toLowerCase()
                ? 'ring-4 ring-offset-2 ring-slate-300 scale-110'
                : 'hover:scale-110'
            }`}
            style={{ background: c }}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-slate-500">Or pick custom:</span>
        <input
          type="color"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="h-9 w-16 border border-slate-300 rounded-lg cursor-pointer"
        />
        <span className="text-xs font-mono text-slate-500">{brand}</span>
      </div>
    </div>
  );
}

/* ─────────────── Helpers ─────────────── */
function StepHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-7">
      <p className="text-xs font-semibold text-blue-600 tracking-wider uppercase mb-2">
        {eyebrow}
      </p>
      <h2 className="text-2xl md:text-3xl font-bold mb-2 text-slate-900">{title}</h2>
      <p className="text-slate-600 text-sm max-w-md mx-auto">{subtitle}</p>
    </div>
  );
}

// Quick hex shade helper for the brand preview gradient.
function shade(hex: string, percent: number): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n + (n * percent) / 100)))
      .toString(16)
      .padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
