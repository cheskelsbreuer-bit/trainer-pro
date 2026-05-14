// Per-client intake form — the new-client questionnaire that real
// nutrition coaches use before / during the first consult. Stores
// answers as a jsonb document in nutrition_intake so we don't have to
// define a rigid schema; the coach can iterate on the question set
// without database migrations.
//
// V1: coach picks a client from a dropdown and fills the intake
// themselves (during the first session, or transcribing client notes).
// V2 will expose this through the client portal so clients fill it
// themselves before the first call.

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { N, SERIF_FONT } from '../theme';
import { nutritionRpc } from '../lib/nutritionRpc';
import type { Client } from '../../lib/database.types';

interface IntakeQuestion {
  id: string;
  label: string;
  help?: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect';
  options?: string[];
  required?: boolean;
}

// Default question set — built from common PN / RD intake forms.
// A coach can override per-client if they want by editing answers
// inline; question definitions are fixed in V1.
const DEFAULT_QUESTIONS: { section: string; questions: IntakeQuestion[] }[] = [
  {
    section: 'The big picture',
    questions: [
      {
        id: 'why_now',
        label: 'Why are they here, and why now?',
        help: "What changed? What did this client try first that didn't work?",
        type: 'textarea',
        required: true,
      },
      {
        id: 'success',
        label: 'What does success look like in 3 months?',
        help: "Their words, not yours. The visible outcome they're after.",
        type: 'textarea',
      },
      {
        id: 'past_efforts',
        label: 'What have they tried in the past?',
        type: 'textarea',
      },
    ],
  },
  {
    section: 'Health & medical',
    questions: [
      {
        id: 'conditions',
        label: 'Any diagnosed conditions?',
        help: 'Diabetes, hypertension, thyroid, autoimmune, GI, etc.',
        type: 'textarea',
      },
      {
        id: 'medications',
        label: 'Current medications & supplements?',
        type: 'textarea',
      },
      {
        id: 'allergies',
        label: 'Food allergies or intolerances?',
        type: 'textarea',
      },
      {
        id: 'doctor_cleared',
        label: 'Cleared by a physician for nutrition work?',
        type: 'select',
        options: ['Yes', 'No', 'Not sure'],
      },
    ],
  },
  {
    section: 'Current eating',
    questions: [
      {
        id: 'typical_day',
        label: 'A typical day of eating (yesterday or last weekday)',
        help: 'Times, foods, rough portions. No judgment — just the truth.',
        type: 'textarea',
      },
      {
        id: 'cooks',
        label: 'Who cooks in the household?',
        type: 'text',
      },
      {
        id: 'eats_out',
        label: 'How often do they eat out / order in?',
        type: 'select',
        options: ['Rarely', '1-2x/week', '3-4x/week', '5+ times/week'],
      },
      {
        id: 'pattern',
        label: 'Eating pattern style?',
        type: 'select',
        options: [
          'Omnivore',
          'Pescatarian',
          'Vegetarian',
          'Vegan',
          'Mediterranean',
          'Keto / low-carb',
          'Other',
        ],
      },
    ],
  },
  {
    section: 'Lifestyle',
    questions: [
      {
        id: 'training',
        label: 'Movement / exercise routine',
        help: 'Type, frequency, intensity, duration.',
        type: 'textarea',
      },
      {
        id: 'sleep',
        label: 'Average sleep (hours/night)',
        type: 'text',
      },
      {
        id: 'stress',
        label: 'Current stress level (1-10) + what drives it',
        type: 'textarea',
      },
      {
        id: 'alcohol',
        label: 'Alcohol use',
        type: 'select',
        options: ['None', 'Rare (1-2x/month)', 'Social (weekends)', 'Most days'],
      },
    ],
  },
  {
    section: 'Coaching fit',
    questions: [
      {
        id: 'biggest_obstacle',
        label: "What's the biggest obstacle in their way right now?",
        type: 'textarea',
      },
      {
        id: 'support',
        label: 'Who supports them at home?',
        type: 'text',
      },
      {
        id: 'red_flags',
        label: 'Any red flags I should know about?',
        help: 'ED history, recent loss, major life changes, etc. Internal note.',
        type: 'textarea',
      },
    ],
  },
];

