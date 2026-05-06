import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, Cake, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate, initials } from '../lib/format';
import type { Client, Session } from '../lib/database.types';

// ============================================================================
// Last 5 session notes — most-recent trainer notes on completed sessions.
// ============================================================================
export function LastNotesWidget() {
  const { data } = useQuery({
    queryKey: ['dashboard-last-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, starts_at, status, notes, client_id, clients(full_name)')
        .not('notes', 'is', null)
        .order('starts_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return ((data ?? []) as unknown as (Session & { clients: { full_name: string } | null })[])
        .filter((s) => s.notes && s.notes.trim().length > 0)
        .slice(0, 5);
    },
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} className="text-violet-600" />
        <h2 className="font-semibold text-slate-900">Recent session notes</h2>
      </div>
      {!data?.length ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          No notes yet. Add notes after a session to track progress.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.map((s) => (
            <li key={s.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-medium text-xs flex-shrink-0">
                {initials(s.clients?.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <Link
                    to={`/clients/${s.client_id}`}
                    className="text-sm font-medium text-slate-900 hover:text-blue-600 truncate"
                  >
                    {s.clients?.full_name ?? 'Client'}
                  </Link>
                  <span className="text-xs text-slate-400">{formatDate(s.starts_at)}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{s.notes}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// Birthdays — clients with a birthday in the next 14 days.
// ============================================================================
export function BirthdayBanner() {
  const { data } = useQuery({
    queryKey: ['dashboard-birthdays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, date_of_birth')
        .not('date_of_birth', 'is', null)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []) as Pick<Client, 'id' | 'full_name' | 'date_of_birth'>[];
    },
  });

  const now = new Date();
  const lookahead = 14;
  const upcoming = (data ?? [])
    .map((c) => {
      if (!c.date_of_birth) return null;
      const dob = new Date(c.date_of_birth);
      const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
      if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        next.setFullYear(now.getFullYear() + 1);
      }
      const days = Math.round((next.getTime() - now.getTime()) / 86_400_000);
      return days <= lookahead ? { ...c, days, when: next } : null;
    })
    .filter((x): x is { id: string; full_name: string; date_of_birth: string | null; days: number; when: Date } => x !== null)
    .sort((a, b) => a.days - b.days);

  if (upcoming.length === 0) return null;

  return (
    <div className="mb-6 bg-pink-50 border border-pink-200 rounded-xl p-4 flex items-start gap-3">
      <Cake className="text-pink-600 flex-shrink-0 mt-0.5" size={18} />
      <div className="flex-1">
        <p className="text-sm font-medium text-pink-900">
          Upcoming birthday{upcoming.length === 1 ? '' : 's'}
        </p>
        <p className="text-xs text-pink-800 mt-0.5">
          {upcoming
            .slice(0, 4)
            .map((c) =>
              c.days === 0
                ? `${c.full_name} (today!)`
                : c.days === 1
                  ? `${c.full_name} (tomorrow)`
                  : `${c.full_name} in ${c.days}d`,
            )
            .join(' · ')}
          {upcoming.length > 4 && ` · +${upcoming.length - 4} more`}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// No-show streak — clients with 2+ no-shows in last 30 days.
// ============================================================================
export function NoShowStreakWidget() {
  const { data } = useQuery({
    queryKey: ['dashboard-noshow-streak'],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from('sessions')
        .select('client_id, starts_at, clients(full_name)')
        .eq('status', 'no_show')
        .gte('starts_at', since)
        .order('starts_at', { ascending: false });
      if (error) throw error;

      // Count no-shows per client
      const tally = new Map<string, { name: string; count: number; latest: string }>();
      for (const s of (data ?? []) as unknown as (Session & { clients: { full_name: string } | null })[]) {
        const existing = tally.get(s.client_id);
        if (existing) {
          existing.count++;
        } else {
          tally.set(s.client_id, {
            name: s.clients?.full_name ?? 'Unknown',
            count: 1,
            latest: s.starts_at,
          });
        }
      }
      return Array.from(tally.entries())
        .filter(([, v]) => v.count >= 2)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.count - a.count);
    },
  });

  if (!data?.length) return null;

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900">
          {data.length} client{data.length === 1 ? '' : 's'} with no-show streaks (last 30 days)
        </p>
        <p className="text-xs text-amber-800 mt-0.5">
          {data.slice(0, 4).map((c) => `${c.name} (${c.count} no-shows)`).join(' · ')}
          {data.length > 4 && ` · +${data.length - 4} more`}
        </p>
      </div>
    </div>
  );
}
