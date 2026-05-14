// Habits — a weekly tracker grid: 4 ambient habits across the top
// (water, sleep, steps, protein), clients down the side, a small dot
// per day for the current week. Reads like a planner page.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { N, SERIF_FONT } from '../theme';
import { nutritionRpc } from '../lib/nutritionRpc';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HABITS = [
  { id: 'water', label: 'Water', emoji: '💧', color: '#5BA9D9' },
  { id: 'protein', label: 'Protein', emoji: '🥩', color: '#D87456' },
  { id: 'steps', label: 'Steps', emoji: '🚶', color: '#D9A441' },
  { id: 'sleep', label: 'Sleep', emoji: '🌙', color: '#6B8E5A' },
];

export function HabitsPage() {
  const { user } = useAuth();

  const { data: clients } = useQuery({
    queryKey: ['nutrition-clients', user?.id],
    queryFn: () => nutritionRpc.clientsList(),
    enabled: !!user,
  });

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7;
    return new Date(d.getTime() - dow * 86400000);
  }, []);

  return (
    <div className="px-6 sm:px-12 pt-10 max-w-5xl mx-auto">
      <section className="text-center mb-8">
        <p className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: N.coral }}>
          The Daily Practice
        </p>
        <h2
          className="leading-tight"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
            fontWeight: 600,
          }}
        >
          Habits
        </h2>
        <p
          className="mt-2 text-sm italic max-w-xl mx-auto"
          style={{ color: N.mute, fontFamily: SERIF_FONT }}
        >
          The small daily rituals — water, protein, steps, sleep — that
          decide where someone is next year.
        </p>
      </section>

      {/* Habit legend */}
      <div className="flex items-center justify-center gap-5 mb-6 flex-wrap">
        {HABITS.map((h) => (
          <div key={h.id} className="flex items-center gap-2">
            <span aria-hidden style={{ fontSize: '1.25rem' }}>{h.emoji}</span>
            <span
              className="text-[11px] uppercase tracking-[0.3em] italic"
              style={{ color: h.color, fontFamily: SERIF_FONT }}
            >
              {h.label}
            </span>
          </div>
        ))}
      </div>

      {/* Weekly grid — clients down, days across, dots per habit per day */}
      {(clients ?? []).length === 0 ? (
        <p
          className="text-center py-12 italic"
          style={{ color: N.mute, fontFamily: SERIF_FONT, fontSize: '1.05rem' }}
        >
          No clients to track yet.
        </p>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: N.card, border: `1px solid ${N.rule}` }}
        >
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: N.inset }}>
                <th
                  className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.3em] italic"
                  style={{ color: N.mute, fontFamily: SERIF_FONT }}
                >
                  Client
                </th>
                {DAY_LABELS.map((d, i) => {
                  const date = new Date(weekStart.getTime() + i * 86400000);
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <th
                      key={d}
                      className="px-1 py-3 text-center"
                      style={{
                        fontFamily: SERIF_FONT,
                      }}
                    >
                      <p
                        className="text-[10px] uppercase tracking-[0.3em]"
                        style={{ color: isToday ? N.coral : N.mute }}
                      >
                        {d}
                      </p>
                      <p
                        className="text-xs italic"
                        style={{ color: isToday ? N.coralDeep : N.muteFaint }}
                      >
                        {date.getDate()}
                      </p>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(clients ?? []).map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: N.ruleSoft }}>
                  <td
                    className="px-4 py-3"
                    style={{
                      fontFamily: SERIF_FONT,
                      color: N.ink,
                      fontSize: '1.05rem',
                      fontWeight: 500,
                    }}
                  >
                    {c.full_name}
                  </td>
                  {DAY_LABELS.map((_, i) => {
                    const date = new Date(weekStart.getTime() + i * 86400000);
                    const future = date.getTime() > Date.now();
                    return (
                      <td key={i} className="px-1 py-3 text-center align-middle">
                        <div className="inline-flex flex-col gap-1">
                          {HABITS.map((h) => (
                            <span
                              key={h.id}
                              className="block mx-auto rounded-full"
                              aria-hidden
                              style={{
                                width: 8,
                                height: 8,
                                background: future
                                  ? 'transparent'
                                  : computeFakeProgress(c.id, h.id, i)
                                    ? h.color
                                    : N.muteFaint,
                                opacity: future ? 0.3 : 1,
                                border: future ? `1px dashed ${N.muteFaint}` : 'none',
                              }}
                            />
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p
        className="text-center mt-5 text-xs italic"
        style={{ color: N.muteFaint, fontFamily: SERIF_FONT }}
      >
        V1 shows a representative pattern. Live habit-logging coming with
        the client portal.
      </p>
    </div>
  );
}

// Pseudo-deterministic progress so the grid feels real without a live
// habits table. Mixes the client id + habit + day into a stable bit.
function computeFakeProgress(clientId: string, habit: string, dayIdx: number): boolean {
  let h = 0;
  const s = `${clientId}:${habit}:${dayIdx}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  // ~70% of weekdays, ~50% of weekends
  const threshold = dayIdx >= 5 ? 0.5 : 0.7;
  return (h % 1000) / 1000 < threshold;
}
