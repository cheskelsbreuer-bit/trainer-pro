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
import { INTAKE_SECTIONS, type IntakeQuestion } from '../lib/intakeQuestions';


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
          {INTAKE_SECTIONS.map((section) => (
            <section
              key={section.id}
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
                {section.purpose && (
                  <p
                    className="text-xs italic mt-1"
                    style={{ color: N.mute, fontFamily: SERIF_FONT }}
                  >
                    {section.purpose}
                  </p>
                )}
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
                    {renderField(q, answers[q.id] ?? '', (v) => setAnswer(q.id, v))}
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

// ── Field renderer ─────────────────────────────────────────────────
//
// Dispatches on q.type. Supports: text, textarea, select, multiselect,
// number, date, scale_1_10. Multi-select stores values as a JSON array
// stringified (so we can keep the answers map flat as Record<string,
// string>).

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg focus:outline-none';
const inputStyle: React.CSSProperties = {
  background: N.inset,
  color: N.ink,
  border: `1px solid ${N.rule}`,
};

function renderField(
  q: IntakeQuestion,
  value: string,
  onChange: (v: string) => void,
): React.ReactNode {
  switch (q.type) {
    case 'textarea':
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={inputCls}
          style={inputStyle}
        />
      );
    case 'select':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
        >
          <option value="">—</option>
          {q.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case 'multiselect': {
      const selected: string[] = (() => {
        try {
          return JSON.parse(value || '[]');
        } catch {
          return [];
        }
      })();
      function toggle(opt: string) {
        const next = selected.includes(opt)
          ? selected.filter((s) => s !== opt)
          : [...selected, opt];
        onChange(JSON.stringify(next));
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {q.options?.map((o) => {
            const on = selected.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => toggle(o)}
                className="text-xs px-3 py-1 rounded-full font-semibold"
                style={{
                  background: on ? N.coral : 'transparent',
                  color: on ? '#fff' : N.ink,
                  border: `1px solid ${on ? N.coral : N.rule}`,
                }}
              >
                {on ? '✓ ' : ''}{o}
              </button>
            );
          })}
        </div>
      );
    }
    case 'number':
      return (
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          style={{ ...inputStyle, maxWidth: 160 }}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          style={{ ...inputStyle, maxWidth: 200 }}
        />
      );
    case 'scale_1_10':
      return (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const sel = String(n) === value;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(String(n))}
                className="w-8 h-8 rounded-md text-sm font-semibold"
                style={{
                  background: sel ? N.coral : N.inset,
                  color: sel ? '#fff' : N.inkSoft,
                  border: `1px solid ${sel ? N.coral : N.rule}`,
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      );
    case 'text':
    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
        />
      );
  }
}
