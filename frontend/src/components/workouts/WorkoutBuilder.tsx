import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Plus,
  Trash2,
  Library,
  GripVertical,
  Save,
  ClipboardList,
  Trash,
  Copy,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client, Exercise, ExerciseBlock, WorkoutPlan } from '../../lib/database.types';
import { ExercisePicker } from './ExercisePicker';

interface Props {
  open: boolean;
  // Edit mode: pass an existing plan
  plan?: WorkoutPlan;
  // Create mode: optional pre-selected client
  initialClientId?: string;
  onClose: () => void;
}

export function WorkoutBuilder({ open, plan, initialClientId, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string>(initialClientId ?? '');
  const [isTemplate, setIsTemplate] = useState(false);
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return;
    if (plan) {
      setName(plan.name);
      setDescription(plan.description ?? '');
      setClientId(plan.client_id ?? '');
      setIsTemplate(plan.is_template);
      setBlocks(plan.exercises ?? []);
    } else {
      setName('');
      setDescription('');
      setClientId(initialClientId ?? '');
      setIsTemplate(!initialClientId);
      setBlocks([]);
    }
  }, [open, plan, initialClientId]);

  const { data: clients } = useQuery({
    queryKey: ['clients-for-workout-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, status')
        .neq('status', 'archived')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Pick<Client, 'id' | 'full_name' | 'status'>[];
    },
    enabled: open,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!name.trim()) throw new Error('Plan needs a name');
      if (blocks.length === 0) throw new Error('Add at least one exercise');
      if (!isTemplate && !clientId) throw new Error('Pick a client or save as template');

      const row = {
        trainer_id: user.id,
        client_id: isTemplate ? null : clientId,
        name: name.trim(),
        description: description.trim() || null,
        exercises: blocks,
        is_template: isTemplate,
      };

      if (plan) {
        const { error } = await supabase.from('workout_plans').update(row).eq('id', plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('workout_plans').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-plans'] });
      qc.invalidateQueries({ queryKey: ['client-workouts'] });
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!plan) return;
      const { error } = await supabase.from('workout_plans').delete().eq('id', plan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-plans'] });
      qc.invalidateQueries({ queryKey: ['client-workouts'] });
      onClose();
    },
  });

  function addBlockFromExercise(e: Exercise) {
    setBlocks((b) => [
      ...b,
      {
        name: e.name,
        sets: e.default_sets,
        reps: e.default_reps,
        weight: null,
        rest_sec: e.default_rest_sec,
        notes: null,
      },
    ]);
    setPickerOpen(false);
  }

  function addBlankBlock() {
    setBlocks((b) => [...b, { name: '', sets: 3, reps: '8-12', weight: null, rest_sec: 60, notes: null }]);
  }

  function update(idx: number, patch: Partial<ExerciseBlock>) {
    setBlocks((b) => b.map((blk, i) => (i === idx ? { ...blk, ...patch } : blk)));
  }

  function removeBlock(idx: number) {
    setBlocks((b) => b.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: -1 | 1) {
    setBlocks((b) => {
      const target = idx + dir;
      if (target < 0 || target >= b.length) return b;
      const out = [...b];
      [out[idx], out[target]] = [out[target], out[idx]];
      return out;
    });
  }

  function duplicate(idx: number) {
    setBlocks((b) => [...b.slice(0, idx + 1), { ...b[idx] }, ...b.slice(idx + 1)]);
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardList size={20} className="text-blue-600" />
              <h2 className="font-semibold text-slate-900">
                {plan ? 'Edit workout plan' : 'New workout plan'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Plan name</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah — marathon base, week 4"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Assign to</label>
                <div className="flex items-center gap-2">
                  <select
                    value={isTemplate ? '__template' : clientId}
                    onChange={(e) => {
                      if (e.target.value === '__template') {
                        setIsTemplate(true);
                        setClientId('');
                      } else {
                        setIsTemplate(false);
                        setClientId(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="__template">— Save as template (no client) —</option>
                    {clients?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Goal of this workout, any cues, etc."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* blocks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">
                  Exercises ({blocks.length})
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg"
                  >
                    <Library size={12} /> From library
                  </button>
                  <button
                    onClick={addBlankBlock}
                    className="flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg"
                  >
                    <Plus size={12} /> Custom
                  </button>
                </div>
              </div>

              {blocks.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500">Add exercises from the library or build custom ones.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {blocks.map((b, i) => (
                    <BlockRow
                      key={i}
                      idx={i}
                      total={blocks.length}
                      block={b}
                      onChange={(patch) => update(i, patch)}
                      onRemove={() => removeBlock(i)}
                      onMoveUp={() => move(i, -1)}
                      onMoveDown={() => move(i, 1)}
                      onDuplicate={() => duplicate(i)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {save.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {(save.error as Error).message}
              </div>
            )}
          </div>

          {/* footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
            <div>
              {plan && (
                <button
                  onClick={() => {
                    if (confirm(`Delete "${plan.name}"? This cannot be undone.`)) remove.mutate();
                  }}
                  disabled={remove.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                <Save size={14} />
                {save.isPending ? 'Saving…' : plan ? 'Save changes' : 'Create plan'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onPick={addBlockFromExercise}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

function BlockRow({
  idx,
  total,
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}: {
  idx: number;
  total: number;
  block: ExerciseBlock;
  onChange: (p: Partial<ExerciseBlock>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
}) {
  const inputCls =
    'px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <li className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center text-slate-300 pt-1">
          <button
            onClick={onMoveUp}
            disabled={idx === 0}
            className="text-xs disabled:opacity-30 hover:text-slate-600"
          >
            ▲
          </button>
          <GripVertical size={14} />
          <button
            onClick={onMoveDown}
            disabled={idx === total - 1}
            className="text-xs disabled:opacity-30 hover:text-slate-600"
          >
            ▼
          </button>
        </div>

        <div className="flex-1 space-y-2">
          <input
            value={block.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Exercise name"
            className={`w-full font-medium ${inputCls}`}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <FieldNum
              label="Sets"
              value={block.sets}
              onChange={(v) => onChange({ sets: v ?? 1 })}
            />
            <Field
              label="Reps"
              value={String(block.reps)}
              onChange={(v) => onChange({ reps: v })}
            />
            <FieldNum
              label="Weight"
              value={block.weight ?? null}
              placeholder="—"
              onChange={(v) => onChange({ weight: v })}
            />
            <FieldNum
              label="Rest (sec)"
              value={block.rest_sec ?? null}
              onChange={(v) => onChange({ rest_sec: v })}
            />
          </div>
          <input
            value={block.notes ?? ''}
            onChange={(e) => onChange({ notes: e.target.value || null })}
            placeholder="Notes / cues (e.g. 'tempo 3-1-X-1', 'last set AMRAP')"
            className={`w-full text-xs ${inputCls}`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={onDuplicate}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
            title="Duplicate"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Remove"
          >
            <Trash size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-xs text-slate-600">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-0.5 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function FieldNum({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-xs text-slate-600">
      {label}
      <input
        type="number"
        step="0.5"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : Number(v));
        }}
        placeholder={placeholder}
        className="w-full mt-0.5 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
