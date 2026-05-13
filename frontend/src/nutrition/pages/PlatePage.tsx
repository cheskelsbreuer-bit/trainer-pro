// Plate — the billing page, but presented as a "what's on your plate
// this month" magazine spread. Big serif numbers, italic captions,
// no aggressive SaaS chart energy.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Payment } from '../../lib/database.types';
import { formatMoney } from '../../lib/format';
import { N, SERIF_FONT } from '../theme';

type PayWith = Payment & { clients: { full_name: string } | null };

export function PlatePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [cid, setCid] = useState('');
  const [amt, setAmt] = useState('');

  const { data: clients } = useQuery({
    queryKey: ['nutrition-clients', user?.id],
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
    queryKey: ['nutrition-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, clients(full_name)')
        .order('paid_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as PayWith[];
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
      if (!cid) throw new Error('Pick a client');
      const v = parseFloat(amt);
      if (!v || v <= 0) throw new Error('Amount must be > 0');
      const { error } = await supabase.from('payments').insert({
        trainer_id: user.id,
        client_id: cid,
        amount: v,
        currency: 'USD',
        payment_type: 'subscription',
        method: 'cash',
        paid_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCid('');
      setAmt('');
      qc.invalidateQueries({ queryKey: ['nutrition-payments'] });
    },
  });

  return (
    <div className="px-6 sm:px-12 pt-10 max-w-5xl mx-auto">
      <section className="text-center mb-10">
        <p className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: N.coral }}>
          The Ledger
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
          What's on the Plate
        </h2>
        <p
          className="mt-2 text-sm italic"
          style={{ color: N.mute, fontFamily: SERIF_FONT }}
        >
          A quiet record of your practice's revenue
        </p>
      </section>

      {/* The Big Number — like a magazine pull-quote */}
      <div className="text-center mb-12">
        <p className="text-[10px] uppercase tracking-[0.5em] mb-3" style={{ color: N.sageDeep }}>
          This Month
        </p>
        <p
          className="leading-none"
          style={{
            fontFamily: SERIF_FONT,
            color: N.sageDeep,
            fontSize: 'clamp(4rem, 12vw, 8rem)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
          }}
        >
          {formatMoney(monthTotal)}
        </p>
        <p
          className="text-sm italic mt-3"
          style={{ color: N.mute, fontFamily: SERIF_FONT }}
        >
          Year to date · <span style={{ color: N.ink }}>{formatMoney(yearTotal)}</span>{' '}
          · {(payments ?? []).length} payments on file
        </p>
      </div>

      {/* Record-a-payment single-line bar — minimal, calm */}
      <div
        className="rounded-2xl p-4 mb-10 flex flex-wrap items-end gap-3"
        style={{ background: N.card, border: `1px solid ${N.rule}` }}
      >
        <div className="flex-1 min-w-[180px]">
          <p className="text-[10px] uppercase tracking-[0.25em] italic mb-1" style={{ color: N.mute, fontFamily: SERIF_FONT }}>
            Client
          </p>
          <select
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
            style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
          >
            <option value="">Pick a client…</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <p className="text-[10px] uppercase tracking-[0.25em] italic mb-1" style={{ color: N.mute, fontFamily: SERIF_FONT }}>
            Amount
          </p>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            placeholder="$"
            className="w-full px-3 py-2 text-sm text-right font-mono rounded-md focus:outline-none"
            style={{ background: N.inset, color: N.ink, border: `1px solid ${N.rule}` }}
          />
        </div>
        <button
          onClick={() => record.mutate()}
          disabled={record.isPending || !cid || !amt}
          className="px-4 py-2 rounded-md text-[11px] uppercase tracking-[0.3em] italic disabled:opacity-40"
          style={{ background: N.sage, color: '#FFF', fontFamily: SERIF_FONT }}
        >
          {record.isPending ? 'Saving…' : 'Record'}
        </button>
        {record.error && (
          <span
            className="text-xs italic w-full"
            style={{ color: N.danger, fontFamily: SERIF_FONT }}
          >
            {(record.error as Error).message}
          </span>
        )}
      </div>

      {/* The list — italic captions, serif amounts */}
      <h3
        className="leading-tight mb-2"
        style={{
          fontFamily: SERIF_FONT,
          color: N.ink,
          fontSize: '1.625rem',
          fontWeight: 600,
        }}
      >
        Most recent entries
      </h3>
      <div className="h-px mb-3" style={{ background: N.rule }} />
      {!payments || payments.length === 0 ? (
        <p
          className="text-center py-12 italic"
          style={{ color: N.mute, fontFamily: SERIF_FONT, fontSize: '1.05rem' }}
        >
          No payments recorded yet.
        </p>
      ) : (
        <ul>
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex items-baseline justify-between py-2.5 border-b border-dashed"
              style={{ borderColor: N.ruleSoft }}
            >
              <span
                className="truncate"
                style={{
                  fontFamily: SERIF_FONT,
                  color: N.ink,
                  fontSize: '1.05rem',
                  fontWeight: 500,
                }}
              >
                {p.clients?.full_name ?? '—'}
              </span>
              <span
                className="text-[10px] uppercase tracking-[0.2em] italic flex-1 text-center"
                style={{ color: N.muteFaint, fontFamily: SERIF_FONT }}
              >
                {new Date(p.paid_at).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span
                className="font-mono shrink-0"
                style={{
                  color: N.sageDeep,
                  fontFamily: SERIF_FONT,
                  fontSize: '1.125rem',
                  fontWeight: 500,
                }}
              >
                {formatMoney(Number(p.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
