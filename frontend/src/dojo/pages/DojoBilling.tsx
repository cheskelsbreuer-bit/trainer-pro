// Billing — monthly tuition view. Lists recent payments, who's behind,
// and total revenue. Designed for the dojo owner's monthly check.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, AlertTriangle, Plus, DollarSign } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Payment } from '../../lib/database.types';
import { formatMoney } from '../../lib/format';
import { DOJO_COLORS } from '../theme';
import {
  DojoPage,
  DojoPageHeader,
  DojoCard,
  DojoSectionHeader,
  DojoStatTile,
  DojoButton,
} from '../components/DojoUI';

type PaymentWithClient = Payment & { clients: { full_name: string } | null };

export function DojoBilling() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');

  const { data: students } = useQuery({
    queryKey: ['dojo-students-all', user?.id],
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

  const { data: payments } = useQuery({
    queryKey: ['dojo-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, clients(full_name)')
        .order('paid_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PaymentWithClient[];
    },
  });

  const monthTotal = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return (payments ?? [])
      .filter((p) => new Date(p.paid_at) >= start)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }, [payments]);

  const yearTotal = useMemo(() => {
    const start = new Date(new Date().getFullYear(), 0, 1);
    return (payments ?? [])
      .filter((p) => new Date(p.paid_at) >= start)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }, [payments]);

  const studentsBehind = useMemo(() => {
    return (students ?? []).filter(
      (s) => Number(s.package_balance ?? 0) === 0,
    );
  }, [students]);

  const record = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!studentId) throw new Error('Pick a student');
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) throw new Error('Amount must be > 0');
      const { error } = await supabase.from('payments').insert({
        trainer_id: user.id,
        client_id: studentId,
        amount: amt,
        currency: 'USD',
        payment_type: 'subscription',
        method: 'cash',
        paid_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setStudentId('');
      setAmount('');
      qc.invalidateQueries({ queryKey: ['dojo-payments'] });
    },
  });

  return (
    <DojoPage>
      <DojoPageHeader
        eyebrow="The money"
        title="Billing"
        subtitle="Record tuition the moment a student pays. Below: history, monthly totals, and who's behind on dues."
      />

      {/* Always-visible record-a-payment panel. The user complained they
          couldn't find how to record a payment, so we never hide this form. */}
      <DojoCard className="mb-6" accent="gold">
        <DojoSectionHeader
          icon={<DollarSign size={14} />}
          title="Record a payment"
          hint="Pick a student, enter the amount, save — that's it."
        />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-3 items-end">
          <div>
            <label
              className="block text-xs uppercase tracking-wider font-semibold mb-1"
              style={{ color: DOJO_COLORS.textSecondary }}
            >
              Student
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={{
                background: DOJO_COLORS.bgInset,
                color: DOJO_COLORS.textPrimary,
                border: `1px solid ${DOJO_COLORS.divider}`,
              }}
            >
              <option value="">Pick a student…</option>
              {(students ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block text-xs uppercase tracking-wider font-semibold mb-1"
              style={{ color: DOJO_COLORS.textSecondary }}
            >
              Amount ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={{
                background: DOJO_COLORS.bgInset,
                color: DOJO_COLORS.textPrimary,
                border: `1px solid ${DOJO_COLORS.divider}`,
              }}
            />
          </div>
          <DojoButton
            variant="gold"
            onClick={() => record.mutate()}
            disabled={record.isPending || !studentId || !amount}
            className="h-[38px]"
          >
            <Plus size={14} /> {record.isPending ? 'Saving…' : 'Save payment'}
          </DojoButton>
        </div>
        {record.error && (
          <p className="px-4 pb-3 text-xs" style={{ color: DOJO_COLORS.danger }}>
            {(record.error as Error).message}
          </p>
        )}
        {record.isSuccess && !record.isPending && !record.error && (
          <p className="px-4 pb-3 text-xs" style={{ color: DOJO_COLORS.ok }}>
            Payment saved. Add another or scroll down to see the history.
          </p>
        )}
      </DojoCard>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <DojoStatTile
          label="This month"
          value={formatMoney(monthTotal)}
          emphasis="gold"
        />
        <DojoStatTile
          label="Year to date"
          value={formatMoney(yearTotal)}
          emphasis="brand"
        />
        <DojoStatTile
          label="Inactive this cycle"
          value={studentsBehind.length}
          sublabel="0 classes since last promotion"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DojoCard className="lg:col-span-2" accent="gold">
          <DojoSectionHeader
            icon={<Wallet size={14} />}
            title="Recent payments"
            hint={`${(payments ?? []).length} shown`}
          />
          {!payments || payments.length === 0 ? (
            <p
              className="px-4 py-8 text-sm text-center"
              style={{ color: DOJO_COLORS.textMuted }}
            >
              No payments yet.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: DOJO_COLORS.divider }}>
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="px-4 py-2.5 flex items-center gap-3 text-sm"
                >
                  <span
                    className="flex-1 truncate"
                    style={{ color: DOJO_COLORS.textPrimary }}
                  >
                    {p.clients?.full_name ?? '—'}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: DOJO_COLORS.textMuted }}
                  >
                    {new Date(p.paid_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: DOJO_COLORS.gold, minWidth: 80, textAlign: 'right' }}
                  >
                    {formatMoney(Number(p.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DojoCard>

        <DojoCard accent="brand">
          <DojoSectionHeader
            icon={<AlertTriangle size={14} />}
            title="Hasn't attended yet"
            hint={`${studentsBehind.length}`}
          />
          {studentsBehind.length === 0 ? (
            <p
              className="px-4 py-8 text-sm text-center"
              style={{ color: DOJO_COLORS.textMuted }}
            >
              Every student is current.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: DOJO_COLORS.divider }}>
              {studentsBehind.slice(0, 20).map((s) => (
                <li
                  key={s.id}
                  className="px-4 py-2 text-sm"
                  style={{ color: DOJO_COLORS.textPrimary }}
                >
                  {s.full_name}
                </li>
              ))}
            </ul>
          )}
        </DojoCard>
      </div>
    </DojoPage>
  );
}
