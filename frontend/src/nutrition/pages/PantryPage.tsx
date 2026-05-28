// Pantry — settings, presented as a numbered index in a magazine
// back-matter style. Each section opens into a short prose page with
// a small form, not the dojo's tile grid or the boxing TOC.

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';
import {
  N,
  SERIF_FONT,
  useActiveMethodology,
  useCustomLibrary,
  METHODOLOGIES,
  METHODOLOGY_BY_ID,
  type Methodology,
  type NutritionPractice,
  type NutritionSkill,
} from '../theme';
import { StripeStatusCard } from '../../components/StripeStatusCard';
import { GoogleCalendarCard } from '../../components/GoogleCalendarCard';
import { BookingSettingsCard } from '../../components/BookingSettingsCard';
import { PublicProfileSettingsCard } from '../../components/PublicProfileSettingsCard';
import { DirectorySettingsCard } from '../../components/DirectorySettingsCard';
import { FeedbackCard } from '../../components/FeedbackCard';
import { CustomizeStudio } from '../../components/CustomizeStudio';

type Section =
  | 'customize'
  | 'practice'
  | 'methodology'
  | 'coach'
  | 'coaching-defaults'
  | 'units-cadence'
  | 'payments'
  | 'booking'
  | 'calendar'
  | 'profile'
  | 'directory'
  | 'support';

const INDEX: { id: Section; title: string; blurb: string }[] = [
  { id: 'customize', title: 'Customize Your App', blurb: 'Turn features on or off. Your app, your way.' },
  { id: 'practice', title: 'The Practice', blurb: 'Your practice name and identity.' },
  {
    id: 'methodology',
    title: 'Coaching methodology',
    blurb:
      'Pick the program your app runs on — PN, RP, Intuitive Eating, IIN, or your own. Habit library, AI coach, and tone all swap.',
  },
  { id: 'coach', title: 'You, the Coach', blurb: 'Name, contact, timezone, currency, notifications.' },
  {
    id: 'coaching-defaults',
    title: 'Coaching defaults',
    blurb: 'Practice window, default check-in cadence, default session length.',
  },
  {
    id: 'units-cadence',
    title: 'Units & display',
    blurb: 'Pounds / kilos, inches / cm, week-starts-on-Sunday or -Monday.',
  },
  { id: 'payments', title: 'Online Payments', blurb: 'Take coaching fees online via Stripe.' },
  { id: 'booking', title: 'Consult Booking', blurb: 'When clients can book initial consults.' },
  { id: 'calendar', title: 'Calendar Sync', blurb: 'Mirror consults to Google Calendar.' },
  { id: 'profile', title: 'Public Practice Page', blurb: 'What prospective clients see.' },
  { id: 'directory', title: 'Find-a-Practitioner Listing', blurb: 'Show up in the public coach directory.' },
  { id: 'support', title: 'Help & Feedback', blurb: 'Anything we should know.' },
];

