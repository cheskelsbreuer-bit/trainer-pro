import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  PIXELS_PER_MINUTE,
  addDays,
  diffMinutes,
  formatDayHeader,
  formatHourLabel,
  isToday,
  pixelToTime,
  sameDay,
  startOfDay,
  startOfWeek,
} from '../../lib/calendar';
import type { Session } from '../../lib/database.types';

export interface WeekViewSession extends Session {
  clients?: { full_name: string } | null;
}

interface WeekViewProps {
  anchor: Date;
  sessions: WeekViewSession[];
  onCreateAt: (start: Date) => void;
  onEdit: (session: WeekViewSession) => void;
  onReschedule: (session: WeekViewSession, newStart: Date) => void;
}

const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, i) => DAY_START_HOUR + i,
);

const STATUS_STYLES: Record<Session['status'], string> = {
  scheduled: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-600',
  confirmed: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600',
  completed: 'bg-slate-300 hover:bg-slate-400 text-slate-700 border-slate-400',
  no_show: 'bg-amber-400 hover:bg-amber-500 text-amber-900 border-amber-500',
  cancelled: 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300 line-through',
};

export function WeekView({ anchor, sessions, onCreateAt, onEdit, onReschedule }: WeekViewProps) {
  const days = useMemo(() => {
    const s = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [anchor]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to a useful default time on first mount (current time on today, otherwise 7 AM).
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const todayInRange = days.some((d) => isToday(d));
    const targetHour = todayInRange ? Math.max(DAY_START_HOUR, now.getHours() - 1) : 7;
    const offsetMin = (targetHour - DAY_START_HOUR) * 60;
    scrollRef.current.scrollTop = Math.max(0, offsetMin * PIXELS_PER_MINUTE);
  }, [days]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* day header */}
      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/60">
        <div className="p-2" />
        {days.map((d) => {
          const { weekday, day } = formatDayHeader(d);
          const today = isToday(d);
          return (
            <div key={d.toISOString()} className="px-2 py-2 text-center border-l border-slate-100 first:border-l-0">
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{weekday}</div>
              <div
                className={`mt-0.5 text-base font-semibold ${
                  today ? 'text-blue-600' : 'text-slate-900'
                }`}
              >
                {today ? (
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm">
                    {day}
                  </span>
                ) : (
                  day
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* time grid (scrolls internally) */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: 'min(70vh, 640px)' }}
      >
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] relative">
          {/* hour labels column */}
          <div className="bg-slate-50/40 border-r border-slate-100">
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-[10px] text-slate-400 text-right pr-1.5 -mt-1.5"
                style={{ height: `${60 * PIXELS_PER_MINUTE}px` }}
              >
                {formatHourLabel(h)}
              </div>
            ))}
          </div>

          {/* day columns */}
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              sessions={sessions.filter((s) => sameDay(new Date(s.starts_at), day))}
              onCreateAt={onCreateAt}
              onEdit={onEdit}
              onReschedule={onReschedule}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface DayColumnProps {
  day: Date;
  sessions: WeekViewSession[];
  onCreateAt: (start: Date) => void;
  onEdit: (session: WeekViewSession) => void;
  onReschedule: (session: WeekViewSession, newStart: Date) => void;
}

function DayColumn({ day, sessions, onCreateAt, onEdit, onReschedule }: DayColumnProps) {
  const colRef = useRef<HTMLDivElement>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const today = isToday(day);

  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR) * 60 * PIXELS_PER_MINUTE;

  // Now-line for today
  const now = new Date();
  const nowOffset = today
    ? (now.getHours() - DAY_START_HOUR) * 60 + now.getMinutes()
    : null;
  const nowVisible = nowOffset != null && nowOffset >= 0 && nowOffset <= (DAY_END_HOUR - DAY_START_HOUR) * 60;

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!colRef.current) return;
    if ((e.target as HTMLElement).closest('[data-session]')) return; // clicked on a session, not the slot
    const rect = colRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const start = pixelToTime(startOfDay(day), y, 30);
    onCreateAt(start);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!colRef.current) return;
    const rect = colRef.current.getBoundingClientRect();
    setHoverY(e.clientY - rect.top);
  }

  function handleDragLeave() {
    setHoverY(null);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHoverY(null);
    if (!colRef.current) return;
    const sessionId = e.dataTransfer.getData('text/plain');
    const session = sessions.find((s) => s.id === sessionId) ??
      // session may live in another day column; the parent owns the array
      undefined;
    // We can't access the original session if it's in another column.
    // Rely on dragData.session via a custom MIME type instead.
    const json = e.dataTransfer.getData('application/x-session');
    const payload = json ? (JSON.parse(json) as WeekViewSession) : session;
    if (!payload) return;
    const rect = colRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const newStart = pixelToTime(startOfDay(day), y, 15);
    onReschedule(payload, newStart);
  }

  return (
    <div
      ref={colRef}
      className={`relative border-l border-slate-100 first:border-l-0 ${today ? 'bg-blue-50/20' : ''}`}
      style={{ height: `${totalHeight}px` }}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* hour grid lines */}
      {HOURS.map((h, i) => (
        <div
          key={h}
          className={`absolute left-0 right-0 ${i === 0 ? '' : 'border-t border-slate-100'}`}
          style={{ top: `${(h - DAY_START_HOUR) * 60 * PIXELS_PER_MINUTE}px`, height: `${60 * PIXELS_PER_MINUTE}px` }}
        />
      ))}

      {/* now line */}
      {nowVisible && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ top: `${nowOffset! * PIXELS_PER_MINUTE}px` }}
        >
          <div className="h-px bg-red-500" />
          <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
        </div>
      )}

      {/* drag-hover indicator */}
      {hoverY != null && (
        <div
          className="absolute left-1 right-1 h-12 rounded-md border-2 border-dashed border-blue-400 bg-blue-100/30 pointer-events-none z-10"
          style={{ top: `${Math.max(0, hoverY)}px` }}
        />
      )}

      {/* sessions */}
      {sessions.map((s) => (
        <SessionChip key={s.id} session={s} onEdit={onEdit} />
      ))}
    </div>
  );
}

