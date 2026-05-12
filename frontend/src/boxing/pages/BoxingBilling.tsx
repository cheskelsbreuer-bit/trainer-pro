// Billing — same morning-routine pattern as the dojo, with boxing flavor.
// Always-visible record-a-payment form at the top, monthly + YTD totals,
// recent payments, and fighters with zero training logged this cycle.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, AlertTriangle, Plus, DollarSign } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Payment } from '../../lib/database.types';
import { formatMoney } from '../../lib/format';
import { BOXING_COLORS } from '../theme';
import {
  BoxingPage,
  BoxingPageHeader,
  BoxingCard,
  BoxingSectionHeader,
  BoxingStatTile,
  BoxingButton,
} from '../components/BoxingUI';

type PaymentWithClient = Payment & { clients: { full_name: string } | null };

export function BoxingBilling() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [fighterId, setFighterId] = useState('');
  const [amount, setAmount] = useState('');

  const { data: fighters } = useQuery({
    queryKey: ['boxing-fighters', user?.id],
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
    queryKey: ['boxing-payments', user?.id],
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
      .reduce((s, p) => s + Number(p.amount), 0);
  }, [payments]);

  const yearTotal = useMemo(() => {
    const start = new Date(new Date().getFullYear(), 0, 1);
    return (payments ?? [])
      .filter((p) => new Date(p.paid_at) >= start)
      .reduce((s, p) => s + Number(p.amount), 0);
  }, [payments]);

  const record = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!fighterId) throw new Error('Pick a fighter');
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) throw new Error('Amount must be > 0');
      const { error } = await supabase.from('payments').insert({
        trainer_id: user.id,
        client_id: fighterId,
        amount: amt,
        currency: 'USD',
        payment_type: 'subscription',
        method: 'cash',
        paid_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setFighterId('');
      setAmount('');
      qc.invalidateQueries({ queryKey: ['boxing-payments'] });
    },
  });

  return (
    <BoxingPage>
      <BoxingPageHeader
        eyebrow="The money"
        title="Billing"
        subtitle="Dues, camp fees, monthly totals. Record a payment as soon as the fighter pays."
        corner="gold"
      />

      <BoxingCard className="mb-6" accent="gold">
        <BoxingSectionHeader
          icon={<DollarSign size={14} />}
          title="Record a payment"
          hint="Fighter, amount, save — done."
        />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-3 items-end">
          <div>
            <label
              className="block text-xs uppercase tracking-wider font-semibold mb-1"
              style={{ color: BOXING_COLORS.textSecondary }}
            >
              Fighter
            </label>
            <select
              value={fighterId}
              onChange={(e) => setFighterId(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={{
                background: BOXING_COLORS.bgInset,
                color: BOXING_COLORS.textPrimary,
                border: `1px solid ${BOXING_COLORS.divider}`,
              }}
            >
              <option value="">Pick a fighter…</option>
              {(fighters ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block text-xs uppercase tracking-wider font-semibold mb-1"
              style={{ color: BOXING_COLORS.textSecondary }}
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
                background: BOXING_COLORS.bgInset,
                color: BOXING_COLORS.textPrimary,
                border: `1px solid ${BOXING_COLORS.divider}`,
              }}
            />
          </div>
          <BoxingButton
            variant="gold"
            onClick={() => record.mutate()}
            disabled={record.isPending || !fighterId || !amount}
            className="h-[38px]"
          >
            <Plus size={14} /> {record.isPending ? 'Saving…' : 'Save payment'}
          </BoxingButton>
        </div>
        {record.error && (
          <p className="px-4 pb-3 text-xs" style={{ color: BOXING_COLORS.danger }}>
            {(record.error as Error).message}
          </p>
        )}
        {record.isSuccess && !record.isPending && !record.error && (
          <p className="px-4 pb-3 text-xs" style={{ color: BOXING_COLORS.ok }}>
            Payment saved.
          </p>
        )}
      </BoxingCard>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <BoxingStatTile label="This month" value={formatMoney(monthTotal)} emphasis="gold" />
        <BoxingStatTile label="Year to date" value={formatMoney(yearTotal)} emphasis="red" />
        <BoxingStatTile
          label="Payments on file"
          value={(payments ?? []).length}
          emphasis="blue"
          sublabel="recent 50 shown"
        />
      </div>

      <BoxingCard accent="red">
        <BoxingSectionHeader
          icon={<Wallet size={14} />}
          title="Recent payments"
          hint={`${(payments ?? []).length} shown`}
        />
        {!payments || payments.length === 0 ? (
          <p
            className="px-4 py-8 text-sm text-center"
            style={{ color: BOXING_COLORS.textMuted }}
          >
            No payments recorded yet.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: BOXING_COLORS.divider }}>
            {payments.map((p) => (
              <li
                key={p.id}
                className="px-4 py-2.5 flex items-center gap-3 text-sm"
              >
                <span
                  className="flex-1 truncate"
                  style={{ color: BOXING_COLORS.textPrimary }}
                >
                  {p.clients?.full_name ?? '—'}
                </span>
                <span className="text-xs" style={{ color: BOXING_COLORS.textMuted }}>
                  {new Date(p.paid_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span
                  className="font-bold"
                  style={{ color: BOXING_COLORS.gold, minWidth: 80, textAlign: 'right' }}
                >
                  {formatMoney(Number(p.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </BoxingCard>

      {/* Reserved for future: "fighters behind on dues" using a real
          dues schedule once we add one. For now we show a placeholder hint. */}
      <div
        className="mt-4 px-4 py-3 text-xs flex items-center gap-2 rounded border"
        style={{
          background: BOXING_COLORS.bgInset,
          color: BOXING_COLORS.textMuted,
          borderColor: BOXING_COLORS.divider,
        }}
      >
        <AlertTriangle size={13} /> Auto-detection of fighters behind on monthly
        dues lands once we wire a real dues schedule. For now, record payments
        as they come in and the history is the source of truth.
      </div>
    </BoxingPage>
  );
}