export function PantryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section | null>(null);

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

  if (section === null) {
    return (
      <div className="px-6 sm:px-12 pt-10 max-w-3xl mx-auto">
        <section className="text-center mb-10">
          <p className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: N.coral }}>
            Back of the Book
          </p>
          <h2
            className="leading-tight"
            style={{
              fontFamily: SERIF_FONT,
              color: N.ink,
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              fontWeight: 600,
            }}
          >
            The Pantry
          </h2>
          <p className="mt-2 text-sm italic" style={{ color: N.mute, fontFamily: SERIF_FONT }}>
            Where you keep the things that run the practice
          </p>
        </section>

        <ol>
          {INDEX.map((item, i) => (
            <li
              key={item.id}
              className="grid grid-cols-[40px_1fr_auto] gap-4 items-baseline border-b py-4 cursor-pointer"
              style={{ borderColor: N.rule }}
              onClick={() => setSection(item.id)}
            >
              <span
                style={{
                  fontFamily: SERIF_FONT,
                  color: N.muteFaint,
                  fontSize: '1.5rem',
                  fontStyle: 'italic',
                  fontWeight: 500,
                }}
              >
                {String(i + 1).padStart(2, '0')}.
              </span>
              <div>
                <h3
                  style={{
                    fontFamily: SERIF_FONT,
                    color: N.ink,
                    fontSize: '1.25rem',
                    fontWeight: 600,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-sm italic mt-0.5"
                  style={{ color: N.mute, fontFamily: SERIF_FONT }}
                >
                  {item.blurb}
                </p>
              </div>
              <span
                className="text-[11px] uppercase tracking-[0.3em] italic"
                style={{ color: N.sageDeep, fontFamily: SERIF_FONT }}
              >
                Open →
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="px-6 sm:px-12 pt-10 max-w-3xl mx-auto">
      <button
        onClick={() => setSection(null)}
        className="text-[11px] uppercase tracking-[0.3em] italic mb-6 inline-flex"
        style={{ color: N.sageDeep, fontFamily: SERIF_FONT }}
      >
        ← Back to the index
      </button>

      {section === 'customize' && (
        <SolarWrap title="Customize your app">
          <p className="text-sm mb-5" style={{ color: N.inkSoft }}>
            One place for everything. <strong>Features</strong> — turn
            capabilities on/off. <strong>Design</strong> — colors, fonts,
            light/dark, all live. <strong>Layout</strong> — drag your menu
            into the order you want.
          </p>
          <CustomizeStudio
            templateSlug={trainer?.template_slugs?.[0] ?? 'nutrition_coach'}
            accent="#D87456"
            navItems={[
              { to: '/', label: '🏠 Home' },
              { to: '/clients', label: '👥 Clients' },
              { to: '/sessions', label: '📅 Sessions' },
              { to: '/check-ins', label: '📥 Check-ins' },
              { to: '/intake', label: '📋 Intake forms' },
              { to: '/recipes', label: '🍳 Recipes' },
              { to: '/plans', label: '🌱 Habit library' },
              { to: '/resources', label: '📚 Resources' },
              { to: '/ask', label: '✨ Ask coach' },
              { to: '/plate', label: '💰 Billing' },
              { to: '/pantry', label: '⚙️ Settings' },
            ]}
          />
        </SolarWrap>
      )}
      {section === 'practice' && <PracticeIdentity trainer={trainer} userId={user?.id} qc={qc} />}
      {section === 'methodology' && <MethodologyPicker />}
      {section === 'coach' && trainer && <CoachProfile trainer={trainer} userId={user?.id} qc={qc} />}
      {section === 'coaching-defaults' && <CoachingDefaults />}
      {section === 'units-cadence' && <UnitsCadence />}
      {section === 'payments' && <SolarWrap title="Online payments — Stripe"><StripeStatusCard /></SolarWrap>}
      {section === 'calendar' && trainer && <SolarWrap title="Calendar sync"><GoogleCalendarCard trainer={trainer} /></SolarWrap>}
      {section === 'booking' && trainer && <SolarWrap title="Consult booking"><BookingSettingsCard trainer={trainer} /></SolarWrap>}
      {section === 'profile' && trainer && <SolarWrap title="Public practice page"><PublicProfileSettingsCard trainer={trainer} /></SolarWrap>}
      {section === 'directory' && trainer && <SolarWrap title="Find-a-practitioner directory"><DirectorySettingsCard trainer={trainer} /></SolarWrap>}
      {section === 'support' && <SolarWrap title="Help & feedback"><FeedbackCard /></SolarWrap>}
    </div>
  );
}

/** Methodology picker — pick which coaching program drives the app.
 *  The active methodology controls the Habit Library, the Add-client
 *  practice picker, the home headline copy, and the AI coach\'s tone.
 *  Persisted to localStorage; switches take effect immediately. */
function MethodologyPicker() {
  const [active, setActive] = useActiveMethodology();
  return (
    <article>
      <SectionTitle>Coaching methodology</SectionTitle>
      <p
        className="text-sm leading-relaxed mb-5"
        style={{ color: N.inkSoft }}
      >
        Pick the program your app runs on. Each methodology has its own
        habit library, vocabulary, and AI coach voice. Switching is
        instant — you can change your mind any time.
      </p>

      <div className="space-y-3">
        {METHODOLOGIES.map((m) => {
          const isActive = active.id === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className="w-full text-left rounded-2xl px-5 py-4 transition-all"
              style={{
                background: isActive ? `${m.color}14` : N.card,
                border: `2px solid ${isActive ? m.color : N.rule}`,
              }}
            >
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <h3
                  style={{
                    fontFamily: SERIF_FONT,
                    color: N.ink,
                    fontSize: '1.25rem',
                    fontWeight: 600,
                  }}
                >
                  {m.label}
                </h3>
                {isActive && (
                  <span
                    className="text-[10px] uppercase tracking-[0.3em] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: m.color,
                      color: '#FFF',
                      fontFamily: SERIF_FONT,
                    }}
                  >
                    Active
                  </span>
                )}
              </div>
              <p
                className="text-xs italic mb-2"
                style={{ color: m.color, fontFamily: SERIF_FONT }}
              >
                {m.tagline}
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: N.inkSoft }}
              >
                {m.philosophy}
              </p>
            </button>
          );
        })}
      </div>

      <p className="text-xs mt-5 italic" style={{ color: N.muteFaint }}>
        Your choice saves instantly to this browser. Existing client
        practice assignments are preserved across switches — they keep
        whatever practice they were on.
      </p>

      {/* When Custom is active, the editor opens up below the picker. */}
      {active.id === 'custom' && <CustomLibraryEditor />}
    </article>
  );
}

