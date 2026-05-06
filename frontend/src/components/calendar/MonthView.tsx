import { useMemo } from 'react';
import {
  addDays,
  isToday,
  monthGridRange,
  startOfMonth,
} from '../../lib/calendar';
import type { Session } from '../../lib/database.types';

export interface MonthViewSession extends Session {
  clients?: { full_name: string } | null;
}

interface MonthViewProps {
  anchor: Date;
  sessions: MonthViewSession[];
  onCreateAt: (start: Date) => void;
  onEdit: (session: MonthViewSession) => void;
}

const STATUS_DOT: Record<Session['status'], string> = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-emerald-500',
  completed: 'bg-slate-400',
  no_show: 'bg-amber-500',
  cancelled: 'bg-red-300',
};

export function MonthView({ anchor, sessions, onCreateAt, onEdit }: MonthViewProps) {
  const monthStart = startOfMonth(anchor);
  const { from, to } = monthGridRange(anchor);

  const days = useMemo(() => {
    const out: Date[] = [];
    let cur = from;
    while (cur <= to) {
      out.push(cur);
      cur = addDays(cur, 1);
    }
    return out;
  }, [from, to]);

  const sessionsByDay = useMemo(() => {
    const m = new Map<string, MonthViewSession[]>();
    for (const s of sessions) {
      const d = new Date(s.starts_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    }
    return m;
  }, [sessions]);

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* weekday header */}
      <div className="grid grid-cols-7 bg-slate-50/60 border-b border-slate-200">
        {weekdayLabels.map((w) => (
          <div key={w} className="p-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wide">
            {w}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const inMonth = d.getMonth() === monthStart.getMonth();
          const today = isToday(d);
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const daySessions = sessionsByDay.get(key) ?? [];
          return (
            <div
              key={d.toISOString()}
              onClick={() => {
                const slot = new Date(d);
                slot.setHours(9, 0, 0, 0);
                onCreateAt(slot);
              }}
              className={`min-h-[110px] p-2 border-r border-b border-slate-100 last:border-r-0 cursor-pointer hover:bg-slate-50 transition ${
                inMonth ? 'bg-white' : 'bg-slate-50/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-sm font-medium inline-flex items-center justify-center ${
                    today
                      ? 'w-6 h-6 rounded-full bg-blue-600 text-white'
                      : inMonth
                        ? 'text-slate-900'
                        : 'text-slate-400'
                  }`}
                >
                  {d.getDate()}
                </span>
                {daySessions.length > 0 && (
                  <span className="text-[10px] text-slate-400">{daySessions.length}</span>
                )}
              </div>
              <div className="space-y-0.5">
                {daySessions.slice(0, 3).map((s) => {
                  const start = new Date(s.starts_at);
                  const cancelled = s.status === 'cancelled';
                  return (
                    <button
                      key={s.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(s);
                      }}
                      className={`w-full flex items-center gap-1 text-left text-[11px] px-1.5 py-0.5 rounded hover:bg-slate-100 ${
                        cancelled ? 'line-through text-slate-400' : 'text-slate-700'
                      }`}
                    >
                      <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${STATUS_DOT[s.status]}`} />
                      <span className="truncate flex-1">
                        <span className="text-slate-500">
                          {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {' '}
                        {s.clients?.full_name ?? 'Client'}
                      </span>
                    </button>
                  );
                })}
                {daySessions.length > 3 && (
                  <div className="text-[10px] text-slate-400 px-1.5">
                    +{daySessions.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

