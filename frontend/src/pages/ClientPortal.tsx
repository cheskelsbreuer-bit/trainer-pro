import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  Calendar as CalIcon,
  CreditCard,
  LogOut,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatMoney, formatDate, formatSessionWhen } from '../lib/format';
import type { Client, Session, Payment } from '../lib/database.types';

interface PortalState {
  client: Client | null;
  trainer: { full_name: string; business_name: string | null; primary_color: string; logo_url: string | null } | null;
}

export function ClientPortal() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();

  // Find the client linked to the current auth user
  const { data: state, isLoading } = useQuery({
    queryKey: ['portal-self', user?.id],
    queryFn: async (): Promise<PortalState> => {
      const { data: clientRow, error } = await supabase
        .from('clients')
        .select('*, trainers(full_name, business_name, primary_color, logo_url)')
        .eq('auth_user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!clientRow) return { client: null, trainer: null };
      const { trainers, ...client } = clientRow as Client & {
        trainers: { full_name: string; business_name: string | null; primary_color: string; logo_url: string | null };
      };
      return { client: client as Client, trainer: trainers ?? null };
    },
    enabled: !!user,
  });

  const { data: sessions } = useQuery({
    queryKey: ['portal-sessions', state?.client?.id],
    queryFn: async () => {
      if (!state?.client) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('client_id', state.client.id)
        .order('starts_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
    enabled: !!state?.client,
  });

  const { data: payments } = useQuery({
    queryKey: ['portal-payments', state?.client?.id],
    queryFn: async () => {
      if (!state?.client) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', state.client.id)
        .order('paid_at', { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
    enabled: !!state?.client,
  });

  const requestReschedule = useMutation({
    mutationFn: async ({ session, newStart, reason }: { session: Session; newStart: Date; reason: string }) => {
      const { error } = await supabase.rpc('portal_request_reschedule', {
        p_session_id: session.id,
        p_new_starts_at: newStart.toISOString(),
        p_reason: reason || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-sessions'] }),
  });

  if (isLoading) {
    return <Centered>Loading…</Centered>;
  }

  if (!state || !state.client || !state.trainer) {
    return (
      <Centered>
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
          <AlertCircle size={20} />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">No portal access</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">
          This account isn't linked to a client profile. Ask your trainer for a portal invite.
        </p>
        <button
          onClick={signOut}
          className="mt-4 text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5"
        >
          <LogOut size={14} /> Sign out
        </button>
      </Centered>
    );
  }

  const { client, trainer } = state;
  const color = trainer.primary_color || '#2d6a9f';
  const heading = trainer.business_name || trainer.full_name;
  const upcoming = (sessions ?? []).filter(
    (s) => new Date(s.starts_at) >= new Date() && (s.status === 'scheduled' || s.status === 'confirmed'),
  );
  const past = (sessions ?? []).filter((s) => new Date(s.starts_at) < new Date());

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className="text-white py-8 px-6"
        style={{ background: `linear-gradient(135deg, ${color}, ${darken(color, 12)})` }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          {trainer.logo_url ? (
            <img src={trainer.logo_url} alt="" className="w-12 h-12 rounded-full object-cover bg-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-xl font-semibold">
              {heading
                .split(' ')
                .map((p) => p[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')}
            </div>
          )}
          <div className="flex-1">
            <p className="text-white/80 text-xs uppercase tracking-wide">Your training portal</p>
            <h1 className="text-xl md:text-2xl font-bold">Hi, {client.full_name.split(' ')[0]}</h1>
            <p className="text-white/85 text-sm">with {heading}</p>
          </div>
          <button
            onClick={signOut}
            className="text-white/80 hover:text-white text-sm flex items-center gap-1.5"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat
            icon={<CalIcon size={16} />}
            label="Upcoming sessions"
            value={upcoming.length}
            color={color}
          />
          <Stat
            icon={<CheckCircle2 size={16} />}
            label="Sessions remaining"
            value={client.package_balance > 0 ? client.package_balance : 'No package'}
            color={color}
            warn={client.package_balance > 0 && client.package_balance <= 2}
          />
          <Stat
            icon={<CreditCard size={16} />}
            label="Total paid"
            value={formatMoney((payments ?? []).reduce((s, p) => s + Number(p.amount), 0))}
            color={color}
          />
        </div>

        {/* Upcoming */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((s) => (
                <UpcomingRow
                  key={s.id}
                  session={s}
                  color={color}
                  onReschedule={(newStart, reason) =>
                    requestReschedule.mutate({ session: s, newStart, reason })
                  }
                />
              ))}
            </ul>
          )}
        </section>

        {/* Recent history */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3">Recent sessions</h2>
          {past.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {past.slice(0, 8).map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{formatSessionWhen(s.starts_at)}</p>
                    <p className="text-xs text-slate-500">
                      {s.location ?? 'Studio'} · <StatusPill status={s.status} />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Payment history */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3">Payment history</h2>
          {(payments ?? []).length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No payments recorded.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(payments ?? []).slice(0, 10).map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{formatMoney(p.amount)}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(p.paid_at)} · {p.method ?? p.payment_type}
                      {p.sessions_covered > 1 && ` · ${p.sessions_covered}-session package`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="text-center text-xs text-slate-400 py-8">Powered by Trainer Pro</footer>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white"
        style={{ backgroundColor: warn ? '#d97706' : color }}
      >
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Session['status'] }) {
  const map: Record<Session['status'], { label: string; cls: string }> = {
    scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-800' },
    confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-800' },
    completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-700' },
    no_show: { label: 'No-show', cls: 'bg-amber-100 text-amber-900' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
  };
  const m = map[status];
  return <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}

function UpcomingRow({
  session,
  color,
  onReschedule,
}: {
  session: Session;
  color: string;
  onReschedule: (newStart: Date, reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newStart, setNewStart] = useState('');
  const [reason, setReason] = useState('');
  const start = new Date(session.starts_at);
  const end = new Date(session.ends_at);

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg text-white flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Clock size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
              · {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              {' – '}
              {end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </p>
            {session.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin size={11} />
                {session.location}
              </p>
            )}
            <StatusPill status={session.status} />
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          {open ? 'Cancel' : 'Request reschedule'}
        </button>
      </div>
      {open && (
        <div className="mt-3 ml-13 pl-13 bg-slate-50 rounded-lg p-3 space-y-2">
          <input
            type="datetime-local"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              if (!newStart) return;
              onReschedule(new Date(newStart), reason);
              setOpen(false);
            }}
            disabled={!newStart}
            className="text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            Send request
          </button>
        </div>
      )}
    </li>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm max-w-sm">{children}</div>
    </div>
  );
}

function darken(hex: string, percent: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - Math.round(255 * (percent / 100)));
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - Math.round(255 * (percent / 100)));
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - Math.round(255 * (percent / 100)));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
