import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Library } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Exercise } from '../../lib/database.types';

interface Props {
  open: boolean;
  onPick: (e: Exercise) => void;
  onClose: () => void;
}

const CATEGORIES: Array<{ value: Exercise['category']; label: string; color: string }> = [
  { value: null, label: 'All', color: 'bg-slate-100 text-slate-700' },
  { value: 'strength', label: 'Strength', color: 'bg-blue-100 text-blue-800' },
  { value: 'cardio', label: 'Cardio', color: 'bg-red-100 text-red-800' },
  { value: 'mobility', label: 'Mobility', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'plyo', label: 'Plyo', color: 'bg-purple-100 text-purple-800' },
  { value: 'core', label: 'Core', color: 'bg-amber-100 text-amber-800' },
];

export function ExercisePicker({ open, onPick, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Exercise['category']>(null);

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Exercise[];
    },
    enabled: open,
  });

  const filtered = useMemo(() => {
    let out = exercises;
    if (category) out = out.filter((e) => e.category === category);
    if (search.trim()) {
      const s = search.toLowerCase();
      out = out.filter(
        (e) =>
          e.name.toLowerCase().includes(s) ||
          (e.primary_muscle ?? '').toLowerCase().includes(s) ||
          (e.equipment ?? '').toLowerCase().includes(s),
      );
    }
    return out;
  }, [exercises, search, category]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Library size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">Pick an exercise</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, muscle, equipment…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.label}
                onClick={() => setCategory(c.value)}
                className={`px-2.5 py-1 text-xs rounded-full transition ${
                  category === c.value
                    ? 'bg-blue-600 text-white'
                    : `${c.color} hover:opacity-80`
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading library…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No matches. Try a different search.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => onPick(e)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-lg transition flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {[e.primary_muscle, e.equipment, `${e.default_sets}×${e.default_reps}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    {e.category && (
                      <span
                        className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0 ${
                          CATEGORIES.find((c) => c.value === e.category)?.color || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {e.category}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 text-center">
          {filtered.length} of {exercises.length} exercises
        </div>
      </div>
    </div>
  );
}
