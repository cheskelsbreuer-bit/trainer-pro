import { useMemo, useState } from 'react';
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
  Calendar,
  Globe,
  SkipForward,
  Instagram,
  LayoutTemplate,
  MessageSquareText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Trainer } from '../lib/database.types';
import { SPECIALTIES } from '../lib/specialties';
import { TEMPLATES, TEMPLATES_BY_SLUG, recommendTemplates, type Template } from '../lib/templates';

type ClientCount = '0' | '1-5' | '6-15' | '16-30' | '30+';

interface Props {
  trainer: Trainer;
}

// Added 2 new steps: free-form description (4) and template pick (5).
// Previous step 4 (specialties) moves to step 3.5 — kept as step 4 visually
// for simplicity (we renumber the StepHeader labels per step).
const TOTAL_STEPS = 9;

export function OnboardingWizard({ trainer }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(trainer.full_name ?? '');
  const [businessName, setBusinessName] = useState(trainer.business_name ?? '');
  const [clientCount, setClientCount] = useState<ClientCount | null>(
    (trainer.client_count_estimate as ClientCount | null) ?? null,
  );
  const [specialties, setSpecialties] = useState<string[]>(trainer.specialties ?? []);
  const [description, setDescription] = useState('');
  // Multi-pick: a trainer who does martial arts + yoga + memberships
  // should be able to stack all three templates so their packages list
  // contains every relevant package out of the gate.
  const [templateSlugs, setTemplateSlugs] = useState<string[]>([]);
  const [brand, setBrand] = useState(trainer.primary_color ?? '#2563eb');
  const [bookingEnabled, setBookingEnabled] = useState<boolean | null>(null);
  const [profileHeadline, setProfileHeadline] = useState(
    (trainer.public_profile?.hero?.title as string) ?? '',
  );
  const [profileBio, setProfileBio] = useState(
    (trainer.public_profile?.about?.body as string) ?? '',
  );
  const [profileInstagram, setProfileInstagram] = useState(
    ((trainer.public_profile?.contact?.instagram as string) ?? '').replace(/^@/, ''),
  );

  const finish = useMutation({
    mutationFn: async () => {
      // Merge new public-profile fields into existing JSONB structure
      const existing = trainer.public_profile ?? ({} as Trainer['public_profile']);
      const mergedProfile = {
        ...existing,
        hero: {
          ...(existing.hero ?? {}),
          title: profileHeadline.trim() || existing.hero?.title || null,
        },
        about: {
          ...(existing.about ?? {}),
          body: profileBio.trim() || existing.about?.body || null,
        },
        contact: {
          ...(existing.contact ?? {}),
          instagram: profileInstagram.trim()
            ? profileInstagram.trim().replace(/^@/, '')
            : existing.contact?.instagram || null,
        },
      };

      const update: Record<string, unknown> = {
        full_name: fullName.trim() || trainer.full_name,
        business_name: businessName.trim() || null,
        client_count_estimate: clientCount,
        specialties,
        primary_color: brand,
        public_profile: mergedProfile,
        onboarded_at: new Date().toISOString(),
      };

      // Apply template defaults — STACK across every picked template.
      // Trainers running e.g. martial arts + yoga + gym membership get
      // every relevant package combined into one default_packages list,
      // de-duplicated by name. Only applied if trainer.default_packages
      // is empty (never overwrite work the trainer already did).
      const pickedTemplates = templateSlugs
        .map((s) => TEMPLATES_BY_SLUG[s])
        .filter(Boolean);
      if (pickedTemplates.length > 0) {
        if (!trainer.default_packages || trainer.default_packages.length === 0) {
          const seenNames = new Set<string>();
          const combinedPackages = [];
          for (const t of pickedTemplates) {
            for (const pkg of t.defaults.packages ?? []) {
              if (seenNames.has(pkg.name)) continue;
              seenNames.add(pkg.name);
              combinedPackages.push(pkg);
            }
          }
          if (combinedPackages.length > 0) {
            update.default_packages = combinedPackages;
          }
        }

        // Booking settings: take the FIRST picked template's settings as
        // a base, then layer the trainer's existing settings on top
        // (existing wins). Booking enabled is true if ANY picked
        // template wants it on.
        const firstWithBooking = pickedTemplates.find(
          (t) => t.defaults.booking_settings,
        );
        if (firstWithBooking?.defaults.booking_settings) {
          update.booking_settings = {
            ...firstWithBooking.defaults.booking_settings,
            ...(trainer.booking_settings ?? {}),
          };
        }
        if (
          bookingEnabled === null &&
          pickedTemplates.some((t) => t.defaults.booking_enabled)
        ) {
          update.booking_enabled = true;
        }
      }

      // Only flip booking_enabled if they made an explicit choice on the step
      if (bookingEnabled !== null) {
        update.booking_enabled = bookingEnabled;
      }

      const { error } = await supabase.from('trainers').update(update).eq('id', user!.id);
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
    if (step === 4) return specialties.length > 0;
    // Step 5 (description) and step 6 (template pick) are advisory but
    // not required — we can always recommend something based on specialties.
    return true;
  })();

  const isOptionalStep = step >= 8; // booking + public profile are skippable

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
          {step === 4 && (
            <StepSpecialties value={specialties} onChange={setSpecialties} />
          )}
          {step === 5 && (
            <StepDescription value={description} onChange={setDescription} />
          )}
          {step === 6 && (
            <StepTemplate
              specialties={specialties}
              description={description}
              picked={templateSlugs}
              onPick={setTemplateSlugs}
            />
          )}
          {step === 7 && (
            <StepBrand
              brand={brand}
              setBrand={setBrand}
              businessName={businessName || fullName || 'Your business'}
            />
          )}
          {step === 8 && (
            <StepBooking value={bookingEnabled} onChange={setBookingEnabled} />
          )}
          {step === 9 && (
            <StepPublicProfile
              headline={profileHeadline}
              setHeadline={setProfileHeadline}
              bio={profileBio}
              setBio={setProfileBio}
              instagram={profileInstagram}
              setInstagram={setProfileInstagram}
            />
          )}

          {finish.error && (
            <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              Couldn't save: {(finish.error as Error).message}
            </div>
          )}

          {/* nav buttons */}
          <div className="mt-9 flex items-center justify-between gap-3">
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

            <div className="flex items-center gap-2">
              {isOptionalStep && step < TOTAL_STEPS && (
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-2.5 rounded-lg text-sm font-medium transition"
                >
                  <SkipForward size={14} /> Skip
                </button>
              )}

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
        A few quick questions and we'll have your dashboard, booking page, and public profile
        ready to share.
      </p>
      <div className="mt-7 grid grid-cols-4 sm:grid-cols-8 gap-2 max-w-2xl mx-auto">
        {[
          { icon: <Users size={14} />, label: 'You' },
          { icon: <Target size={14} />, label: 'Focus' },
          { icon: <MessageSquareText size={14} />, label: 'Describe' },
          { icon: <LayoutTemplate size={14} />, label: 'Template' },
          { icon: <Palette size={14} />, label: 'Brand' },
          { icon: <Calendar size={14} />, label: 'Booking' },
          { icon: <Globe size={14} />, label: 'Website' },
          { icon: <CheckCircle2 size={14} />, label: 'Done' },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 p-2.5 bg-slate-50 rounded-xl text-slate-600"
          >
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-blue-600">
              {s.icon}
            </div>
            <span className="text-[10px] font-medium">{s.label}</span>
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
        eyebrow="Step 1 of 8"
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
        eyebrow="Step 2 of 8"
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

/* ─────────────── Step 4: Specialties (multi) ─────────────── */
function StepSpecialties({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };
  return (
    <div>
      <StepHeader
        eyebrow="Step 3 of 8"
        title="What do you train people for?"
        subtitle={`Pick everything that applies — no limit. ${
          value.length > 0
            ? `${value.length} selected.`
            : 'Tap a card to select it.'
        }`}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl mx-auto">
        {SPECIALTIES.map((o) => {
          const selected = value.includes(o.val);
          return (
            <button
              key={o.val}
              type="button"
              onClick={() => toggle(o.val)}
              className={`relative p-3 rounded-xl border-2 transition text-center ${
                selected
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {selected && (
                <CheckCircle2
                  size={16}
                  className="absolute top-1.5 right-1.5 text-blue-600"
                  fill="white"
                />
              )}
              <div className="text-2xl mb-1">{o.emoji}</div>
              <div className="text-xs font-medium text-slate-800 leading-tight">
                {o.label}
              </div>
            </button>
          );
        })}
      </div>
      <div className="max-w-xl mx-auto mt-5 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 leading-relaxed">
        <div className="font-semibold mb-0.5">Two things this controls:</div>
        <ul className="list-disc ml-4 space-y-0.5">
          <li>
            How clients searching{' '}
            <a
              href="/find-trainers"
              target="_blank"
              rel="noreferrer"
              className="underline font-medium"
            >
              trainerpro.coach/find-trainers
            </a>{' '}
            filter to find you.
          </li>
          <li>
            Which mini-apps appear in your dashboard. Pick "group classes" and
            you get the group scheduler. Pick "nutrition coaching" and you get
            meal plans. You can change this anytime in Settings.
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ─────────────── Step 5: Free-form description ─────────────── */
function StepDescription({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Step 4 of 8"
        title="In a few words, describe what you do."
        subtitle="A sentence or two is plenty. We use this + your specialties above to recommend the best starting template on the next step."
      />
      <div className="max-w-xl mx-auto">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          autoFocus
          placeholder="e.g. I run a small neighborhood gym in Brooklyn with about 60 monthly members. Mix of strength + classes. / I'm an online coach with 8-week strength programs sold as packages. / I run a BJJ academy with belt progression for adults + kids."
          className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Mention things like: membership vs. session-pack billing, group classes
          vs. 1-on-1, online vs. in-person, age groups, business size. The more
          specific you are, the better our template match.
        </p>
      </div>
    </div>
  );
}

/* ─────────────── Step 6: Template pick (multi-select, stackable) ─────────────── */
function StepTemplate({
  specialties,
  description,
  picked,
  onPick,
}: {
  specialties: string[];
  description: string;
  picked: string[];
  onPick: (slugs: string[]) => void;
}) {
  const recommendations = useMemo(
    () => recommendTemplates(specialties, description),
    [specialties, description],
  );
  const [showAll, setShowAll] = useState(recommendations.length < 2);
  const shown: Template[] = showAll ? TEMPLATES : recommendations;

  const toggle = (slug: string) => {
    if (picked.includes(slug)) onPick(picked.filter((s) => s !== slug));
    else onPick([...picked, slug]);
  };

  // Preview of every package the trainer will get if they finish with the
  // current pick — combined + de-duped across templates.
  const previewPackages = useMemo(() => {
    const seen = new Set<string>();
    const out: { name: string; price: number; from: string }[] = [];
    for (const slug of picked) {
      const t = TEMPLATES_BY_SLUG[slug];
      if (!t) continue;
      for (const pkg of t.defaults.packages ?? []) {
        if (seen.has(pkg.name)) continue;
        seen.add(pkg.name);
        out.push({ name: pkg.name, price: pkg.price, from: t.emoji });
      }
    }
    return out;
  }, [picked]);

  return (
    <div>
      <StepHeader
        eyebrow="Step 5 of 8"
        title="Pick the templates that fit you."
        subtitle="Mix and match — if you run a gym AND teach yoga AND coach BJJ, pick all three. We'll combine their packages so you start with everything in one list."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {shown.map((t) => {
          const isOn = picked.includes(t.slug);
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => toggle(t.slug)}
              className={`text-left p-4 rounded-2xl border-2 transition relative ${
                isOn
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {isOn && (
                <CheckCircle2
                  size={18}
                  className="absolute top-2 right-2 text-blue-600"
                  fill="white"
                />
              )}
              <div className="flex items-start gap-2.5 mb-2">
                <span className="text-3xl flex-shrink-0">{t.emoji}</span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 leading-tight">{t.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.tagline}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                {t.description}
              </p>
              <ul className="space-y-0.5">
                {t.bestFor.slice(0, 3).map((b) => (
                  <li
                    key={b}
                    className="text-[11px] text-slate-500 flex items-start gap-1.5"
                  >
                    <span className="text-slate-300 mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {t.defaults.packages && t.defaults.packages.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                  {t.defaults.packages.slice(0, 3).map((p) => (
                    <span
                      key={p.name}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700"
                    >
                      {p.name} · ${p.price}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-900 underline"
        >
          {showAll
            ? recommendations.length > 0
              ? `Show only the ${recommendations.length} recommended for me`
              : 'Showing all templates'
            : `Don't see a fit? See all ${TEMPLATES.length} templates`}
        </button>
      </div>

      {/* Live combined-packages preview so the trainer can see what
          they're committing to before clicking Continue. */}
      {previewPackages.length > 0 && (
        <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            You'll start with {previewPackages.length} package
            {previewPackages.length === 1 ? '' : 's'} from{' '}
            {picked.length} template{picked.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {previewPackages.map((p) => (
              <span
                key={p.name}
                className="text-[11px] px-2 py-1 rounded-full bg-white border border-blue-100 text-slate-700"
              >
                <span className="mr-1">{p.from}</span>
                {p.name} · ${p.price}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-blue-700/80 mt-2 leading-snug">
            All of these will appear in your packages list. Rename or delete any
            you don't want — nothing is locked in.
          </p>
        </div>
      )}

      <p className="text-[11px] text-slate-400 text-center mt-4 max-w-md mx-auto">
        You can also skip this step entirely and build packages by hand later
        from Settings.
      </p>
    </div>
  );
}

/* ─────────────── Step 7: Brand color ─────────────── */
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
    '#2563eb', '#0ea5e9', '#0d9488', '#16a34a',
    '#ca8a04', '#ea580c', '#dc2626', '#db2777',
    '#7c3aed', '#1e293b',
  ];
  return (
    <div>
      <StepHeader
        eyebrow="Step 6 of 8"
        title="Pick your brand color."
        subtitle="Buttons, highlights, and your client portal will use this."
      />

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

/* ─────────────── Step 6: Booking page ─────────────── */
function StepBooking({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Step 7 of 8 · Optional"
        title="Want clients to book sessions on your site?"
        subtitle="Turn on a public booking page where clients pick a time and you get an email. Easy to change later."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`text-left p-5 rounded-xl border-2 transition ${
            value === true
              ? 'border-emerald-500 bg-emerald-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <div className="font-semibold text-slate-900">Yes, turn it on</div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Get a public link clients can use to self-book. You can fine-tune hours and session
            length later in Settings.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`text-left p-5 rounded-xl border-2 transition ${
            value === false
              ? 'border-slate-500 bg-slate-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <SkipForward size={18} />
            </div>
            <div className="font-semibold text-slate-900">Not yet</div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            I'll book sessions for clients myself. I can turn this on later if I change my
            mind.
          </p>
        </button>
      </div>
    </div>
  );
}

/* ─────────────── Step 7: Public profile ─────────────── */
function StepPublicProfile({
  headline,
  setHeadline,
  bio,
  setBio,
  instagram,
  setInstagram,
}: {
  headline: string;
  setHeadline: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  instagram: string;
  setInstagram: (v: string) => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Step 8 of 8 · Optional"
        title="Last bit — your public profile."
        subtitle="You get a free trainer website at trainerpro.coach/p/your-name. Fill this in now or skip and edit later."
      />
      <div className="space-y-4 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Personal trainer in Brooklyn"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500 mt-1.5">
            One line. Where you train and who you train.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Short bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="I help busy professionals build strength and feel better in their bodies. 10 years of experience, certified through NASM."
            rows={4}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Instagram <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-2 px-4 py-3 border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <Instagram size={16} className="text-slate-400" />
            <span className="text-slate-400">@</span>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
              placeholder="janetrainer"
              className="flex-1 outline-none text-base"
            />
          </div>
        </div>
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
