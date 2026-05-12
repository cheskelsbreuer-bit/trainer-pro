// Dashboard variant for group-class studios — the "mom's gym" pattern.
//
// Built for trainers running recurring weekly group classes with monthly
// billing. The focus is on:
//   - Who owes money right now
//   - Birthdays this month (so the trainer can text a greeting)
//   - Recent payments coming in
//   - Each weekly class group at a glance (Sunday/Monday/Wednesday/...)
//
// This is intentionally low-fidelity / spreadsheet-shaped because that's
// what works for studio owners running 50-100 members across a handful of
// weekly slots. They don't want session-by-session granularity, they
// want the roster + the money.
//
// Group membership uses `clients.tags`: a member tagged "Sunday" belongs
// to the Sunday group. A member can be in multiple groups.
// Balance interpretation in studio mode: `clients.package_balance` is
// treated as a DOLLAR running balance (positive = credit, negative = owes,
// zero = even) rather than session-count.

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/PageHeader';
import { formatMoney } from '../lib/format';
import { Users, DollarSign, AlertTriangle, Cake } from 'lucide-react';
import type { Client, Payment, Trainer } from '../lib/database.types';
import { AdminReplyBanner } from '../components/AdminReplyBanner';
import { pickTemplateUx } from '../lib/templateUx';

const GROUP_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type PaymentWithClient = Payment & { clients: { full_name: string } | null };