/** Custom library editor — shown when the coach picks the "Custom"
 *  methodology. Lets them either start fresh OR copy one of the
 *  ready-made methodologies as a base, then add / edit / delete habits.
 *  All edits are stored in localStorage via useCustomLibrary(). */
function CustomLibraryEditor() {
  const [library, setLibrary] = useCustomLibrary();
  const [showAddForm, setShowAddForm] = useState<1 | 2 | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const baseMethodologies = METHODOLOGIES.filter(
    (m) => m.id !== 'custom' && m.practices.length > 0,
  );

  function copyFromMethodology(id: Methodology['id']) {
    const base = METHODOLOGY_BY_ID[id];
    if (!base) return;
    const replace =
      library.practices.length === 0 ||
      window.confirm(
        `Copy ${base.label}'s habit library? This replaces your current ${library.practices.length} custom habit(s).`,
      );
    if (!replace) return;
    setLibrary({
      // Prefix the id so they don't collide with the original methodology's
      // ids (which still live in the aggregate NUTRITION_PRACTICES lookup).
      practices: base.practices.map((p) => ({ ...p, id: `c-${p.id}` })),
      skills: base.skills,
      baseFrom: id,
    });
  }

  function startBlank() {
    if (
      library.practices.length > 0 &&
      !window.confirm('Clear your current custom habits and start blank?')
    ) {
      return;
    }
    setLibrary({ practices: [] });
  }

  function clearAll() {
    if (!window.confirm('Delete every custom habit? This can\'t be undone.')) return;
    setLibrary({ practices: [] });
  }

  function addHabit(p: NutritionPractice) {
    setLibrary({
      ...library,
      practices: [...library.practices, p],
    });
    setShowAddForm(null);
  }

  function updateHabit(id: string, patch: Partial<NutritionPractice>) {
    setLibrary({
      ...library,
      practices: library.practices.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    });
    setEditingId(null);
  }

  function deleteHabit(id: string) {
    if (!window.confirm('Delete this habit?')) return;
    setLibrary({
      ...library,
      practices: library.practices.filter((p) => p.id !== id),
    });
  }

  const skills =
    library.skills && library.skills.length > 0
      ? library.skills
      : METHODOLOGY_BY_ID.custom.skills;

  return (
    <section
      className="mt-8 pt-7 border-t"
      style={{ borderColor: N.rule }}
    >
      <h3
        className="leading-tight mb-2"
        style={{
          fontFamily: SERIF_FONT,
          color: N.ink,
          fontSize: '1.5rem',
          fontWeight: 600,
        }}
      >
        Build your custom library
      </h3>
      <p className="text-sm leading-relaxed mb-5" style={{ color: N.inkSoft }}>
        Start from scratch, or copy a ready-made methodology as a base
        and edit it to fit how you actually coach.
      </p>

      {/* Copy-from buttons */}
      <div
        className="rounded-xl p-4 mb-5"
        style={{ background: N.inset, border: `1px solid ${N.rule}` }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.3em] font-semibold mb-2"
          style={{ color: N.mute }}
        >
          Copy from a methodology as your base
        </p>
        <div className="flex flex-wrap gap-2">
          {baseMethodologies.map((m) => (
            <button
              key={m.id}
              onClick={() => copyFromMethodology(m.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md"
              style={{
                background: 'transparent',
                color: m.color,
                border: `1px solid ${m.color}`,
              }}
            >
              Copy {m.shortLabel}'s habits
            </button>
          ))}
          <button
            onClick={startBlank}
            className="text-xs font-semibold px-3 py-1.5 rounded-md"
            style={{
              background: 'transparent',
              color: N.mute,
              border: `1px dashed ${N.rule}`,
            }}
          >
            ← Start blank
          </button>
        </div>
        {library.baseFrom && (
          <p className="text-xs italic mt-3" style={{ color: N.mute }}>
            Currently based on{' '}
            <strong style={{ color: METHODOLOGY_BY_ID[library.baseFrom].color }}>
              {METHODOLOGY_BY_ID[library.baseFrom].label}
            </strong>{' '}
            — edit, add, or delete any habit below.
          </p>
        )}
      </div>

      {/* The library — grouped by Level */}
      {library.practices.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: N.card, border: `1px dashed ${N.rule}` }}
        >
          <p className="text-sm italic mb-4" style={{ color: N.mute }}>
            Your custom library is empty. Copy a methodology above, or
            add your first habit below.
          </p>
          <button
            onClick={() => setShowAddForm(1)}
            className="px-4 py-2 rounded-md text-[11px] uppercase tracking-[0.3em] italic"
            style={{
              background: N.sage,
              color: '#FFF',
              fontFamily: SERIF_FONT,
            }}
          >
            + Add your first habit
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {([1, 2] as const).map((lvl) => {
            const levelPractices = library.practices
              .filter((p) => p.level === lvl)
              .sort((a, b) => a.order - b.order);
            return (
              <div key={lvl}>
                <div className="flex items-center justify-between mb-2">
                  <h4
                    className="text-[10px] uppercase tracking-[0.3em] font-semibold"
                    style={{ color: lvl === 1 ? '#D87456' : '#6B8E5A' }}
                  >
                    Level {lvl} · {lvl === 1 ? 'Foundational' : 'Refinement'} ({levelPractices.length})
                  </h4>
                  <button
                    onClick={() => {
                      setShowAddForm(lvl);
                      setEditingId(null);
                    }}
                    className="text-xs font-semibold"
                    style={{ color: N.coral }}
                  >
                    + Add to Level {lvl}
                  </button>
                </div>

                {levelPractices.length === 0 ? (
                  <p className="text-xs italic py-2" style={{ color: N.muteFaint }}>
                    No Level {lvl} habits yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {levelPractices.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-lg p-3"
                        style={{
                          background: N.card,
                          border: `1px solid ${N.rule}`,
                        }}
                      >
                        {editingId === p.id ? (
                          <HabitForm
                            initial={p}
                            skills={skills}
                            level={p.level}
                            onSave={(patch) => updateHabit(p.id, patch)}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p
                                className="font-semibold text-sm leading-tight"
                                style={{ color: N.ink }}
                              >
                                {p.label}
                              </p>
                              <p
                                className="text-xs italic mt-0.5"
                                style={{ color: N.mute }}
                              >
                                {p.blurb}
                              </p>
                              <p
                                className="text-[10px] uppercase tracking-[0.2em] mt-1"
                                style={{ color: N.muteFaint }}
                              >
                                {skills.find((s) => s.id === p.skillId)?.label ?? p.skillId}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingId(p.id);
                                  setShowAddForm(null);
                                }}
                                className="text-xs font-semibold"
                                style={{ color: N.sageDeep }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteHabit(p.id)}
                                className="text-xs font-semibold"
                                style={{ color: N.danger }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {showAddForm === lvl && (
                  <div
                    className="rounded-lg p-3 mt-2"
                    style={{
                      background: N.card,
                      border: `1px solid ${N.coral}`,
                    }}
                  >
                    <HabitForm
                      initial={null}
                      skills={skills}
                      level={lvl}
                      onSave={(p) =>
                        addHabit({
                          ...p,
                          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        })
                      }
                      onCancel={() => setShowAddForm(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2">
            <button
              onClick={clearAll}
              className="text-xs italic"
              style={{ color: N.danger }}
            >
              Clear everything and start over
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** A single habit-add / habit-edit form. Used in CustomLibraryEditor. */
function HabitForm({
  initial,
  skills,
  level,
  onSave,
  onCancel,
}: {
  initial: NutritionPractice | null;
  skills: NutritionSkill[];
  level: 1 | 2;
  onSave: (p: NutritionPractice) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [blurb, setBlurb] = useState(initial?.blurb ?? '');
  const [rationale, setRationale] = useState(initial?.rationale ?? '');
  const [measure, setMeasure] = useState(initial?.measure ?? 'yes/no per day');
  const [skillId, setSkillId] = useState(
    initial?.skillId ?? skills[0]?.id ?? 'custom-foundational',
  );

  function handleSave() {
    if (!label.trim()) {
      alert('Habit name is required.');
      return;
    }
    onSave({
      id: initial?.id ?? '',
      label: label.trim(),
      blurb: blurb.trim() || label.trim(),
      rationale: rationale.trim() || 'Coach-defined habit.',
      measure: measure.trim() || 'yes/no per day',
      skillId,
      level,
      order: initial?.order ?? 99,
    });
  }

  return (
    <div className="space-y-2">
      <div>
        <Lbl>Habit name</Lbl>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Drink a glass of water on waking"
          autoFocus
          className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
          style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
        />
      </div>
      <div>
        <Lbl>Short description (1 sentence)</Lbl>
        <input
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          placeholder="What the client actually does, day-to-day."
          className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
          style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
        />
      </div>
      <div>
        <Lbl>Why this matters (rationale)</Lbl>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={2}
          placeholder="Why you assign this habit. Shown to the coach."
          className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
          style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Lbl>Skill (category)</Lbl>
          <select
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
            style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
          >
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Lbl>How clients log it</Lbl>
          <input
            value={measure}
            onChange={(e) => setMeasure(e.target.value)}
            placeholder="e.g., yes/no per meal"
            className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
            style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          className="px-3 py-1.5 rounded-md text-xs font-semibold"
          style={{ background: N.sage, color: '#FFF' }}
        >
          {initial ? 'Save changes' : 'Add habit'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-xs font-semibold"
          style={{ background: 'transparent', color: N.mute }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function PracticeIdentity({
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
    <article>
      <SectionTitle>The Practice</SectionTitle>
      <p
        className="italic leading-relaxed mb-5"
        style={{ color: N.inkSoft, fontFamily: SERIF_FONT, fontSize: '1.05rem' }}
      >
        What you call your practice shows up in your client portal, your
        public page, and at the top of every check-in email you send.
      </p>
      <Lbl>Practice name</Lbl>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Verdant Nutrition"
        className="w-full max-w-md px-3 py-2 text-sm rounded-md focus:outline-none mb-3"
        style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
      />
      <div>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="px-4 py-2 rounded-md text-[11px] uppercase tracking-[0.3em] italic disabled:opacity-50"
          style={{ background: N.sage, color: '#FFF', fontFamily: SERIF_FONT }}
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </article>
  );
}

function CoachProfile({
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
    <article>
      <SectionTitle>You, the Coach</SectionTitle>
      <p
        className="italic leading-relaxed mb-5"
        style={{ color: N.inkSoft, fontFamily: SERIF_FONT, fontSize: '1.05rem' }}
      >
        Tend to the details — your name as clients know it, your phone for
        urgent messages, the timezone we should use when timestamping
        check-ins.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <Field label="Full name" value={form.full_name ?? ''} onChange={(v) => setForm({ ...form, full_name: v })} />
        <Field label="Phone" value={form.phone ?? ''} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Timezone" value={form.timezone ?? ''} onChange={(v) => setForm({ ...form, timezone: v })} />
        <Field label="Currency" value={form.currency ?? 'USD'} onChange={(v) => setForm({ ...form, currency: v })} />
        <label
          className="sm:col-span-2 inline-flex items-center gap-2 text-sm italic"
          style={{ color: N.ink, fontFamily: SERIF_FONT }}
        >
          <input
            type="checkbox"
            checked={!!form.notify_email}
            onChange={(e) => setForm({ ...form, notify_email: e.target.checked })}
          />
          Email me when a client books, cancels, or sends a check-in
        </label>
      </div>
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="mt-4 px-4 py-2 rounded-md text-[11px] uppercase tracking-[0.3em] italic disabled:opacity-50"
        style={{ background: N.sage, color: '#FFF', fontFamily: SERIF_FONT }}
      >
        {save.isPending ? 'Saving…' : 'Save profile'}
      </button>
    </article>
  );
}

/** Nutrition-specific defaults that drive how the app behaves for
 *  this coach. V1 stores these in localStorage; V2 will persist them
 *  to the trainers row. */
function CoachingDefaults() {
  const [practiceWindow, setPracticeWindow] = useLocalStorageNum('nutrition-practice-window', 14);
  const [checkInCadence, setCheckInCadence] = useLocalStorageStr('nutrition-checkin-cadence', 'weekly');
  const [sessionLength, setSessionLength] = useLocalStorageNum('nutrition-session-length', 30);
  const [autoReminder, setAutoReminder] = useLocalStorageBool('nutrition-auto-reminder', true);

  return (
    <article>
      <SectionTitle>Coaching defaults</SectionTitle>
      <p
        className="text-sm leading-relaxed mb-5"
        style={{ color: N.inkSoft }}
      >
        How long is a practice window? How often does a client check in?
        These set the defaults for every new client — you can always override
        per client.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <NumField
          label="Practice window (days)"
          value={practiceWindow}
          onChange={setPracticeWindow}
          help="PN's standard is 14. Most practices stay at 14."
        />
        <SelectField
          label="Default check-in cadence"
          value={checkInCadence}
          onChange={setCheckInCadence}
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'biweekly', label: 'Every 2 weeks' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
        <NumField
          label="Default session length (min)"
          value={sessionLength}
          onChange={setSessionLength}
          help="30 min is standard for weekly check-in calls."
        />
        <ToggleField
          label="Auto-remind clients before sessions"
          value={autoReminder}
          onChange={setAutoReminder}
          help="Email + push notifications. Coming online once the client portal ships."
        />
      </div>
      <p className="text-xs mt-4" style={{ color: N.muteFaint }}>
        These settings save to your browser instantly. No save button needed.
      </p>
    </article>
  );
}

function UnitsCadence() {
  const [units, setUnits] = useLocalStorageStr('nutrition-units', 'imperial');
  const [weekStart, setWeekStart] = useLocalStorageStr('nutrition-week-start', 'monday');
  const [tempScale, setTempScale] = useLocalStorageStr('nutrition-temp-scale', 'f');
  const [dateFormat, setDateFormat] = useLocalStorageStr('nutrition-date-format', 'us');

  return (
    <article>
      <SectionTitle>Units & display</SectionTitle>
      <p className="text-sm leading-relaxed mb-5" style={{ color: N.inkSoft }}>
        Personal preferences. These affect the units the app shows you —
        clients still see what makes sense in their region.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <SelectField
          label="Weight & height units"
          value={units}
          onChange={setUnits}
          options={[
            { value: 'imperial', label: 'Pounds & inches' },
            { value: 'metric', label: 'Kilograms & cm' },
          ]}
        />
        <SelectField
          label="Week starts on"
          value={weekStart}
          onChange={setWeekStart}
          options={[
            { value: 'monday', label: 'Monday' },
            { value: 'sunday', label: 'Sunday' },
          ]}
        />
        <SelectField
          label="Temperature"
          value={tempScale}
          onChange={setTempScale}
          options={[
            { value: 'f', label: 'Fahrenheit' },
            { value: 'c', label: 'Celsius' },
          ]}
        />
        <SelectField
          label="Date format"
          value={dateFormat}
          onChange={setDateFormat}
          options={[
            { value: 'us', label: 'MM/DD/YYYY' },
            { value: 'eu', label: 'DD/MM/YYYY' },
            { value: 'iso', label: 'YYYY-MM-DD' },
          ]}
        />
      </div>
      <p className="text-xs mt-4" style={{ color: N.muteFaint }}>
        These settings save to your browser instantly. No save button needed.
      </p>
    </article>
  );
}

// Tiny local-storage helpers — V1 persistence layer for nutrition
// settings. V2 will move these onto the trainers row.
function useLocalStorageStr(key: string, initial: string): [string, (v: string) => void] {
  const [v, setV] = useState<string>(() => {
    if (typeof window === 'undefined') return initial;
    return window.localStorage.getItem(key) ?? initial;
  });
  return [
    v,
    (next: string) => {
      setV(next);
      if (typeof window !== 'undefined') window.localStorage.setItem(key, next);
    },
  ];
}
function useLocalStorageNum(key: string, initial: number): [number, (v: number) => void] {
  const [s, setS] = useLocalStorageStr(key, String(initial));
  return [parseInt(s, 10) || initial, (n: number) => setS(String(n))];
}
function useLocalStorageBool(key: string, initial: boolean): [boolean, (v: boolean) => void] {
  const [s, setS] = useLocalStorageStr(key, initial ? '1' : '0');
  return [s === '1', (b: boolean) => setS(b ? '1' : '0')];
}

function NumField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  help?: string;
}) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
        style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
      />
      {help && (
        <p className="text-xs mt-1" style={{ color: N.muteFaint }}>
          {help}
        </p>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  help?: string;
}) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
        style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && (
        <p className="text-xs mt-1" style={{ color: N.muteFaint }}>
          {help}
        </p>
      )}
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer" style={{ color: N.ink }}>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {value ? 'On' : 'Off'}
      </label>
      {help && (
        <p className="text-xs mt-1" style={{ color: N.muteFaint }}>
          {help}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="leading-tight mb-3 pb-2 border-b"
      style={{
        fontFamily: SERIF_FONT,
        color: N.ink,
        fontSize: '2rem',
        fontWeight: 600,
        borderColor: N.rule,
      }}
    >
      {children}
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
      <Lbl>{label}</Lbl>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
        style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
      />
    </label>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="block text-[10px] uppercase tracking-[0.25em] mb-1 italic"
      style={{ color: N.mute, fontFamily: SERIF_FONT }}
    >
      {children}
    </span>
  );
}

function SolarWrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article>
      <SectionTitle>{title}</SectionTitle>
      <div
        className="p-4 rounded-lg"
        style={{ background: '#FFFFFF', color: '#1E293B', border: `1px solid ${N.rule}` }}
      >
        {children}
      </div>
    </article>
  );
}
