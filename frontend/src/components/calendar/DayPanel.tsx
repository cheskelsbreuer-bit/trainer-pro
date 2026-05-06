import { useEffect } from 'react';
import { X, Plus, Clock, MapPin, ChevronRight } from 'lucide-react';
import type { Session } from '../../lib/database.types';
import { isToday, sameDay } from '../../lib/calendar';

export interface DayPanelSession extends Session {
  clients?: { full_name: string } | null;
}

interface DayPanelProps {
  day: Date | null;
  sessions: DayPanelSession[]; // already filtered to this day
  onClose: () => void;
  onCreateAt: (start: Date) => void;
  onEdit: (s: DayPanelSession) => void;
}

const STATUS_BADGE: Record<Session['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-slate-100 text-slate-700',
  no_show: 'bg-amber-100 text-amber-900',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_DOT: Record<Session['status'], string> = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-emerald-500',
  completed: 'bg-slate-400',
  no_show: 'bg-amber-500',
  cancelled: 'bg-red-400',
};

export function DayPanel({ day, sessions, onClose, onCreateAt, onEdit }: DayPanelProps) {
  // Esc to close
  useEffect(() => {
    if (!day) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [day, onClose]);

  const open = day != null;
  const today = day ? isToday(day) : false;

  // Filter to this day defensively (in case caller passes more)
  const daySessions = day
    ? sessions
        .filter((s) => sameDay(new Date(s.starts_at), day))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    : [];

  // Stats
  const counts = { total: daySessions.length, completed: 0, scheduled: 0, cancelled: 0 };
  for (const s of daySessions) {
    if (s.status === 'completed') counts.completed++;
    else if (s.status === 'cancelled' || s.status === 'no_show') counts.cancelled++;
    else counts.scheduled++;
  }

  function handleNewSession() {
    if (!day) return;
    const slot = new Date(day);
    // Pick a reasonable default hour: now if today, else 9 AM
    if (today) {
      const now = new Date();
      slot.setHours(now.getHours(), 0, 0, 0);
    } else {
      slot.setHours(9, 0, 0, 0);
    }
    onCreateAt(slot);
  }

  return (
    <>
      {/* backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* panel */}
      <aside
        className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        {/* header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {day?.toLocaleDateString(undefined, { weekday: 'long' })}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h2 className="text-3xl font-bold text-slate-900">
                {day?.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
              </h2>
              {today && (
                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {day?.getFullYear()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* stats */}
        {counts.total > 0 && (
          <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-100 flex items-center gap-4 text-xs text-slate-600">
            <span><span className="font-semibold text-slate-900">{counts.total}</span> session{counts.total === 1 ? '' : 's'}</span>
            {counts.scheduled > 0 && <span>· <span className="font-semibold text-blue-700">{counts.scheduled}</span> upcoming</span>}
            {counts.completed > 0 && <span>· <span className="font-semibold text-slate-700">{counts.completed}</span> done</span>}
            {counts.cancelled > 0 && <span>· <span className="font-semibold text-red-700">{counts.cancelled}</span> off</span>}
          </div>
        )}

        {/* new session button */}
        <div className="p-4">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm"
          >
            <Plus size={16} /> New session
          </button>
        </div>

        {/* session list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {daySessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <Clock size={20} />
              </div>
              <p className="text-sm text-slate-500">Nothing scheduled.</p>
              <p className="text-xs text-slate-400 mt-0.5">Click "New session" above to add one.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {daySessions.map((s) => {
                const start = new Date(s.starts_at);
                const end = new Date(s.ends_at);
                const cancelled = s.status === 'cancelled';
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => onEdit(s)}
                      className={`w-full text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-sm transition group flex items-stretch gap-3 ${
                        cancelled ? 'opacity-60' : ''
                      }`}
                    >
                      <div className={`w-1 rounded-full flex-shrink-0 ${STATUS_DOT[s.status]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-slate-900 truncate ${cancelled ? 'line-through' : ''}`}>
                            {s.clients?.full_name ?? 'Unknown'}
                          </p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide ${STATUS_BADGE[s.status]}`}>
                            {s.status === 'no_show' ? 'No-show' : s.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            {' – '}
                            {end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          {s.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {s.location}
                            </span>
                          )}
                        </div>
                        {s.notes && (
                          <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">{s.notes}</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="self-center text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