export function IntakePage() {
  const params = useParams<{ clientId?: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState<string>(
    params.clientId ?? '',
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const { data: clients } = useQuery({
    queryKey: ['nutrition-clients', user?.id],
    queryFn: () => nutritionRpc.clientsList(),
    enabled: !!user,
  });

  const { data: existing } = useQuery({
    queryKey: ['nutrition-intake', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      const { data, error } = await supabase
        .from('nutrition_intake')
        .select('*')
        .eq('client_id', selectedClientId)
        .maybeSingle();
      if (error) {
        if ((error.message ?? '').toLowerCase().includes('nutrition_intake')) {
          return null;
        }
        throw error;
      }
      return data;
    },
    enabled: !!selectedClientId,
  });

  // Hydrate answers when a client is picked
  useEffect(() => {
    if (existing && typeof existing === 'object' && 'answers' in existing) {
      setAnswers((existing as { answers: Record<string, string> }).answers ?? {});
      const c = (existing as { completed_at: string | null }).completed_at;
      if (c) setSavedAt(new Date(c));
    } else {
      setAnswers({});
      setSavedAt(null);
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!selectedClientId) throw new Error('Pick a client first');
      const { error } = await supabase.from('nutrition_intake').upsert(
        {
          trainer_id: user.id,
          client_id: selectedClientId,
          answers,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setSavedAt(new Date());
      qc.invalidateQueries({ queryKey: ['nutrition-intake', selectedClientId] });
    },
  });

  const selectedClient = useMemo(
    () => clients?.find((c: Client) => c.id === selectedClientId),
    [clients, selectedClientId],
  );

  function setAnswer(qid: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-3xl mx-auto">
      {params.clientId && (
        <Link
          to={`/clients/${params.clientId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 hover:opacity-80"
          style={{ color: N.mute }}
        >
          <ArrowLeft size={14} /> Back to client
        </Link>
      )}

      <section className="mb-6">
        <h1
          className="leading-tight"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: 'clamp(1.875rem, 3.5vw, 2.5rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          Intake form
        </h1>
        <p className="mt-1 text-sm" style={{ color: N.mute }}>
          The first-session questionnaire. Capture the why, the medical
          picture, the lifestyle. This becomes the reference for every
          coaching decision after.
        </p>
      </section>

      {/* Client picker — hidden when arrived via /clients/:id/intake */}
      {!params.clientId && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            background: N.card,
            border: `1px solid ${N.rule}`,
          }}
        >
          <label
            className="block text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: N.mute }}
          >
            Client
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
          >
            <option value="">Pick a client…</option>
            {(clients ?? []).map((c: Client) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedClient && (
        <p
          className="text-sm mb-6 px-1"
          style={{ color: N.inkSoft }}
        >
          Editing intake for{' '}
          <strong style={{ color: N.ink }}>{selectedClient.full_name}</strong>
          {savedAt && (
            <span style={{ color: N.sageDeep }} className="ml-2 inline-flex items-center gap-1">
              <CheckCircle2 size={12} /> last saved {savedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          )}
        </p>
      )}

      {!selectedClientId ? (
        <p className="text-sm text-center py-16" style={{ color: N.mute }}>
          Pick a client above to start the intake.
        </p>
      ) : (
        <div className="space-y-6">
          {DEFAULT_QUESTIONS.map((section) => (
            <section
              key={section.section}
              className="rounded-2xl overflow-hidden"
              style={{
                background: N.card,
                border: `1px solid ${N.rule}`,
                boxShadow: 'var(--nut-shadow)',
              }}
            >
              <header
                className="px-5 py-3 border-b"
                style={{ borderColor: N.rule }}
              >
                <h2
                  style={{
                    fontFamily: SERIF_FONT,
                    color: N.ink,
                    fontSize: '1.125rem',
                    fontWeight: 600,
                  }}
                >
                  {section.section}
                </h2>
              </header>
              <div className="p-5 space-y-4">
                {section.questions.map((q) => (
                  <div key={q.id}>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: N.ink }}
                    >
                      {q.label}
                      {q.required && (
                        <span style={{ color: N.coral }} className="ml-1">
                          *
                        </span>
                      )}
                    </label>
                    {q.help && (
                      <p
                        className="text-xs mb-2"
                        style={{ color: N.mute }}
                      >
                        {q.help}
                      </p>
                    )}
                    {q.type === 'textarea' ? (
                      <textarea
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                        style={{
                          background: N.inset,
                          color: N.ink,
                          border: `1px solid ${N.rule}`,
                        }}
                      />
                    ) : q.type === 'select' ? (
                      <select
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                        style={{
                          background: N.inset,
                          color: N.ink,
                          border: `1px solid ${N.rule}`,
                        }}
                      >
                        <option value="">—</option>
                        {q.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                        style={{
                          background: N.inset,
                          color: N.ink,
                          border: `1px solid ${N.rule}`,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Sticky-feeling save bar */}
          <div className="flex items-center justify-end gap-3 sticky bottom-0 py-3">
            {save.error && (
              <span className="text-xs" style={{ color: N.danger }}>
                {(save.error as Error).message}
              </span>
            )}
            {save.isSuccess && !save.isPending && (
              <span
                className="text-xs inline-flex items-center gap-1"
                style={{ color: N.sageDeep }}
              >
                <CheckCircle2 size={12} /> Saved
              </span>
            )}
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-semibold text-sm"
              style={{ background: N.coral, color: '#FFF' }}
            >
              <Save size={14} />
              {save.isPending ? 'Saving…' : 'Save intake'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
