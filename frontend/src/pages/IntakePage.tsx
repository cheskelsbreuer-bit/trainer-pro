import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Shield, ClipboardCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SignaturePad } from '../components/SignaturePad';

interface IntakeInfo {
  status: 'pending' | 'completed' | 'expired' | 'invalid';
  expires_at?: string;
  trainer?: {
    full_name: string;
    business_name: string | null;
    primary_color: string | null;
    logo_url: string | null;
  };
  client?: {
    full_name: string;
    email: string | null;
    phone: string | null;
  };
}

const PAR_Q_ITEMS = [
  'Has your doctor ever said you have a heart condition AND that you should only do physical activity recommended by a doctor?',
  'Do you feel pain in your chest when you do physical activity?',
  'In the past month, have you had chest pain when you were not doing physical activity?',
  'Do you lose your balance because of dizziness or do you ever lose consciousness?',
  'Do you have a bone or joint problem that could be made worse by a change in your physical activity?',
  'Is your doctor currently prescribing drugs (e.g., water pills) for your blood pressure or heart condition?',
  'Do you know of any other reason why you should not do physical activity?',
];

const WAIVER_TEXT = `WAIVER AND RELEASE OF LIABILITY

By signing this form, I acknowledge and agree to the following:

1. ASSUMPTION OF RISK. I understand that physical exercise and personal training carry inherent risks, including but not limited to bodily injury, illness, aggravation of pre-existing conditions, and in rare cases, serious injury or death. I knowingly and freely assume all such risks, both known and unknown, even those arising from the negligence of the trainer or others.

2. PHYSICAL CONDITION. I represent that I am in good physical condition and have no medical condition that would prevent safe participation. I have disclosed all relevant medical information on the intake form, and I will inform my trainer immediately of any change to my health.

3. NOT MEDICAL ADVICE. I understand that the trainer is not a licensed medical professional. Any nutritional, exercise, or wellness guidance is general in nature and is not a substitute for advice from a qualified medical provider. I have consulted, or will consult, a physician before beginning this program if I have any reason to.

4. RELEASE OF LIABILITY. I, for myself and on behalf of my heirs, assignees, personal representatives, and next of kin, hereby release and hold harmless the trainer and any of their staff, agents, contractors, and venues from any and all claims, demands, or causes of action arising out of my participation, whether caused by ordinary negligence or otherwise, to the fullest extent permitted by law. This release does not apply to gross negligence or willful misconduct.

5. INDEMNIFICATION. I agree to indemnify and hold harmless the trainer for any losses, costs, or damages incurred as a result of my participation, including reasonable attorneys' fees.

6. EMERGENCY MEDICAL CARE. In the event of injury, I authorize the trainer to seek emergency medical care on my behalf and agree to be responsible for any related costs.

7. PHOTOGRAPHY. I consent to having progress photos and measurements stored privately for my own training records. These will not be shared without my express permission.

I HAVE READ THIS WAIVER, FULLY UNDERSTAND ITS TERMS, AND SIGN IT FREELY AND VOLUNTARILY. I UNDERSTAND THAT I AM GIVING UP SUBSTANTIAL RIGHTS BY SIGNING IT.`;

