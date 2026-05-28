import { useEffect, useMemo, useState } from 'react';
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
  SlidersHorizontal,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Trainer } from '../lib/database.types';
import { SPECIALTIES } from '../lib/specialties';
import { TEMPLATES, TEMPLATES_BY_SLUG, recommendTemplates, type Template } from '../lib/templates';
import {
  modulesForTemplates,
  starterBundleForTemplates,
  type AppModule,
  type ModuleCategory,
} from '../lib/modules';
import {
  defaultAppearance,
  applyAppearance,
  PALETTES,
  FONT_PAIRS,
  type AppearanceConfig,
  type Corners,
  type Density,
  type NavLayout,
} from '../lib/appearance';

type ClientCount = '0' | '1-5' | '6-15' | '16-30' | '30+';

interface Props {
  trainer: Trainer;
}

// 10-step wizard. Step 7 = "Customize your app" — pick the exact
// features you want. This is the product's whole pitch (the most
// customizable coaching app), so it lives in onboarding, not buried in
// settings. Steps after it shift down by one.
const TOTAL_STEPS = 10;

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
  // Which capability modules the coach wants. Seeded from the picked
  // template's starter bundle, then they add/remove on the Customize step.
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  // Re-seed the module set whenever the picked templates change, UNLESS the
  // coach has already started customizing (don't clobber). We seed from the
  // COMBINED starter bundles of every picked discipline, so a coach who does
  // nutrition + martial arts + 1-on-1 starts with all three turned on.
  const [touchedModules, setTouchedModules] = useState(false);
  const templateKey = templateSlugs.join(',');
  useEffect(() => {
    if (touchedModules) return;
    if (templateSlugs.length > 0) {
      setEnabledModules(new Set(starterBundleForTemplates(templateSlugs)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateKey, touchedModules]);
  // Full appearance config — colors, fonts, theme, corners, density, nav
  // layout. Seeded from the picked template's design defaults, then the
  // coach tweaks it on the "Design your app" step. A live preview shows
  // their choices in real time.
  const [appearance, setAppearance] = useState<AppearanceConfig>(defaultAppearance(undefined));
  const [touchedDesign, setTouchedDesign] = useState(false);
  useEffect(() => {
    if (touchedDesign) return;
    const primary = templateSlugs[0];
    if (primary) setAppearance(defaultAppearance(primary));
  }, [templateSlugs, touchedDesign]);
  // Live-apply the appearance as they design, so the wizard itself can
  // (later) reflect it and so the very next screen is themed.
  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);
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
        // The coach's chosen feature set, picked on the Customize step.
        // Falls back to the primary template's starter bundle.
        modules: {
          enabled: Array.from(
            enabledModules.size > 0
              ? enabledModules
              : new Set(starterBundleForTemplates(templateSlugs)),
          ),
        },
        // The coach's design choices — colors, fonts, theme, layout.
        appearance,
      };

      const update: Record<string, unknown> = {
        full_name: fullName.trim() || trainer.full_name,
        business_name: businessName.trim() || null,
        client_count_estimate: clientCount,
        specialties,
        // Persist the picked templates so Dashboard/UI can customize per
        // template post-onboarding (gym membership UI, martial arts UI, etc.)
        template_slugs: templateSlugs,
        primary_color: appearance.primary,
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

  const isOptionalStep = step >= 9; // booking + public profile are skippable

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
            <StepModules
              templateSlugs={templateSlugs}
              enabled={enabledModules}
              onToggle={(id) => {
                setTouchedModules(true);
                setEnabledModules((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
            />
          )}
          {step === 8 && (
            <StepDesign
              appearance={appearance}
              onChange={(next) => {
                setTouchedDesign(true);
                setAppearance(next);
              }}
              businessName={businessName || fullName || 'Your business'}
            />
          )}
          {step === 9 && (
            <StepBooking value={bookingEnabled} onChange={setBookingEnabled} />
          )}
          {step === 10 && (
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

/* ─────────────── Step 7: Customize your app ─────────────── */
const MODULE_CAT_LABELS: Record<ModuleCategory, string> = {
  core: 'The essentials',
  ai: '🤖 AI features',
  crosscutting: 'Money & payments',
  nutrition: 'Nutrition coaching',
  studio: 'Group classes',
  martial: 'Martial arts',
  boxing: 'Boxing',
  exercise: 'Group exercise',
  private: '1-on-1 training',
  comms: 'Communication',
  business: 'Run the business',
  growth: 'Growth & extras',
};
const MODULE_CAT_ORDER: ModuleCategory[] = [
  'core', 'ai', 'crosscutting', 'nutrition', 'studio', 'martial', 'boxing',
  'exercise', 'private', 'comms', 'business', 'growth',
];

function StepModules({
  templateSlugs,
  enabled,
  onToggle,
}: {
  templateSlugs: string[];
  enabled: Set<string>;
  onToggle: (id: string) => void;
}) {
  // COMBINED across every discipline the coach picked — so someone who does
  // nutrition + martial arts + 1-on-1 sees every feature from all three.
  const offered = useMemo(
    () => modulesForTemplates(templateSlugs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templateSlugs.join(',')],
  );
  const byCat = useMemo(() => {
    const m = new Map<ModuleCategory, AppModule[]>();
    for (const mod of offered) {
      if (!m.has(mod.category)) m.set(mod.category, []);
      m.get(mod.category)!.push(mod);
    }
    return m;
  }, [offered]);

  const onCount = offered.filter((m) => m.core || enabled.has(m.id)).length;

  // Friendly list of the picked disciplines for the subtitle.
  const pickedNames = templateSlugs
    .map((s) => TEMPLATES_BY_SLUG[s]?.name)
    .filter(Boolean) as string[];
  const namesSentence =
    pickedNames.length === 0
      ? ''
      : pickedNames.length === 1
        ? pickedNames[0]
        : `${pickedNames.slice(0, -1).join(', ')} and ${pickedNames[pickedNames.length - 1]}`;

  if (templateSlugs.length === 0) {
    return (
      <div>
        <StepHeader
          eyebrow="Step 7"
          title="Customize your app"
          subtitle="Pick a starting point on the previous step first, then come back here."
        />
        <p className="text-center text-slate-500 text-sm">← Go back and choose what you do.</p>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        eyebrow="Step 7 — this is the magic"
        title="Build your exact app"
        subtitle={
          templateSlugs.length > 1
            ? `You do ${namesSentence}, so here's every feature across all of them. We pre-picked what fits — turn anything on or off.`
            : 'Every box below is a feature. We pre-picked what fits you — turn anything on or off. You can change it anytime later.'
        }
      />

      {templateSlugs.length > 1 && (
        <div className="max-w-xl mx-auto mb-5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 leading-relaxed text-center">
          One app, {pickedNames.length} disciplines combined. Each section below
          is a different part of your business — set up all of them right here.
        </div>
      )}

      <div className="text-center mb-5">
        <span className="inline-block bg-blue-50 text-blue-700 text-sm font-semibold px-3 py-1 rounded-full">
          {onCount} features on
        </span>
      </div>

      <div className="space-y-6 max-h-[52vh] overflow-y-auto pr-1">
        {MODULE_CAT_ORDER.map((cat) => {
          const mods = byCat.get(cat);
          if (!mods || mods.length === 0) return null;
          return (
            <div key={cat}>
              <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">
                {MODULE_CAT_LABELS[cat]}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mods.map((m) => {
                  const on = m.core || enabled.has(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => !m.core && onToggle(m.id)}
                      disabled={m.core}
                      className={`flex items-start gap-2.5 text-left rounded-xl border p-3 transition ${
                        on
                          ? 'border-blue-300 bg-blue-50/60'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      } ${m.core ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className="text-lg leading-none mt-0.5">{m.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                          {m.name}
                          {m.core && (
                            <span className="text-[9px] font-bold tracking-wide text-slate-400 border border-slate-200 rounded px-1">
                              CORE
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5">{m.description}</span>
                      </span>
                      {/* toggle pill */}
                      <span
                        className="relative shrink-0 mt-0.5 rounded-full transition-colors"
                        style={{
                          width: 36,
                          height: 20,
                          background: on ? '#2563eb' : '#cbd5e1',
                        }}
                      >
                        <span
                          className="absolute rounded-full bg-white transition-all"
                          style={{
                            width: 16,
                            height: 16,
                            top: 2,
                            left: on ? 18 : 2,
                            boxShadow: '0 1px 2px rgba(0,0,0,.2)',
                          }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-1.5">
        <SlidersHorizontal size={12} /> This is what makes Trainer Pro yours — no other app does this.
      </p>
    </div>
  );
}

/* ─────────────── Step 8: Design your app ─────────────── */
function StepDesign({
  appearance,
  onChange,
  businessName,
}: {
  appearance: AppearanceConfig;
  onChange: (next: AppearanceConfig) => void;
  businessName: string;
}) {
  const set = <K extends keyof AppearanceConfig>(k: K, v: AppearanceConfig[K]) =>
    onChange({ ...appearance, [k]: v });

  const dark = appearance.themeMode === 'dark';
  const font = FONT_PAIRS.find((f) => f.id === appearance.fontId) ?? FONT_PAIRS[0];
  const radius =
    appearance.corners === 'sharp' ? '4px' : appearance.corners === 'pill' ? '18px' : '12px';

  return (
    <div>
      <StepHeader
        eyebrow="Step 8 — make it beautiful"
        title="Design your app"
        subtitle="Colors, fonts, light or dark, the shape of everything. Watch the preview update live. Change it anytime later."
      />

      {/* ── LIVE PREVIEW ── */}
      <div
        className="mx-auto mb-7 max-w-md overflow-hidden border"
        style={{
          borderRadius: radius,
          borderColor: dark ? '#334155' : '#e5eaf2',
          background: dark ? '#0f172a' : '#f7f8fb',
          boxShadow: '0 8px 30px rgba(0,0,0,.12)',
        }}
      >
        {/* fake topbar */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: dark ? '#1e293b' : '#fff', borderBottom: `1px solid ${dark ? '#334155' : '#e5eaf2'}` }}
        >
          <span
            style={{
              width: 26, height: 26, borderRadius: radius === '18px' ? 13 : 7,
              background: `linear-gradient(135deg, ${appearance.primary}, ${appearance.accent})`,
              display: 'inline-block',
            }}
          />
          <span style={{ fontFamily: font.display, fontWeight: 800, color: dark ? '#f1f5f9' : '#0f172a', fontSize: '0.95rem' }}>
            {businessName}
          </span>
          <span style={{ marginLeft: 'auto', color: appearance.primary, fontSize: '0.78rem', fontWeight: 700, fontFamily: font.body }}>
            Dashboard
          </span>
        </div>
        {/* fake body */}
        <div style={{ padding: appearance.density === 'compact' ? '12px' : '18px' }}>
          <div
            style={{
              background: dark ? '#1e293b' : '#fff',
              borderRadius: radius,
              padding: appearance.density === 'compact' ? '10px 12px' : '14px 16px',
              border: `1px solid ${dark ? '#334155' : '#e5eaf2'}`,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: '0.7rem', color: appearance.accent, fontWeight: 800, letterSpacing: '0.08em', fontFamily: font.body }}>THIS WEEK</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: dark ? '#f1f5f9' : '#0f172a', fontFamily: font.display }}>$2,480</div>
          </div>
          <button
            type="button"
            style={{
              background: appearance.primary, color: '#fff', border: 'none',
              borderRadius: appearance.corners === 'pill' ? 999 : radius,
              padding: '8px 16px', fontWeight: 700, fontSize: '0.84rem',
              fontFamily: font.body, cursor: 'default',
            }}
          >
            Record a payment
          </button>
        </div>
      </div>

      <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-1">
        {/* Theme mode */}
        <Row label="Light or dark">
          <Segmented
            options={[{ v: 'light', label: '☀️ Light' }, { v: 'dark', label: '🌙 Dark' }]}
            value={appearance.themeMode}
            onChange={(v) => set('themeMode', v as AppearanceConfig['themeMode'])}
          />
        </Row>

        {/* Palette */}
        <Row label="Color palette">
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => {
              const on = appearance.paletteId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.name}
                  onClick={() => onChange({ ...appearance, paletteId: p.id, primary: p.primary, accent: p.accent })}
                  className={`rounded-full transition ${on ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                  style={{
                    width: 34, height: 34,
                    background: `linear-gradient(135deg, ${p.primary} 60%, ${p.accent} 60%)`,
                  }}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              Primary
              <input type="color" value={appearance.primary} onChange={(e) => onChange({ ...appearance, paletteId: 'custom', primary: e.target.value })} className="h-8 w-12 border border-slate-300 rounded cursor-pointer" />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              Accent
              <input type="color" value={appearance.accent} onChange={(e) => onChange({ ...appearance, paletteId: 'custom', accent: e.target.value })} className="h-8 w-12 border border-slate-300 rounded cursor-pointer" />
            </label>
          </div>
        </Row>

        {/* Fonts */}
        <Row label="Font style">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FONT_PAIRS.map((f) => {
              const on = appearance.fontId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => set('fontId', f.id)}
                  className={`text-left rounded-xl border p-3 transition ${on ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <span className="block text-base font-bold text-slate-900" style={{ fontFamily: f.display }}>{f.name}</span>
                  <span className="block text-xs text-slate-500">{f.vibe}</span>
                </button>
              );
            })}
          </div>
        </Row>

        {/* Corners */}
        <Row label="Corner style">
          <Segmented
            options={[{ v: 'sharp', label: 'Sharp' }, { v: 'rounded', label: 'Rounded' }, { v: 'pill', label: 'Soft' }]}
            value={appearance.corners}
            onChange={(v) => set('corners', v as Corners)}
          />
        </Row>

        {/* Density */}
        <Row label="Spacing">
          <Segmented
            options={[{ v: 'comfortable', label: 'Comfortable' }, { v: 'compact', label: 'Compact' }]}
            value={appearance.density}
            onChange={(v) => set('density', v as Density)}
          />
        </Row>

        {/* Nav layout */}
        <Row label="Where the menu sits">
          <Segmented
            options={[{ v: 'sidebar', label: '◧ Side menu' }, { v: 'top', label: '⎺ Top bar' }]}
            value={appearance.navLayout}
            onChange={(v) => set('navLayout', v as NavLayout)}
          />
        </Row>
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">
        Every coach's app looks different. That's the point.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">{label}</p>
      {children}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden">
      {options.map((o, i) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`px-4 py-2 text-sm font-semibold transition ${on ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} ${i > 0 ? 'border-l border-slate-200' : ''}`}
          >
            {o.label}
          </button>
        );
      })}
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

