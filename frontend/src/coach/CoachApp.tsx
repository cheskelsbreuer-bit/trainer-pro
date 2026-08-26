// ── Coach — the flagship 1-on-1 training app (v1 foundation) ─────────
//
// Growing behind /coach-preview until it beats the classic app; then
// solo_trainer / athletic_performance / online_coach templates flip
// here. Ships real from day one: fenced roster, real sessions, real
// money — plus honest "being built" stubs where a screen isn't ready.

import { useMemo, useState } from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Trainer } from '../lib/database.types';
import { FLOOR as F, TYPE, RADII, HIT, formatMoney, initialsOf, timeOf, shortDate } from './theme';
import { useCoachClients, useTodaySessions, useMonthPayments, useAddCoachClient } from './lib/roster';
import './coach.css';

// ── Small kit ─────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.lg, padding: '16px 18px', ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: F.mute }}>
      {children}
    </div>
  );
}

function BigTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 30, textTransform: 'uppercase', lineHeight: 1.1 }}>
      {children}
    </div>
  );
}

function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.29), background: F.edge, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: TYPE.display, fontWeight: 700, fontSize: Math.round(size * 0.38), color: F.ink,
      }}
    >
      {initialsOf(name)}
    </div>
  );
}

const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

// ── Icons (stroke SVG, no emoji) ──────────────────────────────────────
function Icon({ d, size = 21, color = 'currentColor', extra }: { d: string; size?: number; color?: string; extra?: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}></path>
      {extra}
    </svg>
  );
}
const IC = {
  today: 'M4 5 h16 v16 H4 Z M4 10 h16 M9 3 v4 M15 3 v4',
  clients: 'M9 12 a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 Z M3.5 20 a5.5 5.5 0 0 1 11 0 M17 12.6 a2.6 2.6 0 1 0-2-4.6 M15.5 20 a4.6 4.6 0 0 1 5-4.3',
  programs: 'M3 9.5 h3 v5 h-3 Z M18 9.5 h3 v5 h-3 Z M6 12 h12 M7.5 7.5 h2 v9 h-2 Z M14.5 7.5 h2 v9 h-2 Z',
  money: 'M12 3 a9 9 0 1 0 0 18 9 9 0 0 0 0-18 Z M12 6.5 v11 M14.8 9.2 a2.6 2.6 0 0 0-2.3-1.2 c-1.5 0-2.7 .8-2.7 2 s1 1.7 2.7 2 c1.9 .3 2.9 1 2.9 2.2 s-1.3 2-2.9 2 a3 3 0 0 1-2.6-1.3',
};

