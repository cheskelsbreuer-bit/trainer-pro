import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { formatMoney, formatSessionWhen, formatDate, initials } from '../lib/format';
import { ArrowLeft, Plus, X, Edit, DollarSign, Calendar } from 'lucide-react';
import type { Client, Session, Payment } from '../lib/database.types';

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [editing, setEditing] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!id,
  });

  const { data: sessions } = useQuery({
    queryKey: ['client-sessions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('client_id', id!)
        .order('starts_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ['client-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', id!)
        .order('paid_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8">Loading…</div>;
  if (!client) return <div className="p-8">Client not found.</div>;

  const totalPaid = payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const completedSessions = sessions?.filter((s) => s.status === 'completed').length ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/clients" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4">
        <ArrowLeft size={16} /> All clients
      </Link>

      <PageHeader
        title={client.full_name}
        subtitle={[client.email, client.phone].filter(Boolean).join(' · ') || 'No contact info'}
        actions={
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 border border-slate-300 px-3 py-2 rounded-lg text-sm hover:bg-slate-50"
          >
            <Edit size={14} /> Edit
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Stat label="Sessions completed" value={completedSessions} />
        <Stat label="Package balance" value={`${client.package_balance} sessions`} />
        <Stat label="Total paid" value={formatMoney(totalPaid)} />
      </div>

      {(client.goals || client.notes || client.medical_notes) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-3">
          {client.goals && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Goals</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.goals}</p>
            </div>
          )}
          {client.medical_notes && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Medical / injuries</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.medical_notes}</p>
            </div>
          )}
          {client.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar size={16} /> Sessions
            </h2>
            <button
              onClick={() => setShowSessionModal(true)}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> Schedule
            </button>
          </div>
          {!sessions?.length ? (
            <p className="text-sm text-slate-500 py-6 text-center">No sessions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.slice(0, 10).map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{formatSessionWhen(s.starts_at)}</p>
                    <p className="text-xs text-slate-500">
                      {s.location ?? '—'} · <StatusPill status={s.status} />
                    </p>
                  </div>
                  {s.price && <span className="text-sm text-slate-700">{formatMoney(s.price)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <DollarSign size={16} /> Payments
            </h2>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> Record
            </button>
          </div>
          {!payments?.length ? (
            <p className="text-sm text-slate-500 py-6 text-center">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.slice(0, 10).map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{formatMoney(p.amount)}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(p.paid_at)} · {p.method ?? p.payment_type}
                    </p>
                  </div>
                  {p.sessions_covered > 1 && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {p.sessions_covered} sessions
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing && <EditClientModal client={client} onClose={() => setEditing(false)} />}
      {showSessionModal && (
        <NewSessionModal client={client} onClose={() => setShowSessionModal(false)} />
      )}
      {showPaymentModal && (
        <NewPaymentModal client={client} onClose={() => setShowPaymentModal(false)} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: Session['status'] }) {
  const colors: Record<Session['status'], string> = {
    scheduled: 'text-blue-700 bg-blue-50',
    confirmed: 'text-violet-700 bg-violet-50',
    completed: 'text-emerald-700 bg-emerald-50',
    no_show: 'text-amber-700 bg-amber-50',
    cancelled: 'text-slate-700 bg-slate-100',
  };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] ${colors[status]}`}>{status}</span>;
}

// ---------- Modals ----------

function EditClientModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const [form, setForm] = useState({
    full_name: client.full_name,
    email: client.email ?? '',
    phone: client.phone ?? '',
    goals: client.goals ?? '',
    medical_notes: client.medical_notes ?? '',
    notes: client.notes ?? '',
    rate_per_session: client.rate_per_session?.toString() ?? '',
    package_balance: client.package_balance.toString(),
    status: client.status,
  });
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('clients')
        .update({
          full_name: form.full_name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          goals: form.goals.trim() || null,
          medical_notes: form.medical_notes.trim() || null,
          notes: form.notes.trim() || null,
          rate_per_session: form.rate_per_session ? Number(form.rate_per_session) : null,
          package_balance: Number(form.package_balance) || 0,
          status: form.status,
        })
        .eq('id', client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', client.id] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <ModalShell title="Edit client" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          update.mutate();
        }}
        className="space-y-3"
      >
        <Field label="Full name" required>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rate per session">
            <input
              type="number"
              step="0.01"
              value={form.rate_per_session}
              onChange={(e) => setForm({ ...form, rate_per_session: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Package balance">
            <input
              type="number"
              value={form.package_balance}
              onChange={(e) => setForm({ ...form, package_balance: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </div>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Client['status'] })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Goals">
          <textarea
            rows={2}
            value={form.goals}
            onChange={(e) => setForm({ ...form, goals: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="Medical notes">
          <textarea
            rows={2}
            value={form.medical_notes}
            onChange={(e) => setForm({ ...form, medical_notes: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="Notes">
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={update.isPending}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg"
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function NewSessionModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState(client.rate_per_session?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Not signed in');
      const startsAt = new Date(`${date}T${time}`);
      const endsAt = new Date(startsAt.getTime() + duration * 60_000);
      const { error } = await supabase.from('sessions').insert({
        trainer_id: u.user.id,
        client_id: client.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'scheduled',
        location: location.trim() || null,
        price: price ? Number(price) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-sessions', client.id] });
      qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <ModalShell title={`Schedule a session with ${client.full_name}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          create.mutate();
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" required>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Time" required>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (min)">
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Price">
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </div>
        <Field label="Location">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Studio, Park, Zoom…"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg"
          >
            {create.isPending ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function NewPaymentModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Payment['method']>('venmo');
  const [paymentType, setPaymentType] = useState<Payment['payment_type']>('session');
  const [sessionsCovered, setSessionsCovered] = useState('1');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Not signed in');
      const sc = paymentType === 'package' ? Number(sessionsCovered) || 1 : 1;
      // Insert the payment
      const { error: pErr } = await supabase.from('payments').insert({
        trainer_id: u.user.id,
        client_id: client.id,
        amount: Number(amount),
        method,
        payment_type: paymentType,
        sessions_covered: sc,
        description: description.trim() || null,
      });
      if (pErr) throw pErr;
      // If a package, bump the client's package_balance
      if (paymentType === 'package' && sc > 0) {
        const { error: cErr } = await supabase
          .from('clients')
          .update({ package_balance: client.package_balance + sc })
          .eq('id', client.id);
        if (cErr) throw cErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-payments', client.id] });
      qc.invalidateQueries({ queryKey: ['client', client.id] });
      qc.invalidateQueries({ queryKey: ['revenue-month'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <ModalShell title={`Record payment from ${client.full_name}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          create.mutate();
        }}
        className="space-y-3"
      >
        <Field label="Amount" required>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="80.00"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method">
            <select
              value={method ?? ''}
              onChange={(e) => setMethod(e.target.value as Payment['method'])}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="venmo">Venmo</option>
              <option value="zelle">Zelle</option>
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Type">
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as Payment['payment_type'])}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="session">Single session</option>
              <option value="package">Package (multi-session)</option>
              <option value="subscription">Subscription</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>
        {paymentType === 'package' && (
          <Field label="Sessions covered">
            <input
              type="number"
              value={sessionsCovered}
              onChange={(e) => setSessionsCovered(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        )}
        <Field label="Description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending || !amount}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg"
          >
            {create.isPending ? 'Recording…' : 'Record payment'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
