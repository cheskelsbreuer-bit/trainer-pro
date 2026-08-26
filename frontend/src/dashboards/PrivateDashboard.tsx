// Dashboard variant for solo / private trainers.
//
// This is the ORIGINAL Trainer Pro dashboard — the one that fits a private
// trainer with a handful of clients, logging one-on-one sessions.
// New trainer-type variants (StudioDashboard, etc.) live alongside this
// one and the page-level router in pages/Dashboard.tsx picks between them
// based on the trainer's primary template.

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/PageHeader';
import { formatMoney, formatSessionWhen, initials } from '../lib/format';
import { Calendar, Users, DollarSign, TrendingUp } from 'lucide-react';
import type { Session, Client, Payment, Trainer } from '../lib/database.types';
import {
  LastNotesWidget,
  BirthdayBanner,
  NoShowStreakWidget,
} from '../components/DashboardExtras';
import { StudioOverviewCard } from '../components/StudioOverviewCard';
import { RevenueTrendWidget } from '../components/RevenueTrendWidget';
import { AdminReplyBanner } from '../components/AdminReplyBanner';
import { pickTemplateUx } from '../lib/templateUx';
import { useEnabledModules } from '../lib/modules';

export function PrivateDashboard({ trainer }: { trainer: Trainer | undefined }) {
  const { user } = useAuth();
  const ux = pickTemplateUx(trainer?.template_slugs);
  // Dashboard widgets obey the coach's feature switches too.
  const { isOn } = useEnabledModules(trainer?.template_slugs ?? undefined);

  const { data: clientCount } = useQuery({
    queryKey: ['clients-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: upcoming } = useQuery({
    queryKey: ['upcoming-sessions', user?.id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const oneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('sessions')
        .select('*, clients(full_name)')
        .gte('starts_at', now)
        .lte('starts_at', oneWeek)
        .in('status', ['scheduled', 'confirmed'])
        .order('starts_at', { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as (Session & { clients: { full_name: string } | null })[];
    },
  });

  const { data: monthRevenue } = useQuery({
    queryKey: ['revenue-month', user?.id],
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

  const { data: weekSessions } = useQuery({
    queryKey: ['week-sessions', user?.id],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { count, error } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .gte('starts_at', start.toISOString())
        .lte('starts_at', end.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: recentClients } = useQuery({
    queryKey: ['recent-clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader title={ux.dashboardHeadline} subtitle={ux.dashboardSubtitle} />

      <AdminReplyBanner />
      {trainer && <StudioOverviewCard trainer={trainer} />}

      {isOn('birthdays') && <BirthdayBanner />}
      <NoShowStreakWidget />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Users className="text-blue-600" size={20} />}
          label="Active clients"
          value={clientCount ?? '—'}
          link="/clients"
        />
        <StatCard
          icon={<Calendar className="text-emerald-600" size={20} />}
          label="Sessions this week"
          value={weekSessions ?? '—'}
          link="/sessions"
        />
        <StatCard
          icon={<DollarSign className="text-amber-600" size={20} />}
          label="Revenue this month"
          value={formatMoney(monthRevenue ?? 0)}
          link="/payments"
        />
        <StatCard
          icon={<TrendingUp className="text-violet-600" size={20} />}
          label="Coming up"
          value={upcoming?.length ?? 0}
          subtitle="next 7 days"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {isOn('reports') && <RevenueTrendWidget />}
        <LastNotesWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Upcoming sessions" link="/sessions" linkText="View all →">
          {!upcoming?.length ? (
            <EmptyState text="No sessions scheduled in the next 7 days." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((s) => (
                <li key={s.id} className="py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium text-sm">
                    {initials(s.clients?.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {s.clients?.full_name ?? 'Unknown client'}
                    </p>
                    <p className="text-xs text-slate-500">{formatSessionWhen(s.starts_at)}</p>
                  </div>
                  {s.location && (
                    <span className="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded">
                      {s.location}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={`Recent ${ux.clientNounPlural}`}
          link="/clients"
          linkText="See all →"
        >
          {!recentClients?.length ? (
            <EmptyState
              text={`No ${ux.clientNounPlural} yet. Add your first one!`}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentClients.map((c) => (
                <li key={c.id} className="py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-medium text-sm">
                    {initials(c.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/clients/${c.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600 truncate block"
                    >
                      {c.full_name}
                    </Link>
                    {c.goals && <p className="text-xs text-slate-500 truncate">{c.goals}</p>}
                  </div>
                  {c.package_balance > 0 && (
                    <span className="text-xs text-emerald-700 font-medium px-2 py-1 bg-emerald-50 rounded">
                      {c.package_balance} left
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  link?: string;
}) {
  const content = (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">
          {label}
          {subtitle && <span className="text-slate-400"> · {subtitle}</span>}
        </p>
      </div>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

function Card({
  title,
  link,
  linkText,
  children,
}: {
  title: string;
  link?: string;
  linkText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {link && (
          <Link to={link} className="text-sm text-blue-600 hover:underline">
            {linkText}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-slate-500 py-8 text-center">{text}</p>;
}