export function IntakePage() {
  const { token } = useParams<{ token: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    goals: '',
    medical_notes: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    par_q: Array(PAR_Q_ITEMS.length).fill(false) as boolean[],
    medications: '',
    waiver_agreed: false,
    signature: null as string | null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['intake', token],
    queryFn: async (): Promise<IntakeInfo> => {
      if (!token) return { status: 'invalid' };
      const { data, error } = await supabase.rpc('public_intake_info', { p_token: token });
      if (error) throw error;
      if (!data) return { status: 'invalid' };
      return data as IntakeInfo;
    },
    enabled: !!token,
  });

  // Pre-fill name/email/phone from client record once loaded
  useState(() => undefined);
  // (Effect-style pre-fill done inline once data arrives)

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.signature) throw new Error('Please sign before submitting.');
      if (!form.waiver_agreed) throw new Error('Please agree to the waiver.');
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        date_of_birth: form.date_of_birth || null,
        goals: form.goals.trim(),
        medical_notes: [
          form.medical_notes.trim(),
          form.medications.trim() ? `Medications: ${form.medications.trim()}` : '',
          PAR_Q_ITEMS.map((q, i) => (form.par_q[i] ? `[YES] ${q}` : null)).filter(Boolean).join('\n'),
        ]
          .filter(Boolean)
          .join('\n\n'),
        emergency_contact: form.emergency_contact_name.trim()
          ? `${form.emergency_contact_name.trim()} — ${form.emergency_contact_phone.trim()}`
          : null,
      };
      const { error } = await supabase.rpc('public_intake_submit', {
        p_token: token,
        p_data: payload,
        p_signature_data_url: form.signature,
        p_waiver_text: WAIVER_TEXT,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => setSubmitted(true),
  });

  if (isLoading) {
    return <Centered>Loading…</Centered>;
  }

  if (!data || data.status === 'invalid') {
    return (
      <Centered>
        <Icon><AlertCircle size={20} /></Icon>
        <h1 className="text-xl font-semibold text-slate-900">Form not found</h1>
        <p className="text-sm text-slate-500 mt-1">This link is invalid.</p>
      </Centered>
    );
  }
  if (data.status === 'expired') {
    return (
      <Centered>
        <Icon><AlertCircle size={20} /></Icon>
        <h1 className="text-xl font-semibold text-slate-900">Form expired</h1>
        <p className="text-sm text-slate-500 mt-1">Ask your trainer for a fresh intake link.</p>
      </Centered>
    );
  }
  if (data.status === 'completed' || submitted) {
    return (
      <Centered>
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">All set!</h1>
        <p className="text-sm text-slate-500 mt-1">Your form has been submitted. Your trainer will be in touch.</p>
      </Centered>
    );
  }

  // pending
  const t = data.trainer!;
  const trainerColor = t.primary_color || '#2d6a9f';
  const heading = t.business_name || t.full_name;
  // Pre-fill once
  if (!form.full_name && data.client?.full_name) {
    setForm((f) => ({
      ...f,
      full_name: data.client?.full_name ?? '',
      email: data.client?.email ?? '',
      phone: data.client?.phone ?? '',
    }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className="text-white py-8 px-6"
        style={{ background: `linear-gradient(135deg, ${trainerColor}, ${darken(trainerColor, 12)})` }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={28} />
            <div>
              <p className="text-white/80 text-sm">New client intake form</p>
              <h1 className="text-2xl font-bold">Welcome — {heading}</h1>
            </div>
          </div>
          <p className="mt-3 text-white/85 text-sm max-w-prose">
            A few quick questions before we start. Takes about 3 minutes. Everything stays private between you and {t.full_name}.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
          className="space-y-6"
        >
          <Card title="About you">
            <Grid2>
              <Field label="Full name" required>
                <TextIn value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
              </Field>
              <Field label="Date of birth">
                <TextIn type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />
              </Field>
              <Field label="Email" required>
                <TextIn type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
              </Field>
              <Field label="Phone">
                <TextIn type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              </Field>
            </Grid2>
          </Card>

          <Card title="Goals & background">
            <Field label="What are you hoping to achieve?" required>
              <TextArea value={form.goals} onChange={(v) => setForm({ ...form, goals: v })} required placeholder="Lose 10 lbs, run a 5K, get stronger overall…" />
            </Field>
            <Field label="Any injuries, surgeries, conditions, or limitations we should know about?">
              <TextArea value={form.medical_notes} onChange={(v) => setForm({ ...form, medical_notes: v })} placeholder="Past injuries, surgeries, joint issues, etc." />
            </Field>
            <Field label="Medications">
              <TextArea value={form.medications} onChange={(v) => setForm({ ...form, medications: v })} placeholder="Anything you're currently taking." rows={2} />
            </Field>
          </Card>

          <Card title="Emergency contact">
            <Grid2>
              <Field label="Name">
                <TextIn value={form.emergency_contact_name} onChange={(v) => setForm({ ...form, emergency_contact_name: v })} />
              </Field>
              <Field label="Phone">
                <TextIn type="tel" value={form.emergency_contact_phone} onChange={(v) => setForm({ ...form, emergency_contact_phone: v })} />
              </Field>
            </Grid2>
          </Card>

          <Card title="Health screening (PAR-Q+)" subtitle="Check any that apply.">
            <ul className="space-y-2">
              {PAR_Q_ITEMS.map((q, i) => (
                <li key={i}>
                  <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={form.par_q[i]}
                      onChange={(e) => {
                        const next = [...form.par_q];
                        next[i] = e.target.checked;
                        setForm({ ...form, par_q: next });
                      }}
                      className="w-4 h-4 mt-0.5"
                    />
                    <span className="text-sm text-slate-700">{q}</span>
                  </label>
                </li>
              ))}
            </ul>
            {form.par_q.some(Boolean) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2 mt-2">
                <Shield size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  You answered YES to one or more questions. Please consult your physician before starting an exercise program.
                  Your trainer will follow up with you.
                </span>
              </div>
            )}
          </Card>

          <Card title="Liability waiver">
            <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-48 overflow-y-auto">
              {WAIVER_TEXT}
            </div>
            <label className="flex items-center gap-2 mt-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.waiver_agreed}
                onChange={(e) => setForm({ ...form, waiver_agreed: e.target.checked })}
                className="w-4 h-4"
              />
              I have read and agree to the liability waiver above.
            </label>
          </Card>

          <Card title="Signature" subtitle="Sign with your finger or mouse.">
            <SignaturePad onChange={(s) => setForm({ ...form, signature: s })} color={trainerColor} />
            <p className="text-xs text-slate-500 mt-2">
              Submitted by {form.full_name || 'you'} on {new Date().toLocaleDateString()}.
            </p>
          </Card>

          {submit.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {(submit.error as Error).message}
            </div>
          )}

          <button
            type="submit"
            disabled={submit.isPending || !form.signature || !form.waiver_agreed}
            className="w-full px-4 py-3 text-white font-medium rounded-lg shadow-sm disabled:opacity-50"
            style={{ backgroundColor: trainerColor }}
          >
            {submit.isPending ? 'Submitting…' : 'Submit intake form'}
          </button>
        </form>
      </main>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
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

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function TextIn(props: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type={props.type ?? 'text'}
      value={props.value}
      required={props.required}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function TextArea(props: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={props.rows ?? 3}
      value={props.value}
      required={props.required}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm max-w-sm">{children}</div>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
      {children}
    </div>
  );
}

function darken(hex: string, percent: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - Math.round(255 * (percent / 100)));
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - Math.round(255 * (percent / 100)));
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - Math.round(255 * (percent / 100)));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
