import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { Calendar } from '../components/calendar/Calendar';
import { formatSessionWhen, formatMoney, initials } from '../lib/format';
import {
  CalendarDays,
  List as ListIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { Session } from '../lib/database.types';

type Mode = 'calendar' | 'list';
type ListTab = 'upcoming' | 'today' | 'past' | 'cancelled';

export function Sessions() {
  const [mode, setMode] = useState<Mode>('calendar');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Sessions"
        subtitle="Schedule, track, and manage every training session."
        actions={
          <div className="bg-slate-100 rounded-lg p-1 flex">
            <button
              onClick={() => setMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
                mode === 'calendar' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-600'
              }`}
            >
              <CalendarDays size={14} /> Calendar
            </button>
            <button
              onClick={() => setMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
                mode === 'list' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-600'
              }`}
            >
              <ListIcon size={14} /> List
            </button>
          </div>
        }
      />

      {mode === 'calendar' ? <Calendar /> : <SessionListView />}
    </div>
  );
}

function SessionListView() {
  const [tab, setTab] = useState<ListTab>('upcoming');
  const qc = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', tab],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      let q = supabase.from('sessions').select('*, clients(full_name)');

      if (tab === 'upcoming') {
        q = q
          .gte('starts_at', now.toISOString())
          .in('status', ['scheduled', 'confirmed'])
          .order('starts_at', { ascending: true });
      } else if (tab === 'today') {
        q = q
          .gte('starts_at', todayStart.toISOString())
          .lte('starts_at', todayEnd.toISOString())
          .order('starts_at', { ascending: true });
      } else if (tab === 'past') {
        q = q.lt('starts_at', now.toISOString()).order('starts_at', { ascending: false }).limit(100);
      } else {
        q = q.in('status', ['cancelled', 'no_show']).order('starts_at', { ascending: false }).limit(100);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as (Session & { clients: { full_name: string } | null })[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Session['status'] }) => {
      const { error } = await supabase.from('sessions').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['calendar-sessions'] });
      qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
    },
  });

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(['upcoming', 'today', 'past', 'cancelled'] as ListTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
              tab === t
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {!isLoading && !sessions?.length && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <CalendarDays className="mx-auto text-slate-300 mb-2" size={40} />
          <p className="text-slate-500">No sessions to show.</p>
        </div>
      )}

      <div className="space-y-2">
        {sessions?.map((s) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium">
              {initials(s.clients?.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900">{s.clients?.full_name ?? 'Unknown'}</p>
              <p className="text-sm text-slate-500">
                {formatSessionWhen(s.starts_at)}
                {s.location && ` · ${s.location}`}
                {s.price && ` · ${formatMoney(s.price)}`}
              </p>
            </div>
            <StatusActions session={s} onChange={(status) => update.mutate({ id: s.id, status })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusActions({
  session,
  onChange,
}: {
  session: Session;
  onChange: (status: Session['status']) => void;
}) {
  if (session.status === 'completed') {
    return (
      <span className="flex items-center gap-1 text-sm text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
        <CheckCircle2 size={14} /> Completed
      </span>
    );
  }
  if (session.status === 'cancelled') {
    return (
      <span className="flex items-center gap-1 text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
        <XCircle size={14} /> Cancelled
      </span>
    );
  }
  if (session.status === 'no_show') {
    return (
      <span className="flex items-center gap-1 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
        <AlertCircle size={14} /> No show
      </span>
    );
  }
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onChange('completed')}
        className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
      >
        Done
      </button>
      <button
        onClick={() => onChange('cancelled')}
        className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
      >
        Cancel
      </button>
      <button
        onClick={() => onChange('no_show')}
        className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded"
      >
        No show
      </button>
    </div>
  );
}
