import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatMoney, initials } from '../lib/format';
import type { Trainer } from '../lib/database.types';

interface TrainerKpi {
  id: string;
  full_name: string;
  studio_role: 'owner' | 'staff' | null;
  active_clients: number;
  sessions_this_week: number;
  completed_this_week: number;
  revenue_this_month: number;
}

// Visible only to studio owners. Aggregates per-trainer metrics for the studio.
// Uses RLS-widened queries — under the hood is_my_data() lets the owner see
// every row in the studio.
export function StudioOverviewCard({ trainer }: { trainer: Trainer }) {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['studio-overview', trainer.studio_id],
    queryFn: async () => {
      if (!trainer.studio_id) return [];

      // Fetch all studio members
      const { data: members, error: e1 } = await supabase
        .from('trainers')
        .select('id, full_name, studio_role')
        .eq('studio_id', trainer.studio_id);
      if (e1) throw e1;

      // Time bounds
      const weekStart = new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // Pull all data once and bucket by trainer_id
      const [clientsRes, sessionsRes, paymentsRes] = await Promise.all([
        supabase.from('clients').select('trainer_id, status'),
        supabase.from('sessions').select('trainer_id, status, starts_at').gte('starts_at', weekStart.toISOString()).lt('starts_at', weekEnd.toISOString()),
        supabase.from('payments').select('trainer_id, amount, paid_at').gte('paid_at', monthStart.toISOString()),
      ]);

      const clientsBy = new Map<string, number>();
      for (const c of clientsRes.data ?? []) {
        if (c.status === 'active') clientsBy.set(c.trainer_id, (clientsBy.get(c.trainer_id) ?? 0) + 1);
      }

      const sessBy = new Map<string, { total: number; completed: number }>();
      for (const s of sessionsRes.data ?? []) {
        const e = sessBy.get(s.trainer_id) ?? { total: 0, completed: 0 };
        e.total++;
        if (s.status === 'completed') e.completed++;
        sessBy.set(s.trainer_id, e);
      }

      const revBy = new Map<string, number>();
      for (const p of paymentsRes.data ?? []) {
        revBy.set(p.trainer_id, (revBy.get(p.trainer_id) ?? 0) + Number(p.amount));
      }

      return (members ?? []).map((m) => ({
        id: m.id,
        full_name: m.full_name,
        studio_role: m.studio_role as 'owner' | 'staff' | null,
        active_clients: clientsBy.get(m.id) ?? 0,
        sessions_this_week: sessBy.get(m.id)?.total ?? 0,
        completed_this_week: sessBy.get(m.id)?.completed ?? 0,
        revenue_this_month: revBy.get(m.id) ?? 0,
      })) as TrainerKpi[];
    },
    enabled: !!trainer.studio_id && trainer.studio_role === 'owner',
  });

  if (trainer.studio_role !== 'owner' || !trainer.studio_id) return null;

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users size={16} className="text-blue-600" />
        <h2 className="font-semibold text-slate-900">Studio overview</h2>
        <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded ml-auto">
          Owner view
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 py-4">Loading…</p>
      ) : !kpis?.length ? (
        <p className="text-sm text-slate-500 py-4 text-center">No trainers in your studio yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500 uppercase tracking-wide">
              <tr className="border-b border-slate-100">
                <th className="py-2 pr-3">Trainer</th>
                <th className="py-2 pr-3 text-right">Active clients</th>
                <th className="py-2 pr-3 text-right">Sessions this wk</th>
                <th className="py-2 pr-3 text-right">Completed</th>
                <th className="py-2 text-right">Revenue this mo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kpis
                .sort((a, b) => b.revenue_this_month - a.revenue_this_month)
                .map((k) => (
                  <tr key={k.id}>
                    <td className="py-2 pr-3">
                      <Link
                        to={`/?as=${k.id}`}
                        className="flex items-center gap-2 text-slate-900 hover:text-blue-600"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-medium text-xs">
                          {initials(k.full_name)}
                        </div>
                        <span className="font-medium">{k.full_name}</span>
                        {k.studio_role === 'owner' && (
                          <Crown size={11} className="text-amber-500" />
                        )}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-right">{k.active_clients}</td>
                    <td className="py-2 pr-3 text-right">{k.sessions_this_week}</td>
                    <td className="py-2 pr-3 text-right text-emerald-700">{k.completed_this_week}</td>
                    <td className="py-2 text-right font-semibold">{formatMoney(k.revenue_this_month)}</td>
                  </tr>
                ))}
              <tr className="bg-slate-50 font-medium">
                <td className="py-2 pr-3 text-slate-700">Total</td>
                <td className="py-2 pr-3 text-right">{sum(kpis, 'active_clients')}</td>
                <td className="py-2 pr-3 text-right">{sum(kpis, 'sessions_this_week')}</td>
                <td className="py-2 pr-3 text-right text-emerald-700">{sum(kpis, 'completed_this_week')}</td>
                <td className="py-2 text-right">{formatMoney(sum(kpis, 'revenue_this_month'))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function sum<K extends 'active_clients' | 'sessions_this_week' | 'completed_this_week' | 'revenue_this_month'>(
  arr: TrainerKpi[],
  key: K,
): number {
  return arr.reduce((s, x) => s + (x[key] as number), 0);
}