// ── Shell ─────────────────────────────────────────────────────────────
const NAV = [
  { to: '.', end: true, label: 'Today', icon: IC.today },
  { to: 'clients', end: false, label: 'Clients', icon: IC.clients },
  { to: 'programs', end: false, label: 'Programs', icon: IC.programs },
  { to: 'money', end: false, label: 'Money', icon: IC.money },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: trainer } = useQuery({
    queryKey: ['trainer', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('trainers').select('*').eq('id', user!.id).single();
      if (error) throw error;
      return data as Trainer;
    },
    enabled: !!user,
  });
  const name = trainer?.business_name?.trim() || trainer?.full_name?.trim() || 'Coach';

  return (
    <div className="coach-root">
      <aside className="coach-side">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 8px 18px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: F.accent, color: F.accentInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TYPE.display, fontWeight: 700, fontSize: 16 }}>
            {initialsOf(name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 10.5, letterSpacing: '0.1em', color: F.mute }}>COACH · PREVIEW</div>
          </div>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.label} to={n.to} end={n.end} className={({ isActive }) => `coach-sidelink${isActive ? ' active' : ''}`}>
            <Icon d={n.icon} size={19} />
            {n.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', fontSize: 12, color: F.mute, padding: '0 8px', lineHeight: 1.5 }}>
          The new 1-on-1 app, growing screen by screen. Your classic app keeps working meanwhile.
        </div>
      </aside>

      <main className="coach-main">{children}</main>

      <nav className="coach-tabbar">
        {NAV.map((n) => (
          <NavLink key={n.label} to={n.to} end={n.end} className={({ isActive }) => `coach-tab${isActive ? ' active' : ''}`}>
            <Icon d={n.icon} size={21} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

// ── Today ─────────────────────────────────────────────────────────────
function TodayPage() {
  const { data: sessions, isLoading } = useTodaySessions();
  const { data: clients } = useCoachClients();
  const { data: payments } = useMonthPayments();

  const active = useMemo(() => (clients ?? []).filter((c) => c.status === 'active'), [clients]);
  const collected = useMemo(
    () => Math.round(((payments ?? []).reduce((s, p) => s + Number(p.amount), 0)) * 100) / 100,
    [payments],
  );
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const now = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <SectionLabel>{dayName}</SectionLabel>
        <BigTitle>Your day</BigTitle>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <Card style={{ padding: '13px 15px' }}>
          <div style={{ ...num, fontWeight: 800, fontSize: 23 }}>{sessions?.length ?? '—'}</div>
          <div style={{ fontSize: 11.5, color: F.mute, fontWeight: 600 }}>sessions today</div>
        </Card>
        <Card style={{ padding: '13px 15px' }}>
          <div style={{ ...num, fontWeight: 800, fontSize: 23 }}>{active.length}</div>
          <div style={{ fontSize: 11.5, color: F.mute, fontWeight: 600 }}>active clients</div>
        </Card>
        <Card style={{ padding: '13px 15px' }}>
          <div style={{ ...num, fontWeight: 800, fontSize: 23, color: F.good }}>{formatMoney(collected)}</div>
          <div style={{ fontSize: 11.5, color: F.mute, fontWeight: 600 }}>this month</div>
        </Card>
      </div>

      {isLoading ? (
        <Card><div style={{ color: F.mute, fontSize: 14 }}>Loading your day…</div></Card>
      ) : (sessions ?? []).length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '34px 20px' }}>
          <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 19, textTransform: 'uppercase' }}>No sessions today</div>
          <div style={{ fontSize: 13.5, color: F.mute, marginTop: 6 }}>
            Book sessions in your classic app for now — they show up here automatically.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(sessions ?? []).map((s) => {
            const done = new Date(s.starts_at) < now || s.status === 'completed';
            const clientName = s.clients?.full_name ?? 'Session';
            return (
              <div key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'center', opacity: done && s.status !== 'scheduled' ? 0.55 : 1 }}>
                <span style={{ ...num, fontSize: 13, fontWeight: 600, color: F.mute, width: 52, flexShrink: 0 }}>{timeOf(s.starts_at)}</span>
                <div style={{ flex: 1, background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.md, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11, minHeight: HIT }}>
                  <Avatar name={clientName} size={36} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{clientName}</div>
                    {s.notes ? (
                      <div style={{ fontSize: 12, color: F.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.notes}</div>
                    ) : null}
                  </div>
                  {s.status === 'completed' && (
                    <span style={{ marginLeft: 'auto' }}>
                      <Icon d="M4.5 12.5 L10 18 L19.5 6.5" size={17} color={F.good} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Clients ───────────────────────────────────────────────────────────
function ClientsPage() {
  const { data: clients, isLoading } = useCoachClients();
  const add = useAddCoachClient();
  const [q, setQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = (clients ?? []).filter((c) => c.status !== 'archived');
    return t ? list.filter((c) => c.full_name.toLowerCase().includes(t)) : list;
  }, [clients, q]);

  async function submit() {
    if (!name.trim()) return;
    await add.mutateAsync({ full_name: name.trim(), phone: phone.trim() || null });
    setName(''); setPhone(''); setShowAdd(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <BigTitle>Clients</BigTitle>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: F.mute }}>{shown.length} shown</span>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clients"
          style={{
            flex: 1, height: HIT, background: F.card, border: `1px solid ${F.edge}`, borderRadius: 13,
            color: F.ink, padding: '0 14px', fontSize: 14.5, fontFamily: TYPE.body, outline: 'none',
          }}
        />
        <button
          onClick={() => setShowAdd((v) => !v)}
          style={{
            height: HIT, padding: '0 18px', borderRadius: 13, border: 'none', cursor: 'pointer',
            background: F.accent, color: F.accentInk, fontWeight: 800, fontSize: 14, fontFamily: TYPE.body,
          }}
        >
          + Add
        </button>
      </div>

      {showAdd && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionLabel>New client</SectionLabel>
          <input
            value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoFocus
            style={{ height: HIT, background: F.cardDeep, border: `1px solid ${F.edge}`, borderRadius: 12, color: F.ink, padding: '0 14px', fontSize: 14.5, fontFamily: TYPE.body, outline: 'none' }}
          />
          <input
            value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)"
            style={{ height: HIT, background: F.cardDeep, border: `1px solid ${F.edge}`, borderRadius: 12, color: F.ink, padding: '0 14px', fontSize: 14.5, fontFamily: TYPE.body, outline: 'none' }}
          />
          {add.isError && (
            <div style={{ fontSize: 13, color: F.bad }}>Couldn't save — check the connection and try again.</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, height: HIT, borderRadius: 12, border: `1.5px solid ${F.edge}`, background: 'transparent', color: F.inkSoft, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: TYPE.body }}>Cancel</button>
            <button onClick={() => void submit()} disabled={add.isPending || !name.trim()} style={{ flex: 1.4, height: HIT, borderRadius: 12, border: 'none', background: F.ink, color: F.bg, fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: add.isPending || !name.trim() ? 0.6 : 1, fontFamily: TYPE.body }}>
              {add.isPending ? 'Saving…' : 'Add client'}
            </button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card><div style={{ color: F.mute, fontSize: 14 }}>Loading clients…</div></Card>
      ) : shown.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '34px 20px' }}>
          <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 19, textTransform: 'uppercase' }}>
            {q ? 'No client matches that' : 'Add your first client'}
          </div>
          <div style={{ fontSize: 13.5, color: F.mute, marginTop: 6 }}>
            {q ? `Nothing found for “${q.trim()}”.` : 'Everything starts with one name on the roster.'}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {shown.map((c) => (
            <div key={c.id} style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.md, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, minHeight: HIT }}>
              <Avatar name={c.full_name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.full_name}</div>
                <div style={{ fontSize: 12, color: F.mute }}>
                  {c.status === 'paused' ? 'paused' : c.phone || c.email || `added ${shortDate(c.created_at)}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Honest stubs (the switchboard pattern: never fake it) ─────────────
function ComingPage({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BigTitle>{title}</BigTitle>
      <Card style={{ borderStyle: 'dashed', textAlign: 'center', padding: '38px 22px' }}>
        <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 18, textTransform: 'uppercase', color: F.accentSoftInk }}>Being built now</div>
        <div style={{ fontSize: 13.5, color: F.mute, marginTop: 8, lineHeight: 1.55 }}>{body}</div>
      </Card>
    </div>
  );
}

// ── Money ─────────────────────────────────────────────────────────────
function MoneyPage() {
  const { data: payments, isLoading } = useMonthPayments();
  const total = useMemo(
    () => Math.round(((payments ?? []).reduce((s, p) => s + Number(p.amount), 0)) * 100) / 100,
    [payments],
  );
  const month = new Date().toLocaleDateString('en-US', { month: 'long' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <SectionLabel>{month}</SectionLabel>
        <BigTitle>Money</BigTitle>
      </div>
      <Card>
        <div style={{ ...num, fontWeight: 800, fontSize: 28, color: F.good }}>{formatMoney(total)}</div>
        <div style={{ fontSize: 12, color: F.mute, fontWeight: 600 }}>collected this month</div>
      </Card>
      {isLoading ? (
        <Card><div style={{ color: F.mute, fontSize: 14 }}>Loading…</div></Card>
      ) : (payments ?? []).length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '30px 20px' }}>
          <div style={{ fontSize: 13.5, color: F.mute }}>No payments recorded this month yet.</div>
        </Card>
      ) : (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionLabel>Recent</SectionLabel>
          {(payments ?? []).slice(0, 12).map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>{p.clients?.full_name ?? '—'}</span>
              <span style={{ fontSize: 12, color: F.mute }}>{shortDate(p.paid_at)}</span>
              <span style={{ ...num, marginLeft: 'auto', fontWeight: 700, color: F.good }}>{formatMoney(Number(p.amount))}</span>
            </div>
          ))}
        </Card>
      )}
      <div style={{ fontSize: 12.5, color: F.mute, lineHeight: 1.5 }}>
        Session packs, auto-reminders, and renewals — the sketch's full Money screen — land here next.
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────
export function CoachApp() {
  return (
    <Shell>
      <Routes>
        <Route index element={<TodayPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route
          path="programs"
          element={
            <ComingPage
              title="Programs"
              body="The copy-a-week-and-bump-the-loads builder from the approved sketch. Until it lands, your Workouts page in the classic app keeps working."
            />
          }
        />
        <Route path="money" element={<MoneyPage />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </Shell>
  );
}