export function StudioDashboard({ trainer }: { trainer: Trainer | undefined }) {
  const { user } = useAuth();
  const ux = pickTemplateUx(trainer?.template_slugs);

  // All active members in one query — we slice it for stats, groups, owe list.
  const { data: members } = useQuery({
    queryKey: ['studio-members', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });

  const { data: monthRevenue } = useQuery({
    queryKey: ['studio-revenue-month', user?.id],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .gte('paid_at', start.toISOString());
      if (error) throw error;
      return (data ?? []).reduce(
        (sum, p: Pick<Payment, 'amount'>) => sum + Number(p.amount),
        0
      );
    },
  });

  const { data: recentPayments } = useQuery({
    queryKey: ['studio-recent-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, clients(full_name)')
        .order('paid_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as PaymentWithClient[];
    },
  });

  const stats = useMemo(() => {
    const all = members ?? [];
    const owing = all.filter((m) => Number(m.package_balance) < 0);
    const owingTotal = owing.reduce(
      (sum, m) => sum + Math.abs(Number(m.package_balance)),
      0
    );
    const currentMonth = new Date().getMonth();
    const birthdaysThisMonth = all.filter((m) => {
      if (!m.date_of_birth) return false;
      return new Date(m.date_of_birth).getMonth() === currentMonth;
    });
    return {
      activeCount: all.length,
      owingCount: owing.length,
      owingTotal,
      birthdaysThisMonth,
      owing: [...owing].sort(
        (a, b) => Number(a.package_balance) - Number(b.package_balance)
      ),
    };
  }, [members]);

  // Build group cards from clients.tags. Anything matching a weekday name
  // counts toward that day; everything else falls into "Other groups".
  const groups = useMemo(() => {
    const all = members ?? [];
    const counts: Record<string, number> = {};
    for (const m of all) {
      const tags = m.tags ?? [];
      for (const t of tags) {
        if (!t) continue;
        const key = t.trim();
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    const dayGroups = GROUP_DAYS.filter((d) => counts[d]).map((d) => ({
      name: d,
      count: counts[d],
    }));
    const otherGroups = Object.keys(counts)
      .filter((k) => !GROUP_DAYS.includes(k))
      .sort()
      .map((k) => ({ name: k, count: counts[k] }));
    return [...dayGroups, ...otherGroups];
  }, [members]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-4">
        <PageHeader title={ux.dashboardHeadline} subtitle={ux.dashboardSubtitle} />
        <Link
          to="/payments"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition"
        >
          <DollarSign size={18} /> Record a payment
        </Link>
      </div>

      <AdminReplyBanner />

      {/* Stats — studio owner mental model: roster size + money owed + money in */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          icon={<Users size={18} />}
          accent="blue"
          label="Active members"
          value={stats.activeCount}
          link="/clients"
        />
        <StatTile
          icon={<AlertTriangle size={18} />}
          accent="rose"
          label="Members who owe"
          value={stats.owingCount}
          subtitle={stats.owingTotal > 0 ? formatMoney(stats.owingTotal) + ' total' : undefined}
        />
        <StatTile
          icon={<DollarSign size={18} />}
          accent="emerald"
          label="Revenue this month"
          value={formatMoney(monthRevenue ?? 0)}
          link="/payments"
        />
        <StatTile
          icon={<Cake size={18} />}
          accent="amber"
          label="Birthdays this month"
          value={stats.birthdaysThisMonth.length}
        />
      </div>

      {/* Group cards row — Sunday/Monday/Wednesday/Thursday at a glance.
          Mom's app pattern: click a group, see the roster for that class. */}
      {groups.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Groups
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {groups.map((g) => (
              <Link
                key={g.name}
                to={`/clients?tag=${encodeURIComponent(g.name)}`}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-sm transition"
              >
                <p className="text-xs text-slate-500 uppercase tracking-wide">{g.name}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{g.count}</p>
                <p className="text-xs text-slate-400">
                  {g.count === 1 ? 'member' : 'members'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* The two tables that drive a studio owner's morning routine. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SectionCard
          tone="rose"
          title="Members who owe money"
          icon={<AlertTriangle size={16} />}
          empty="Everyone is paid up. 🎉"
          rowCount={stats.owing.length}
        >
          {stats.owing.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Group</th>
                  <th className="py-2 pr-2 text-right">Owes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.owing.slice(0, 10).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-2 pr-2">
                      <Link
                        to={`/clients/${m.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                      >
                        {m.full_name}
                      </Link>
                    </td>
                    <td className="py-2 pr-2 text-slate-500 text-xs">
                      {(m.tags ?? []).join(', ') || '—'}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold text-rose-700">
                      {formatMoney(Math.abs(Number(m.package_balance)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard
          tone="amber"
          title="Birthdays this month"
          icon={<Cake size={16} />}
          empty="No birthdays this month."
          rowCount={stats.birthdaysThisMonth.length}
        >
          {stats.birthdaysThisMonth.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Day</th>
                  <th className="py-2 pr-2">Group</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.birthdaysThisMonth.slice(0, 10).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-2 pr-2">
                      <Link
                        to={`/clients/${m.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                      >
                        {m.full_name}
                      </Link>
                    </td>
                    <td className="py-2 pr-2 text-slate-600">
                      {m.date_of_birth
                        ? new Date(m.date_of_birth).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="py-2 pr-2 text-slate-500 text-xs">
                      {(m.tags ?? []).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      <SectionCard
        tone="emerald"
        title="Recent payments"
        icon={<DollarSign size={16} />}
        empty="No payments recorded yet."
        rowCount={recentPayments?.length ?? 0}
        link="/payments"
        linkText="View all →"
      >
        {recentPayments && recentPayments.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2 text-right">Amount</th>
                <th className="py-2 pr-2">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-2 pr-2 font-medium text-slate-900">
                    {p.clients?.full_name ?? '—'}
                  </td>
                  <td className="py-2 pr-2 text-slate-600">
                    {new Date(p.paid_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-2 pr-2 text-right font-semibold text-emerald-700">
                    {formatMoney(Number(p.amount))}
                  </td>
                  <td className="py-2 pr-2 text-slate-500 text-xs capitalize">
                    {p.method ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}

const TONE_CLASSES = {
  blue: { tile: 'bg-blue-50 text-blue-700', heading: 'border-blue-200 bg-blue-50' },
  rose: { tile: 'bg-rose-50 text-rose-700', heading: 'border-rose-200 bg-rose-50' },
  emerald: {
    tile: 'bg-emerald-50 text-emerald-700',
    heading: 'border-emerald-200 bg-emerald-50',
  },
  amber: { tile: 'bg-amber-50 text-amber-700', heading: 'border-amber-200 bg-amber-50' },
} as const;

type Tone = keyof typeof TONE_CLASSES;

function StatTile({
  icon,
  accent,
  label,
  value,
  subtitle,
  link,
}: {
  icon: React.ReactNode;
  accent: Tone;
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  link?: string;
}) {
  const content = (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition h-full">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONE_CLASSES[accent].tile}`}>
          {icon}
        </div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

function SectionCard({
  tone,
  title,
  icon,
  empty,
  rowCount,
  link,
  linkText,
  children,
}: {
  tone: Tone;
  title: string;
  icon: React.ReactNode;
  empty: string;
  rowCount: number;
  link?: string;
  linkText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b ${TONE_CLASSES[tone].heading}`}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {icon}
          <span>{title}</span>
          {rowCount > 0 && (
            <span className="text-xs font-normal text-slate-500">({rowCount})</span>
          )}
        </div>
        {link && (
          <Link to={link} className="text-xs text-blue-600 hover:underline">
            {linkText}
          </Link>
        )}
      </div>
      <div className="px-4 pb-4 pt-2">
        {rowCount === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">{empty}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
