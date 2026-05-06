import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Grid3x3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  addDays,
  diffMinutes,
  endOfMonth,
  endOfWeek,
  formatRangeTitle,
  startOfMonth,
  startOfWeek,
  type CalendarView,
} from '../../lib/calendar';
import type { Session } from '../../lib/database.types';
import { WeekView, type WeekViewSession } from './WeekView';
import { MonthView } from './MonthView';
import { SessionModal } from './SessionModal';

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  session?: WeekViewSession;
  initialStart?: Date;
  initialEnd?: Date;
}

export function Calendar() {
  const [view, setView] = useState<CalendarView>('week');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create' });
  const qc = useQueryClient();

  const { from, to } = useMemo(() => {
    if (view === 'week') {
      return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
    }
    // For month view fetch the visible grid (incl. padding weeks)
    return { from: addDays(startOfWeek(startOfMonth(anchor)), 0), to: endOfWeek(endOfMonth(anchor)) };
  }, [view, anchor]);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['calendar-sessions', from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, clients(full_name)')
        .gte('starts_at', from.toISOString())
        .lte('starts_at', to.toISOString())
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WeekViewSession[];
    },
  });

  const reschedule = useMutation({
    mutationFn: async ({ session, newStart }: { session: WeekViewSession; newStart: Date }) => {
      const oldStart = new Date(session.starts_at);
      const oldEnd = new Date(session.ends_at);
      const duration = diffMinutes(oldStart, oldEnd);
      const newEnd = new Date(newStart.getTime() + duration * 60_000);
      const { error } = await supabase
        .from('sessions')
        .update({ starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() })
        .eq('id', session.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-sessions'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
    },
  });

  function navigate(delta: number) {
    const next = new Date(anchor);
    if (view === 'week') next.setDate(next.getDate() + delta * 7);
    else next.setMonth(next.getMonth() + delta);
    setAnchor(next);
  }

  function openCreate(start: Date) {
    const end = new Date(start.getTime() + 60 * 60_000);
    setModal({ open: true, mode: 'create', initialStart: start, initialEnd: end });
  }

  function openEdit(session: WeekViewSession) {
    setModal({ open: true, mode: 'edit', session });
  }

  const stats = useMemo(() => countStats(sessions as Session[]), [sessions]);

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <h2 className="text-lg font-semibold text-slate-900">
          {formatRangeTitle(view, anchor)}
        </h2>

        <div className="ml-auto flex items-center gap-2">
          <div className="bg-slate-100 rounded-lg p-1 flex">
            <button
              onClick={() => setView('week')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm transition ${
                view === 'week' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-600'
              }`}
            >
              <CalendarDays size={14} /> Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm transition ${
                view === 'month' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-600'
              }`}
            >
              <Grid3x3 size={14} /> Month
            </button>
          </div>

          <button
            onClick={() => {
              const d = new Date();
              d.setMinutes(0, 0, 0);
              d.setHours(d.getHours() + 1);
              openCreate(d);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm"
          >
            <Plus size={14} /> New session
          </button>
        </div>
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
        <Stat label="Scheduled" value={stats.scheduled} dot="bg-blue-500" />
        <Stat label="Confirmed" value={stats.confirmed} dot="bg-emerald-500" />
        <Stat label="Completed" value={stats.completed} dot="bg-slate-400" />
        <Stat label="No-show" value={stats.no_show} dot="bg-amber-500" />
        <Stat label="Cancelled" value={stats.cancelled} dot="bg-red-300" />
      </div>

      {/* calendar */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          Loading…
        </div>
      ) : view === 'week' ? (
        <WeekView
          anchor={anchor}
          sessions={sessions as WeekViewSession[]}
          onCreateAt={openCreate}
          onEdit={openEdit}
          onReschedule={(s, newStart) => reschedule.mutate({ session: s, newStart })}
        />
      ) : (
        <MonthView
          anchor={anchor}
          sessions={sessions as WeekViewSession[]}
          onCreateAt={openCreate}
          onEdit={openEdit}
        />
      )}

      <SessionModal
        open={modal.open}
        mode={modal.mode}
        session={modal.session}
        initialStart={modal.initialStart}
        initialEnd={modal.initialEnd}
        allSessions={sessions as Session[]}
        onClose={() => setModal({ open: false, mode: 'create' })}
      />
    </div>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
      <span className="text-slate-500">{label}</span>
      <span className="ml-auto font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function countStats(sessions: Session[]) {
  const counts = { scheduled: 0, confirmed: 0, completed: 0, no_show: 0, cancelled: 0 };
  for (const s of sessions) counts[s.status]++;
  return counts;
}
