import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, Check, Plus, Trash, ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { ExerciseBlock, WorkoutPlan } from '../../lib/database.types';

interface Props {
  open: boolean;
  // The session being logged for
  sessionId: string;
  clientId: string;
  trainerId: string;
  onClose: () => void;
}

interface ActualSet {
  reps: number | null;
  weight: number | null;
  rpe?: number | null;
  done?: boolean;
}

interface ActualBlock {
  name: string;
  notes: string | null;
  sets: ActualSet[];
}

// Convert a planned ExerciseBlock into the per-set log shape
function expandPlanned(block: ExerciseBlock): ActualBlock {
  const setsCount = Math.max(1, block.sets || 1);
  const repsHint = typeof block.reps === 'number' ? block.reps : Number(String(block.reps).replace(/\D/g, '')) || null;
  return {
    name: block.name,
    notes: block.notes,
    sets: Array.from({ length: setsCount }, () => ({
      reps: repsHint,
      weight: block.weight ?? null,
      rpe: null,
      done: false,
    })),
  };
}

export function WorkoutLoggerModal({ open, sessionId, clientId, trainerId, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [planId, setPlanId] = useState<string | null>(null);
  const [actuals, setActuals] = useState<ActualBlock[]>([]);
  const [overallNotes, setOverallNotes] = useState('');
  const [overallRpe, setOverallRpe] = useState<number | ''>('');

  // Pull the client's plans (most recent first)
  const { data: plans = [] } = useQuery({
    queryKey: ['client-plans-for-logger', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as WorkoutPlan[];
    },
    enabled: open,
  });

  // When a plan is picked, expand its blocks into actual logs
  useEffect(() => {
    if (!planId) return;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    setActuals(plan.exercises.map(expandPlanned));
  }, [planId, plans]);

  // Auto-pick the most recent plan when modal opens
  useEffect(() => {
    if (!open) return;
    if (planId) return;
    if (plans.length > 0) setPlanId(plans[0].id);
  }, [open, plans, planId]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      // Build exercises_actual snapshot
      const exercises_actual = actuals.map((b) => ({
        name: b.name,
        notes: b.notes,
        sets: b.sets.map((s) => ({
          reps: s.reps,
          weight: s.weight,
          rpe: s.rpe ?? null,
          done: s.done ?? false,
        })),
      }));
      const { error } = await supabase.from('workout_logs').insert({
        trainer_id: trainerId,
        client_id: clientId,
        session_id: sessionId,
        plan_id: planId,
        exercises_actual,
        rpe: overallRpe === '' ? null : Number(overallRpe),
        notes: overallNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-log', sessionId] });
      qc.invalidateQueries({ queryKey: ['client-workouts'] });
      onClose();
    },
  });

  if (!open) return null;

  function updateSet(blockIdx: number, setIdx: number, patch: Partial<ActualSet>) {
    setActuals((arr) =>
      arr.map((b, i) =>
        i === blockIdx ? { ...b, sets: b.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) } : b,
      ),
    );
  }
  function addSet(blockIdx: number) {
    setActuals((arr) =>
      arr.map((b, i) =>
        i === blockIdx ? { ...b, sets: [...b.sets, { reps: null, weight: null, rpe: null, done: false }] } : b,
      ),
    );
  }
  function removeSet(blockIdx: number, setIdx: number) {
    setActuals((arr) =>
      arr.map((b, i) => (i === blockIdx ? { ...b, sets: b.sets.filter((_, j) => j !== setIdx) } : b)),
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">Log workout</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Plan</label>
            <select
              value={planId ?? ''}
              onChange={(e) => setPlanId(e.target.value || null)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— No plan, log freeform —</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {actuals.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm text-slate-500 mb-2">
                Pick a plan above, or add a freeform exercise.
              </p>
              <button
                onClick={() =>
                  setActuals([
                    {
                      name: '',
                      notes: null,
                      sets: [{ reps: null, weight: null, rpe: null, done: false }],
                    },
                  ])
                }
                className="text-xs bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg"
              >
                + Add freeform
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {actuals.map((b, bi) => (
                <li key={bi} className="bg-slate-50 rounded-xl p-3">
                  <input
                    value={b.name}
                    onChange={(e) =>
                      setActuals((arr) =>
                        arr.map((x, i) => (i === bi ? { ...x, name: e.target.value } : x)),
                      )
                    }
                    placeholder="Exercise"
                    className="w-full font-medium px-2 py-1 mb-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="text-left w-8">#</th>
                        <th className="text-left">Reps</th>
                        <th className="text-left">Weight</th>
                        <th className="text-left">RPE</th>
                        <th className="w-8"></th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.sets.map((s, si) => (
                        <tr key={si}>
                          <td className="text-slate-400 text-xs">{si + 1}</td>
                          <td>
                            <input
                              type="number"
                              value={s.reps ?? ''}
                              onChange={(e) =>
                                updateSet(bi, si, { reps: e.target.value ? Number(e.target.value) : null })
                              }
                              className="w-20 px-1.5 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.5"
                              value={s.weight ?? ''}
                              onChange={(e) =>
                                updateSet(bi, si, { weight: e.target.value ? Number(e.target.value) : null })
                              }
                              className="w-20 px-1.5 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              step="0.5"
                              value={s.rpe ?? ''}
                              onChange={(e) =>
                                updateSet(bi, si, { rpe: e.target.value ? Number(e.target.value) : null })
                              }
                              placeholder="—"
                              className="w-16 px-1.5 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td>
                            <button
                              onClick={() => updateSet(bi, si, { done: !s.done })}
                              className={`p-1 rounded ${
                                s.done ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 text-slate-400 hover:text-emerald-600'
                              }`}
                              title="Mark set complete"
                            >
                              <Check size={12} />
                            </button>
                          </td>
                          <td>
                            <button
                              onClick={() => removeSet(bi, si)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                              title="Remove set"
                            >
                              <Trash size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => addSet(bi)}
                      className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <Plus size={12} /> Add set
                    </button>
                    <button
                      onClick={() => setActuals((arr) => arr.filter((_, i) => i !== bi))}
                      className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-600 ml-auto"
                    >
                      <Trash size={12} /> Remove exercise
                    </button>
                  </div>
                </li>
              ))}
              <li>
                <button
                  onClick={() =>
                    setActuals((arr) => [
                      ...arr,
                      { name: '', notes: null, sets: [{ reps: null, weight: null, rpe: null, done: false }] },
                    ])
                  }
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl py-2 text-sm text-slate-600"
                >
                  + Add another exercise
                </button>
              </li>
            </ul>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Overall RPE (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                step="0.5"
                value={overallRpe}
                onChange={(e) => setOverallRpe(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <input
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
                placeholder="How did the session go?"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {save.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {(save.error as Error).message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || actuals.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            <Save size={14} />
            {save.isPending ? 'Saving…' : 'Save log'}
          </button>
        </div>
      </div>
    </div>
  );
}
