// Class schedule — a week grid (Mon–Sun, time-of-day rows) showing every
// class the dojo runs. Each cell shows the class name + how many
// attendees signed in. Click a cell to drill into the attendance roster.
//
// V1: shows the next 7 days of sessions on a grid. Doesn't yet support
// the recurring-class template concept (that's a follow-up — for now,
// individual sessions land on the grid by their starts_at).

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Session } from '../../lib/database.types';
import { DOJO_COLORS } from '../theme';
import {
  DojoPage,
  DojoPageHeader,
  DojoCard,
  DojoSectionHeader,
} from '../components/DojoUI';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

type SessionWithClient = Session & { clients: { full_name: string } | null };

export function DojoClasses() {
  const { user } = useAuth();

  // Week starts on Monday, ends Sunday. Compute the 7 day boundaries.
  const week = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dow = (today.getDay() + 6) % 7; // 0 = Mon
    const monday = new Date(today.getTime() - dow * 86400000);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday.getTime() + i * 86400000);
      return d;
    });
  }, []);

  const { data: classes } = useQuery({
    queryKey: ['dojo-classes-week', user?.id, week[0].toISOString()],
    queryFn: async () => {
      const start = week[0].toISOString();
      const endDate = new Date(week[6].getTime() + 86400000).toISOString();
      const { data, error } = await supabase
        .from('sessions')
        .select('*, clients(full_name)')
        .gte('starts_at', start)
        .lt('starts_at', endDate)
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SessionWithClient[];
    },
  });

  // Build a 2D grid: rows = hours, cols = days, cell = list of classes.
  const grid = useMemo(() => {
    const cells: SessionWithClient[][][] = HOURS.map(() =>
      DAY_LABELS.map(() => []),
    );
    (classes ?? []).forEach((c) => {
      const d = new Date(c.starts_at);
      const dayCol = (d.getDay() + 6) % 7;
      const hourRow = HOURS.indexOf(d.getHours());
      if (hourRow >= 0 && dayCol >= 0 && dayCol <= 6) {
        cells[hourRow][dayCol].push(c);
      }
    });
    return cells;
  }, [classes]);

  return (
    <DojoPage>
      <DojoPageHeader
        eyebrow={`Week of ${week[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
        title="Classes"
        subtitle="Every class on the mat this week. Tap a slot for the attendance roster."
      />

      <DojoCard>
        <DojoSectionHeader
          icon={<CalendarDays size={14} />}
          title="Weekly mat schedule"
          hint={`${(classes ?? []).length} classes this week`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th
                  className="px-2 py-2 font-semibold text-left uppercase tracking-wider"
                  style={{
                    color: DOJO_COLORS.textMuted,
                    width: 70,
                    background: DOJO_COLORS.bgInset,
                  }}
                >
                  Time
                </th>
                {DAY_LABELS.map((d, i) => {
                  const isToday =
                    week[i].toDateString() === new Date().toDateString();
                  return (
                    <th
                      key={d}
                      className="px-2 py-2 font-bold text-left uppercase tracking-wider"
                      style={{
                        color: isToday ? DOJO_COLORS.gold : DOJO_COLORS.textMuted,
                        background: DOJO_COLORS.bgInset,
                        borderLeft: `1px solid ${DOJO_COLORS.divider}`,
                      }}
                    >
                      {d}{' '}
                      <span
                        style={{
                          color: isToday ? DOJO_COLORS.textPrimary : DOJO_COLORS.textMuted,
                          fontWeight: 400,
                        }}
                      >
                        {week[i].getDate()}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hr, row) => (
                <tr key={hr}>
                  <td
                    className="px-2 py-2 font-mono text-right"
                    style={{
                      color: DOJO_COLORS.textMuted,
                      borderTop: `1px solid ${DOJO_COLORS.divider}`,
                    }}
                  >
                    {formatHour(hr)}
                  </td>
                  {DAY_LABELS.map((_, col) => {
                    const items = grid[row][col];
                    return (
                      <td
                        key={col}
                        className="p-1 align-top"
                        style={{
                          borderTop: `1px solid ${DOJO_COLORS.divider}`,
                          borderLeft: `1px solid ${DOJO_COLORS.divider}`,
                          minHeight: 44,
                          height: 44,
                        }}
                      >
                        {items.map((s) => (
                          <div
                            key={s.id}
                            className="rounded px-2 py-1 text-[11px] cursor-pointer hover:opacity-90 transition-opacity"
                            style={{
                              background: DOJO_COLORS.brandSoft,
                              borderLeft: `2px solid ${DOJO_COLORS.brand}`,
                              color: DOJO_COLORS.textPrimary,
                            }}
                            title={`${s.session_type} — ${s.clients?.full_name ?? ''}`}
                          >
                            <p className="font-semibold truncate">
                              {s.session_type || 'Class'}
                            </p>
                            {s.clients?.full_name && (
                              <p
                                className="truncate"
                                style={{ color: DOJO_COLORS.textSecondary }}
                              >
                                {s.clients.full_name}
                              </p>
                            )}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DojoCard>
    </DojoPage>
  );
}

function formatHour(h: number): string {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}
