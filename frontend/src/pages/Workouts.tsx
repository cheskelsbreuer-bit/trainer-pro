import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Dumbbell, ClipboardList, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { WorkoutBuilder } from '../components/workouts/WorkoutBuilder';
import type { WorkoutPlan, Client } from '../lib/database.types';

type Tab = 'assigned' | 'templates';

export function Workouts() {
  const [tab, setTab] = useState<Tab>('assigned');
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['workout-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*, clients(full_name)')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as (WorkoutPlan & { clients: { full_name: string } | null })[];
    },
  });

  const filtered = useMemo(() => {
    let out = plans;
    out = out.filter((p) => (tab === 'templates' ? p.is_template : !p.is_template));
    if (search.trim()) {
      const s = search.toLowerCase();
      out = out.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.description ?? '').toLowerCase().includes(s) ||
          (p.clients?.full_name ?? '').toLowerCase().includes(s),
      );
    }
    return out;
  }, [plans, tab, search]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Workout plans"
        subtitle="Build templates, assign to clients, log results."
        actions={
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm"
          >
            <Plus size={14} /> New plan
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="bg-slate-100 rounded-lg p-1 flex">
          <button
            onClick={() => setTab('assigned')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm transition ${
              tab === 'assigned' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-600'
            }`}
          >
            <Dumbbell size={14} /> Assigned
          </button>
          <button
            onClick={() => setTab('templates')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm transition ${
              tab === 'templates' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-600'
            }`}
          >
            <ClipboardList size={14} /> Templates
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans"
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <Dumbbell className="mx-auto text-slate-300 mb-2" size={40} />
          <p className="text-slate-500 mb-3">
            No {tab === 'assigned' ? 'assigned plans' : 'templates'} yet.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <Plus size={14} /> Create one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <PlanCard key={p.id} plan={p} onEdit={() => setEditing(p)} />
          ))}
        </div>
      )}

      <WorkoutBuilder
        open={creating}
        onClose={() => setCreating(false)}
      />
      {editing && (
        <WorkoutBuilder
          open={!!editing}
          plan={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onEdit,
}: {
  plan: WorkoutPlan & { clients: { full_name: string } | null };
  onEdit: () => void;
}) {
  const exerciseCount = (plan.exercises ?? []).length;
  return (
    <button
      onClick={onEdit}
      className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{plan.name}</p>
          <p className="text-xs text-slate-500 truncate">
            {plan.is_template
              ? 'Template'
              : plan.clients?.full_name
                ? `For ${plan.clients.full_name}`
                : 'Assigned'}
          </p>
        </div>
        {plan.is_template && (
          <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
            Template
          </span>
        )}
      </div>
      {plan.description && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{plan.description}</p>}
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Dumbbell size={12} /> {exerciseCount} exercise{exerciseCount === 1 ? '' : 's'}
        </span>
        <span className="ml-auto text-[11px]">
          Updated {new Date(plan.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </button>
  );
}

// Small "assigned plans" widget the ClientDetail page can drop in.
export function ClientWorkoutsPanel({ clientId }: { clientId: string }) {
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['client-workouts', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkoutPlan[];
    },
  });

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Dumbbell size={16} className="text-blue-600" />
          Workout plans
        </h3>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg"
        >
          <Plus size={12} /> Assign
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : plans.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">
          No plans yet.{' '}
          <button onClick={() => setCreating(true)} className="text-blue-600 hover:underline">
            Build one
          </button>{' '}
          or{' '}
          <Link to="/workouts" className="text-blue-600 hover:underline">
            duplicate a template
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-1.5">
          {plans.slice(0, 5).map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setEditing(p)}
                className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-blue-50 rounded-lg flex items-center gap-3 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(p.exercises ?? []).length} exercises ·{' '}
                    {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <WorkoutBuilder
        open={creating}
        initialClientId={clientId}
        onClose={() => setCreating(false)}
      />
      {editing && (
        <WorkoutBuilder open={!!editing} plan={editing} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}
