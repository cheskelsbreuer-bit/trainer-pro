import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { initials, formatMoney } from '../lib/format';
import { Plus, Search, X, AlertTriangle, Download } from 'lucide-react';
import type { Client } from '../lib/database.types';
import { downloadCsv, dateStamp } from '../lib/csv';

export function Clients() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });

  // Build the unique tag set across all clients (excluding the 'demo' tag noise)
  const tagSet = new Map<string, number>();
  for (const c of clients ?? []) {
    for (const t of c.tags ?? []) {
      tagSet.set(t, (tagSet.get(t) ?? 0) + 1);
    }
  }
  const allTags = Array.from(tagSet.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16); // cap to top 16 most-common

  const filtered = clients?.filter((c) => {
    const matchesSearch =
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesTag = !activeTag || c.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  const active = filtered?.filter((c) => c.status === 'active') ?? [];
  const paused = filtered?.filter((c) => c.status === 'paused') ?? [];
  const archived = filtered?.filter((c) => c.status === 'archived') ?? [];

  function exportCsv() {
    if (!clients?.length) return;
    const rows = clients.map((c) => ({
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      status: c.status,
      goals: c.goals,
      medical_notes: c.medical_notes,
      emergency_contact: c.emergency_contact,
      rate_per_session: c.rate_per_session,
      package_balance: c.package_balance,
      tags: (c.tags ?? []).join('; '),
      date_of_birth: c.date_of_birth,
      created_at: c.created_at,
    }));
    downloadCsv(dateStamp('clients'), rows);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Clients"
        subtitle={`${clients?.length ?? 0} total · ${active.length} active`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={!clients?.length}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              title="Download all clients as CSV"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus size={16} /> New client
            </button>
          </div>
        }
      />

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or tag…"
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-6">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${
              activeTag === null
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          {allTags.map(([tag, count]) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                activeTag === tag
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tag} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      <LowBalanceBanner clients={clients ?? []} />

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {!isLoading && !clients?.length && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500 mb-4">No clients yet.</p>
          <button
            onClick={() => setShowNew(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Add your first client
          </button>
        </div>
      )}

      {active.length > 0 && <ClientGroup title="Active" clients={active} />}
      {paused.length > 0 && <ClientGroup title="Paused" clients={paused} />}
      {archived.length > 0 && <ClientGroup title="Archived" clients={archived} />}

      {showNew && <NewClientModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function ClientGroup({ title, clients }: { title: string; clients: Client[] }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {clients.map((c) => (
          <Link
            key={c.id}
            to={`/clients/${c.id}`}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-medium">
                {initials(c.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{c.full_name}</p>
                {c.email && <p className="text-xs text-slate-500 truncate">{c.email}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {c.rate_per_session && (
                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {formatMoney(c.rate_per_session)}/session
                    </span>
                  )}
                  <BalanceBadge balance={c.package_balance} />
                  {c.tags.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function NewClientModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    goals: '',
    rate_per_session: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Not signed in');
      const { error } = await supabase.from('clients').insert({
        trainer_id: u.user.id,
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        goals: form.goals.trim() || null,
        notes: form.notes.trim() || null,
        rate_per_session: form.rate_per_session ? Number(form.rate_per_session) : null,
        status: 'active',
        tags: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">New client</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            create.mutate();
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
          <Field label="Rate per session (USD)">
            <input
              type="number"
              step="0.01"
              value={form.rate_per_session}
              onChange={(e) => setForm({ ...form, rate_per_session: e.target.value })}
              placeholder="80.00"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Goals">
            <textarea
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })}
              rows={2}
              placeholder="Lose 10 lbs, run a 5K"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
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
              disabled={create.isPending || !form.full_name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg"
            >
              {create.isPending ? 'Adding…' : 'Add client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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

function LowBalanceBanner({ clients }: { clients: Client[] }) {
  const low = clients.filter((c) => c.status === 'active' && c.package_balance > 0 && c.package_balance <= 2);
  if (low.length === 0) return null;
  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900">
          {low.length} client{low.length === 1 ? '' : 's'} running low on package sessions
        </p>
        <p className="text-xs text-amber-800 mt-0.5">
          {low
            .slice(0, 4)
            .map((c) => `${c.full_name} (${c.package_balance})`)
            .join(' · ')}
          {low.length > 4 && ` · +${low.length - 4} more`}
        </p>
      </div>
    </div>
  );
}

function BalanceBadge({ balance }: { balance: number }) {
  if (balance === 0) {
    return (
      <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
        No package
      </span>
    );
  }
  if (balance <= 2) {
    return (
      <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
        Low: {balance} left
      </span>
    );
  }
  return (
    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
      {balance} sessions left
    </span>
  );
}
