// The Books — billing as a newspaper-style "Money column". One huge
// headline number (this month total), a record-strip with year-to-date,
// and a single-line entry log below. The record-a-payment input lives
// at the top as a one-line bar — not a card with multiple form rows.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Payment } from '../../lib/database.types';
import { formatMoney } from '../../lib/format';
import { C, DISPLAY_FONT } from '../theme';

type PayWith = Payment & { clients: { full_name: string } | null };

export function BooksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

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
        .limit(100);
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

  // Group payments by day for the column layout
  const byDay = useMemo(() => {
    const m = new Map<string, PayWith[]>();
    (payments ?? []).forEach((p) => {
      const key = new Date(p.paid_at).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
      });
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    });
    return Array.from(m.entries());
  }, [payments]);

  return (
    <div>
      {/* Masthead — newspaper top */}
      <div
        className="px-4 sm:px-8 pt-8 pb-4 border-b"
        style={{ background: C.inkSoft, borderColor: C.rule }}
      >
        <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.red }}>
          The Books
        </p>
        <h1
          className="font-black uppercase mt-1"
          style={{
            fontFamily: DISPLAY_FONT,
            color: C.text,
            fontSize: 'clamp(2.5rem, 7vw, 6rem)',
            letterSpacing: '0.04em',
            lineHeight: 0.9,
          }}
        >
          Money this month
        </h1>
        <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
          <p
            className="font-black"
            style={{
              fontFamily: DISPLAY_FONT,
              color: C.beltGold,
              fontSize: 'clamp(3rem, 9vw, 6rem)',
              letterSpacing: '0.02em',
              lineHeight: 0.9,
            }}
          >
            {formatMoney(monthTotal)}
          </p>
          <p
            className="text-xs uppercase tracking-[0.3em] pb-2"
            style={{ color: C.textDim }}
          >
            Year to date: <strong style={{ color: C.text }}>{formatMoney(yearTotal)}</strong> ·
            payments on file: <strong style={{ color: C.text }}>{(payments ?? []).length}</strong>
          </p>
        </div>
      </div>

      {/* One-line entry bar */}
      <RecordBar fighters={fighters ?? []} qc={qc} userId={user?.id} />

      {/* Newspaper columns — payments grouped by day */}
      <div className="px-4 sm:px-8 py-6">
        {byDay.length === 0 ? (
          <p
            className="text-center text-sm py-16 uppercase tracking-[0.3em]"
            style={{ color: C.textFaint }}
          >
            no entries on the books yet
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            {byDay.map(([day, list]) => (
              <div key={day} className="mb-6 break-inside-avoid">
                <p
                  className="font-bold uppercase pb-1 border-b mb-2"
                  style={{
                    fontFamily: DISPLAY_FONT,
                    color: C.red,
                    fontSize: '0.875rem',
                    letterSpacing: '0.2em',
                    borderColor: C.rule,
                  }}
                >
                  {day}
                </p>
                <ul>
                  {list.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-baseline justify-between gap-2 py-1.5 text-sm border-b border-dashed"
                      style={{ borderColor: C.rule }}
                    >
                      <span className="truncate" style={{ color: C.text }}>
                        {p.clients?.full_name ?? '—'}
                        {p.method && (
                          <span
                            className="text-[10px] uppercase tracking-widest ml-2"
                            style={{ color: C.textFaint }}
                          >
                            {p.method}
                          </span>
                        )}
                      </span>
                      <span
                        className="font-mono shrink-0"
                        style={{ color: C.beltGold }}
                      >
                        {formatMoney(Number(p.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecordBar({
  fighters,
  qc,
  userId,
}: {
  fighters: Client[];
  qc: ReturnType<typeof useQueryClient>;
  userId: string | undefined;
}) {
  const [fid, setFid] = useState('');
  const [amt, setAmt] = useState('');
  const record = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in');
      if (!fid) throw new Error('Pick a fighter');
      const v = parseFloat(amt);
      if (!v || v <= 0) throw new Error('Amount must be > 0');
      const { error } = await supabase.from('payments').insert({
        trainer_id: userId,
        client_id: fid,
        amount: v,
        currency: 'USD',
        payment_type: 'subscription',
        method: 'cash',
        paid_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setFid('');
      setAmt('');
      qc.invalidateQueries({ queryKey: ['boxing-payments'] });
    },
  });

  return (
    <div
      className="px-4 sm:px-8 py-3 border-b flex items-center gap-2 flex-wrap"
      style={{ background: C.ink, borderColor: C.rule }}
    >
      <span
        className="text-[10px] uppercase tracking-[0.3em] mr-1 shrink-0"
        style={{ color: C.textDim }}
      >
        Take a payment:
      </span>
      <select
        value={fid}
        onChange={(e) => setFid(e.target.value)}
        className="flex-1 min-w-[160px] px-3 py-1.5 text-sm focus:outline-none"
        style={{ background: C.inkSoft, color: C.text, border: `1px solid ${C.rule}` }}
      >
        <option value="">Pick a fighter…</option>
        {fighters.map((f) => (
          <option key={f.id} value={f.id}>{f.full_name}</option>
        ))}
      </select>
      <input
        type="number"
        min="0"
        step="0.01"
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
        placeholder="$"
        className="w-24 px-3 py-1.5 text-sm text-right font-mono focus:outline-none"
        style={{ background: C.inkSoft, color: C.text, border: `1px solid ${C.rule}` }}
      />
      <button
        onClick={() => record.mutate()}
        disabled={record.isPending || !fid || !amt}
        className="px-4 py-1.5 font-bold uppercase tracking-[0.2em] text-xs disabled:opacity-40"
        style={{ fontFamily: DISPLAY_FONT, background: C.beltGold, color: '#1A1208' }}
      >
        {record.isPending ? 'Saving…' : 'Record'}
      </button>
      {record.error && (
        <span className="text-xs w-full" style={{ color: C.danger }}>
          {(record.error as Error).message}
        </span>
      )}
    </div>
  );
}
