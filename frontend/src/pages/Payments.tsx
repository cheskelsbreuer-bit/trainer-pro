import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { formatMoney, formatDate } from '../lib/format';
import { DollarSign } from 'lucide-react';
import type { Payment } from '../lib/database.types';

export function Payments() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, clients(full_name, id)')
        .order('paid_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as (Payment & { clients: { full_name: string; id: string } | null })[];
    },
  });

  // Aggregate
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const thisMonth = payments?.filter((p) => new Date(p.paid_at) >= monthStart).reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const thisYear = payments?.filter((p) => new Date(p.paid_at) >= yearStart).reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const allTime = payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Payments"
        subtitle="Money in. Record payments from a client's profile."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat label="This month" value={formatMoney(thisMonth)} />
        <Stat label="This year" value={formatMoney(thisYear)} />
        <Stat label="All time (last 200)" value={formatMoney(allTime)} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <Th>Date</Th>
              <Th>Client</Th>
              <Th className="text-right">Amount</Th>
              <Th>Method</Th>
              <Th>Type</Th>
              <Th>Description</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && !payments?.length && (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <DollarSign className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-slate-500">No payments recorded yet.</p>
                </td>
              </tr>
            )}
            {payments?.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <Td>{formatDate(p.paid_at)}</Td>
                <Td>
                  {p.clients ? (
                    <Link to={`/clients/${p.clients.id}`} className="text-blue-600 hover:underline">
                      {p.clients.full_name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="text-right font-medium">{formatMoney(p.amount)}</Td>
                <Td className="capitalize">{p.method ?? '—'}</Td>
                <Td className="capitalize">
                  {p.payment_type}
                  {p.payment_type === 'package' && ` (${p.sessions_covered})`}
                </Td>
                <Td className="text-slate-500">{p.description ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left ${className ?? ''}`}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm text-slate-700 ${className ?? ''}`}>{children}</td>;
}
