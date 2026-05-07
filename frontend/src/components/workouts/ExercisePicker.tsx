import { useEffect, useMemo, useState } from 'react';
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

const PAGE_SIZE = 60;

interface Item {
  id: string;
  name: string;
}

// Quirk we tripped over: this Supabase project's PostgREST + the GIN trigram
// index on exercises.name interact badly with multi-row SELECTs that include
// MORE THAN TWO COLUMNS — they consistently 10s-timeout regardless of row
// count, response size, or filter. Fetching just (id, name) is rock solid.
// So the list uses a narrow query, and we fetch the full row only when the
// user actually picks one (single-row queries always work).
export function ExercisePicker({ open, onPick, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<Exercise['category']>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setDebounced('');
      setCategory(null);
    }
  }, [open]);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['exercises-list', debounced, category],
    queryFn: async () => {
      let q = supabase.from('exercises').select('id,name').limit(PAGE_SIZE);
      if (category) q = q.eq('category', category);
      if (debounced.trim()) q = q.ilike('name', `%${debounced.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as Item[]).slice().sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: open,
    staleTime: 60_000,
  });

  // Optional: as we scroll, batch-fetch the rest of the columns for the
  // visible items. We do this in tiny chunks of 1 row at a time because
  // multi-row queries trip the bug above. Cached forever once fetched.
  // (Cosmetic only — list still works without this.)
  const detailMap = useDetailFetcher(items, open);

  async function handlePick(item: Item) {
    setPicking(true);
    try {
      // Single-row fetch reliably works
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', item.id)
        .single();
      if (error) throw error;
      onPick(data as Exercise);
    } finally {
      setPicking(false);
    }
  }

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
              placeholder="Search by name…"
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
          ) : error ? (
            <div className="text-sm text-red-600 text-center py-8 px-3">
              <p className="font-medium">Couldn't load exercises.</p>
              <p className="text-xs mt-1 text-red-500">{(error as Error).message}</p>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              {debounced ? `No matches for "${debounced}".` : 'No exercises in your library yet.'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((it) => {
                const detail = detailMap.get(it.id);
                return (
                  <li key={it.id}>
                    <button
                      disabled={picking}
                      onClick={() => handlePick(it)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-lg transition flex items-start gap-3 disabled:opacity-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{it.name}</p>
                        {detail && (
                          <p className="text-xs text-slate-500 truncate">
                            {[detail.primary_muscle, detail.equipment, `${detail.default_sets}×${detail.default_reps}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                      {detail?.category && (
                        <span
                          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0 ${
                            CATEGORIES.find((c) => c.value === detail.category)?.color || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {detail.category}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 text-center">
          {items.length} shown {items.length === PAGE_SIZE ? '· refine search to see more' : ''}
        </div>
      </div>
    </div>
  );
}

// Backfills detail (category, muscle, equipment, default sets/reps) for items
// in the visible list, one row at a time. Works around the multi-row + extra-
// column quirk by always querying a single row. Cached in module-level Map so
// switching categories doesn't re-fetch.
const detailCache = new Map<string, Exercise>();
function useDetailFetcher(items: Item[], enabled: boolean): Map<string, Exercise> {
  const [, force] = useState(0);
  useEffect(() => {
    if (!enabled || items.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const it of items) {
        if (cancelled) return;
        if (detailCache.has(it.id)) continue;
        const { data } = await supabase
          .from('exercises')
          .select('id,name,category,primary_muscle,equipment,default_sets,default_reps,default_rest_sec')
          .eq('id', it.id)
          .single();
        if (data) {
          detailCache.set(it.id, data as Exercise);
          if (!cancelled) force((n) => n + 1);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items, enabled]);
  return useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const it of items) {
      const d = detailCache.get(it.id);
      if (d) m.set(it.id, d);
    }
    return m;
  }, [items]);
}
