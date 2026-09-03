// The family page a mother opens from a text. No account, no password,
// nothing installed — the token in the address is the whole credential.
//
// Everything here goes through the four functions in
// supabase/48_family_link_no_account.sql, which resolve that token to one
// family and refuse everything else. This page never touches a table.
//
// Written for a phone held one-handed. The first thing on the screen is
// the number she opened it for.

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import { B, readBalance, ageOf, formatMoney, shortDate } from '../theme';

interface FamilyPage {
  ok: boolean;
  business: string | null;
  kids: Client[];
  payments: Array<{
    id: string;
    client_id: string;
    amount: number;
    method: string | null;
    description: string | null;
    paid_at: string;
  }>;
  messages: Array<{
    id: string;
    client_id: string;
    sender: 'trainer' | 'client';
    body: string;
    created_at: string;
  }>;
  anchor_id: string;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function FamilyLinkPage() {
  const { token = '' } = useParams();
  const qc = useQueryClient();

  // Never hand this token to another site. A link out of this page would
  // otherwise carry it in the Referer header, and the token is the
  // password.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  const page = useQuery({
    queryKey: ['family-page', token],
    queryFn: () => rpc<FamilyPage>('family_page', { p_token: token }),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState(false);
  const reply = useMutation({
    mutationFn: (body: string) => rpc<{ ok: boolean }>('family_reply', { p_token: token, p_body: body }),
    onSuccess: () => {
      setDraft('');
      setSent(true);
      window.setTimeout(() => setSent(false), 4000);
      qc.invalidateQueries({ queryKey: ['family-page', token] });
    },
  });

  const [outNote, setOutNote] = useState<string | null>(null);
  const absence = useMutation({
    mutationFn: (kid: Client) =>
      rpc<{ ok: boolean }>('family_absence', {
        p_token: token,
        p_client_id: kid.id,
        p_date: new Date().toISOString().slice(0, 10),
        p_note: null,
      }).then(() => kid.full_name.split(' ')[0]),
    onSuccess: (name) => {
      setOutNote(name);
      window.setTimeout(() => setOutNote(null), 5000);
    },
  });

  const kids = page.data?.kids ?? [];
  const smsOn = useMemo(
    () => kids.some((k) => (k.tags ?? []).includes('smsconsent:1')),
    [kids],
  );
  const consent = useMutation({
    mutationFn: (on: boolean) =>
      rpc<{ ok: boolean }>('family_sms_consent', { p_token: token, p_on: on }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family-page', token] }),
  });

  const balance = useMemo(
    () => Math.round(kids.reduce((s, k) => s + readBalance(k), 0) * 100) / 100,
    [kids],
  );

  // Notes the sitter sent to everyone, newest first.
  const notices = useMemo(
    () => (page.data?.messages ?? []).filter((m) => m.sender === 'trainer').slice(-6).reverse(),
    [page.data],
  );

  if (page.isLoading) {
    return <Frame><p style={soft}>Opening your page…</p></Frame>;
  }

  if (page.isError || !page.data?.ok) {
    return (
      <Frame>
        <h1 style={h1}>This link isn't working</h1>
        <p style={soft}>
          It may have been replaced by a newer one. Ask for a fresh link and this page will open
          again — there's nothing to install and nothing to remember.
        </p>
      </Frame>
    );
  }

  const d = page.data;

  return (
    <Frame>
      <div style={{ marginBottom: 4, fontSize: '0.78rem', fontWeight: 800, color: B.mute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {d.business || 'Babysitting'}
      </div>

      {/* The number she opened this for. */}
      <div
        style={{
          background: balance > 0.005 ? B.redSoft : B.greenSoft,
          borderRadius: B.radiusLg,
          padding: '18px 20px',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1.05, color: balance > 0.005 ? B.red : B.green, fontFamily: B.fontDisplay }}>
          {formatMoney(Math.abs(balance))}
        </div>
        <div style={{ fontWeight: 700, color: balance > 0.005 ? B.red : B.green, marginTop: 4 }}>
          {balance > 0.005 ? 'is owed' : balance < -0.005 ? 'in credit' : "you're all paid up"}
        </div>
      </div>

      <Section title={kids.length === 1 ? 'Your child' : 'Your children'}>
        <div style={{ display: 'grid', gap: 8 }}>
          {kids.map((k) => (
            <div
              key={k.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                background: B.card,
                border: `1px solid ${B.rule}`,
                borderRadius: B.radiusSm,
                padding: '11px 13px',
              }}
            >
              <span style={{ fontWeight: 800 }}>{k.full_name}</span>
              {ageOf(k.date_of_birth) && (
                <span style={{ color: B.mute, fontSize: '0.78rem', fontWeight: 700 }}>{ageOf(k.date_of_birth)}</span>
              )}
              {k.medical_notes?.trim() && (
                <span style={{ color: B.red, fontSize: '0.76rem', fontWeight: 800 }}>⚠️ {k.medical_notes}</span>
              )}
              <button
                type="button"
                onClick={() => absence.mutate(k)}
                disabled={absence.isPending}
                style={{
                  marginLeft: 'auto',
                  border: `1px solid ${B.rule}`,
                  background: 'transparent',
                  color: B.inkSoft,
                  borderRadius: 999,
                  padding: '7px 13px',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  minHeight: 38,
                }}
              >
                Not coming today
              </button>
            </div>
          ))}
        </div>
        {outNote && (
          <p style={{ ...soft, color: B.green, fontWeight: 700, marginTop: 10 }}>
            ✓ Told them {outNote} isn't coming today.
          </p>
        )}
      </Section>

      {notices.length > 0 && (
        <Section title="From your sitter">
          <div style={{ display: 'grid', gap: 8 }}>
            {notices.map((m) => (
              <div key={m.id} style={{ background: B.butterSoft, borderRadius: B.radiusSm, padding: '11px 13px' }}>
                <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{m.body}</div>
                <div style={{ fontSize: '0.72rem', color: B.mute, marginTop: 4 }}>{shortDate(m.created_at)}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Send her a message">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type here…"
          rows={3}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            border: `1px solid ${B.rule}`,
            borderRadius: B.radiusSm,
            padding: '11px 13px',
            fontSize: '1rem',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <button
          type="button"
          onClick={() => draft.trim() && reply.mutate(draft)}
          disabled={!draft.trim() || reply.isPending}
          style={{
            marginTop: 8,
            border: 'none',
            background: draft.trim() ? B.primary : '#e8e0d4',
            color: draft.trim() ? '#fff' : B.mute,
            borderRadius: 999,
            padding: '12px 22px',
            fontWeight: 800,
            fontSize: '0.94rem',
            cursor: draft.trim() ? 'pointer' : 'default',
            minHeight: 44,
          }}
        >
          {reply.isPending ? 'Sending…' : 'Send'}
        </button>
        {sent && <p style={{ ...soft, color: B.green, fontWeight: 700 }}>✓ Sent — she'll see it in her app.</p>}
        {reply.isError && <p style={{ ...soft, color: B.red }}>Couldn't send that. Try again in a moment.</p>}
      </Section>

      {d.payments.length > 0 && (
        <Section title="What you've paid">
          <div style={{ display: 'grid', gap: 6 }}>
            {d.payments.slice(0, 8).map((p) => (
              <div key={p.id} style={{ display: 'flex', gap: 10, fontSize: '0.88rem' }}>
                <span style={{ fontWeight: 800 }}>{formatMoney(Number(p.amount))}</span>
                <span style={{ color: B.mute }}>{shortDate(p.paid_at)}</span>
                {p.method && <span style={{ color: B.mute, marginLeft: 'auto' }}>{p.method}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Text messages">
        <label style={{ display: 'flex', gap: 11, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={smsOn}
            disabled={consent.isPending}
            onChange={(e) => consent.mutate(e.target.checked)}
            style={{ width: 20, height: 20, marginTop: 2, accentColor: B.primary, flex: 'none' }}
          />
          <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
            Text me reminders and updates.
            <span style={{ display: 'block', color: B.mute, fontSize: '0.8rem', marginTop: 2 }}>
              Your choice, and you can change it here any time. Message and data rates may apply.
              Reply STOP to any text to stop them.
            </span>
          </span>
        </label>
      </Section>

      <p style={{ ...soft, marginTop: 26, fontSize: '0.76rem' }}>
        This page is just for your family. Keep the link to yourself — anyone you forward it to can
        see it too.
      </p>
    </Frame>
  );
}

const h1: React.CSSProperties = {
  fontFamily: B.fontDisplay,
  fontSize: '1.35rem',
  fontWeight: 800,
  margin: '0 0 8px',
  color: B.ink,
};

const soft: React.CSSProperties = {
  color: B.mute,
  fontSize: '0.88rem',
  lineHeight: 1.55,
  margin: '8px 0 0',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2
        style={{
          fontFamily: B.fontDisplay,
          fontSize: '0.95rem',
          fontWeight: 800,
          color: B.ink,
          margin: '0 0 10px',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: B.bg,
        color: B.ink,
        fontFamily: B.fontBody,
        padding: '24px 16px 60px',
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto' }}>{children}</div>
    </div>
  );
}