function SessionChip({ session, onEdit }: { session: WeekViewSession; onEdit: (s: WeekViewSession) => void }) {
  const start = new Date(session.starts_at);
  const end = new Date(session.ends_at);
  const offsetMin = (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes();
  const heightMin = Math.max(20, diffMinutes(start, end));
  const heightPx = heightMin * PIXELS_PER_MINUTE - 2;
  // Sessions shorter than ~35 px get a single-line treatment.
  const compact = heightPx < 32;

  // Hide if outside visible hours
  if (offsetMin < 0 || offsetMin > (DAY_END_HOUR - DAY_START_HOUR) * 60) return null;

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', session.id);
    e.dataTransfer.setData('application/x-session', JSON.stringify(session));
  }

  const timeStr = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <div
      data-session
      draggable
      onDragStart={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(session);
      }}
      className={`absolute left-1 right-1 rounded-md border ${compact ? 'px-1.5 py-0' : 'px-2 py-0.5'} text-[11px] cursor-pointer shadow-sm transition-shadow hover:shadow-md ${
        STATUS_STYLES[session.status]
      }`}
      style={{
        top: `${offsetMin * PIXELS_PER_MINUTE}px`,
        height: `${heightPx}px`,
        zIndex: 5,
      }}
      title={`${session.clients?.full_name ?? 'Client'} · ${timeStr}${session.location ? ' · ' + session.location : ''}`}
    >
      {compact ? (
        <div className="truncate leading-tight font-medium">
          <span className="opacity-80">{timeStr}</span>{' '}
          {session.clients?.full_name ?? 'Unknown'}
        </div>
      ) : (
        <>
          <div className="font-medium truncate leading-tight">
            {session.clients?.full_name ?? 'Unknown'}
          </div>
          <div className="opacity-90 truncate leading-tight">
            {timeStr}
            {session.location ? ` · ${session.location}` : ''}
          </div>
        </>
      )}
    </div>
  );
}
