// Check-ins — the weekly client submission inbox. Each entry reads
// like a letter (italic, indented quote, signed off with the client's
// name). The coach's reply is composed inline like writing a reply
// in a notebook margin.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import {
  N,
  SERIF_FONT,
  relativeWhen,
  type CheckInRow,
} from '../theme';

export function CheckInsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending');

  const { data: clients } = useQuery({
    queryKey: ['nutrition-clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });

  const { data: checkIns, error: loadError } = useQuery({
    queryKey: ['nutrition-check-ins', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_check_ins')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CheckInRow[];
    },
  });

  const tableMissing =
    loadError &&
    (loadError as Error).message?.toLowerCase().includes('nutrition_check_ins');

  const list = useMemo(
    () => (checkIns ?? []).filter((c) => c.status === tab),
    [checkIns, tab],
  );

  return (
    <div className="px-6 sm:px-12 pt-10 max-w-3xl mx-auto">
      <section className="text-center mb-8">
        <p className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: N.coral }}>
          Correspondence
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
          Weekly Check-ins
        </h2>
        <p
          className="mt-2 text-sm italic"
          style={{ color: N.mute, fontFamily: SERIF_FONT }}
        >
          Letters from clients on the week that was
        </p>
      </section>

      {tableMissing && (
        <div
          className="mb-6 p-5 rounded-2xl"
          style={{ background: N.coralSoft, border: `1px solid ${N.coral}` }}
        >
          <p
            className="text-sm italic"
            style={{ color: N.ink, fontFamily: SERIF_FONT }}
          >
            The check-ins table isn't installed yet. Paste the SQL from
            migration <code>32_nutrition_check_ins.sql</code> into Supabase
            and reload.
          </p>
        </div>
      )}

      {/* Tabs — italic underline rather than pill buttons */}
      <div
        className="flex items-center gap-6 justify-center border-b pb-3 mb-8"
        style={{ borderColor: N.rule }}
      >
        {(['pending', 'reviewed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="text-[11px] uppercase tracking-[0.3em] italic"
            style={{
              fontFamily: SERIF_FONT,
              color: tab === t ? N.sageDeep : N.mute,
              borderBottom: tab === t ? `2px solid ${N.sage}` : `2px solid transparent`,
              paddingBottom: '0.5rem',
            }}
          >
            {t} {tab === t && `(${list.length})`}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p
          className="text-center py-12 italic"
          style={{ color: N.mute, fontFamily: SERIF_FONT, fontSize: '1.05rem' }}
        >
          {tab === 'pending' ? 'The desk is clear.' : 'Nothing replied yet this season.'}
        </p>
      ) : (
        <ul className="space-y-8">
          {list.map((c) => {
            const client = (clients ?? []).find((x) => x.id === c.client_id);
            return (
              <CheckInLetter
                key={c.id}
                checkIn={c}
                clientName={client?.full_name ?? 'Unknown'}
                qc={qc}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CheckInLetter({
  checkIn,
  clientName,
  qc,
}: {
  checkIn: CheckInRow;
  clientName: string;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [reply, setReply] = useState(checkIn.coach_reply ?? '');

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('nutrition_check_ins')
        .update({
          coach_reply: reply.trim() || null,
          status: 'reviewed',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', checkIn.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition-check-ins'] }),
  });

  return (
    <li
      className="rounded-2xl p-6"
      style={{ background: N.card, border: `1px solid ${N.rule}` }}
    >
      {/* Letter dateline */}
      <p
        className="text-[10px] uppercase tracking-[0.3em] mb-1"
        style={{ color: N.mute }}
      >
        Week of {new Date(checkIn.week_starting).toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
        })}{' '}
        · {relativeWhen(checkIn.submitted_at)}
      </p>
      <h3
        className="leading-tight mb-1"
        style={{
          fontFamily: SERIF_FONT,
          color: N.ink,
          fontSize: '1.625rem',
          fontWeight: 600,
        }}
      >
        From {clientName}
      </h3>

      {/* Stats strip — small + sparse, like newspaper rule lines */}
      <div
        className="flex flex-wrap gap-x-5 gap-y-1 mt-2 mb-4 pb-4 border-b text-xs"
        style={{ borderColor: N.ruleSoft }}
      >
        <StatPair label="Weight" value={checkIn.weight_lb != null ? `${checkIn.weight_lb} lb` : null} />
        <StatPair label="Body fat" value={checkIn.body_fat_pct != null ? `${checkIn.body_fat_pct}%` : null} />
        <StatPair label="Compliance" value={checkIn.compliance_pct != null ? `${checkIn.compliance_pct}%` : null} />
        <StatPair label="Energy" value={checkIn.energy_1_5 != null ? `${checkIn.energy_1_5}/5` : null} />
        <StatPair label="Hunger" value={checkIn.hunger_1_5 != null ? `${checkIn.hunger_1_5}/5` : null} />
        <StatPair label="Sleep" value={checkIn.sleep_hours_avg != null ? `${checkIn.sleep_hours_avg.toFixed(1)}h` : null} />
      </div>

      {/* The "letter" body — italic indented */}
      {checkIn.client_notes && (
        <blockquote
          className="px-4 my-2 italic leading-relaxed"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: '1.05rem',
            borderLeft: `3px solid ${N.sage}`,
          }}
        >
          {checkIn.client_notes}
        </blockquote>
      )}

      {/* Reply box — handwritten-margin feel */}
      <div className="mt-5">
        <p
          className="text-[10px] uppercase tracking-[0.3em] mb-2 italic"
          style={{ color: N.sageDeep, fontFamily: SERIF_FONT }}
        >
          Your reply
        </p>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          placeholder="A few words back…"
          className="w-full px-4 py-3 text-sm rounded-md focus:outline-none italic leading-relaxed"
          style={{
            background: N.inset,
            color: N.ink,
            border: `1px solid ${N.rule}`,
            fontFamily: SERIF_FONT,
            fontSize: '1rem',
          }}
        />
        <div className="flex items-center justify-end gap-3 mt-2">
          {send.error && (
            <span
              className="text-xs italic"
              style={{ color: N.danger, fontFamily: SERIF_FONT }}
            >
              {(send.error as Error).message}
            </span>
          )}
          <button
            onClick={() => send.mutate()}
            disabled={send.isPending}
            className="px-4 py-2 rounded-md text-[11px] uppercase tracking-[0.3em] italic disabled:opacity-50"
            style={{
              background: N.sage,
              color: '#FFF',
              fontFamily: SERIF_FONT,
            }}
          >
            {send.isPending
              ? 'Sending…'
              : checkIn.status === 'reviewed'
                ? 'Update reply'
                : 'Send reply & file'}
          </button>
        </div>
      </div>
    </li>
  );
}

function StatPair({ label, value }: { label: string; value: string | null }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: N.mute }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: SERIF_FONT,
          color: value ? N.ink : N.muteFaint,
          fontSize: '1rem',
          fontWeight: 500,
        }}
      >
        {value ?? '—'}
      </span>
    </span>
  );
}
