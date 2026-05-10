import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Save,
  Activity,
} from 'lucide-react';
import { api } from '../lib/api';

interface TrainerDetail {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  timezone: string | null;
  currency: string | null;
  primary_color: string | null;
  slug: string | null;
  booking_enabled: boolean;
  onboarded_at: string | null;
  client_count_estimate: string | null;
  specialties: string[];
  service_area: string | null;
  directory_listed: boolean;
  created_at: string | null;
  client_count: number;
  session_count: number;
  payment_total: number;
  last_session_at: string | null;
}

type TabKey = 'overview' | 'clients' | 'sessions' | 'payments';

export function TrainerDetailDrawer({
  trainerId,
  onClose,
}: {
  trainerId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>('overview');

  const detail = useQuery({
    queryKey: ['admin-trainer-detail', trainerId],
    queryFn: () => api<TrainerDetail>(`/admin/trainers/${trainerId}`),
    refetchOnWindowFocus: false,
  });

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [serviceArea, setServiceArea] = useState('');

  useEffect(() => {
    if (detail.data) {
      setFullName(detail.data.full_name ?? '');
      setBusinessName(detail.data.business_name ?? '');
      setServiceArea(detail.data.service_area ?? '');
    }
  }, [detail.data]);

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<TrainerDetail>(`/admin/trainers/${trainerId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-trainer-detail', trainerId] });
      qc.invalidateQueries({ queryKey: ['admin-trainers'] });
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex-1 bg-slate-900/40 backdrop-blur-sm"
      />
      <aside className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        {/* Sticky header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                Trainer
              </p>
              <h3 className="font-bold text-slate-900 truncate">
                {detail.data?.business_name ||
                  detail.data?.full_name ||
                  detail.data?.email ||
                  'Loading…'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
              aria-label="Close drawer"
            >
              <X size={20} />
            </button>
          </div>
          {/* Tab strip */}
          <nav className="flex border-t border-slate-100 bg-slate-50">
            {(
              [
                { k: 'overview', label: 'Overview' },
                { k: 'clients', label: 'Clients' },
                { k: 'sessions', label: 'Sessions' },
                { k: 'payments', label: 'Payments' },
              ] as { k: TabKey; label: string }[]
            ).map(({ k, label }) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                  tab === k
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="p-5 space-y-5">
          {detail.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {detail.error && (
            <p className="text-sm text-red-600">
              Couldn&rsquo;t load: {(detail.error as Error).message}
            </p>
          )}
          {detail.data && (
            <>
              {tab === 'overview' && (
                <OverviewTab
                  data={detail.data}
                  fullName={fullName}
                  setFullName={setFullName}
                  businessName={businessName}
                  setBusinessName={setBusinessName}
                  serviceArea={serviceArea}
                  setServiceArea={setServiceArea}
                  onPatch={(body) => patch.mutate(body)}
                  patchPending={patch.isPending}
                  patchError={patch.error as Error | null}
                />
              )}
              {tab === 'clients' && <ClientsTab trainerId={trainerId} />}
              {tab === 'sessions' && <SessionsTab trainerId={trainerId} />}
              {tab === 'payments' && (
                <PaymentsTab trainerId={trainerId} currency={detail.data.currency} />
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ─────────────── Overview tab ─────────────── */
function OverviewTab({
  data,
  fullName,
  setFullName,
  businessName,
  setBusinessName,
  serviceArea,
  setServiceArea,
  onPatch,
  patchPending,
  patchError,
}: {
  data: TrainerDetail;
  fullName: string;
  setFullName: (v: string) => void;
  businessName: string;
  setBusinessName: (v: string) => void;
  serviceArea: string;
  setServiceArea: (v: string) => void;
  onPatch: (body: Record<string, unknown>) => void;
  patchPending: boolean;
  patchError: Error | null;
}) {
  return (
    <>
      <section className="grid grid-cols-2 gap-2.5">
        <DetailStat icon={<Users size={14} />} color="blue" label="Clients" value={data.client_count.toString()} />
        <DetailStat icon={<Calendar size={14} />} color="emerald" label="Sessions" value={data.session_count.toString()} />
        <DetailStat icon={<DollarSign size={14} />} color="amber" label="Revenue" value={`$${data.payment_total.toFixed(0)}`} />
        <DetailStat icon={<CheckCircle2 size={14} />} color="indigo" label="Onboarded" value={data.onboarded_at ? '✓ Yes' : 'No'} />
      </section>

      <section className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2.5">
          Visibility & status
        </p>
        <div className="space-y-2.5">
          <ToggleRow
            label="Listed in public directory"
            sub="Appears at trainerpro.coach/find-trainers"
            on={data.directory_listed}
            onIcon={<Eye size={14} className="text-emerald-600" />}
            offIcon={<EyeOff size={14} className="text-slate-400" />}
            onChange={(v) => onPatch({ directory_listed: v })}
            disabled={patchPending}
          />
          <ToggleRow
            label="Booking page enabled"
            sub="Public link clients use to self-book"
            on={data.booking_enabled}
            onChange={(v) => onPatch({ booking_enabled: v })}
            disabled={patchPending}
          />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">
          Override fields
        </p>
        <div className="space-y-3">
          <Field label="Full name" value={fullName} onChange={setFullName} />
          <Field label="Business name" value={businessName} onChange={setBusinessName} />
          <Field label="Service area" value={serviceArea} onChange={setServiceArea} />
          <button
            type="button"
            onClick={() =>
              onPatch({
                full_name: fullName || null,
                business_name: businessName || null,
                service_area: serviceArea || null,
              })
            }
            disabled={patchPending}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
          >
            <Save size={13} />
            {patchPending ? 'Saving…' : 'Save changes'}
          </button>
          {patchError && <p className="text-xs text-rose-600">{patchError.message}</p>}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 text-sm">
        <Row label="Email" value={data.email} icon={<Mail size={12} />} />
        <Row label="Phone" value={data.phone} icon={<Phone size={12} />} />
        <Row label="Timezone" value={data.timezone} />
        <Row label="Currency" value={data.currency} />
        <Row label="Primary color" value={data.primary_color} swatch={data.primary_color ?? undefined} />
        <Row
          label="Specialties"
          value={
            data.specialties.length
              ? data.specialties.map((s) => s.replace(/_/g, ' ')).join(', ')
              : '—'
          }
        />
        <Row label="Self-reported clients" value={data.client_count_estimate} />
        <Row
          label="Joined"
          value={data.created_at ? new Date(data.created_at).toLocaleString() : null}
        />
        <Row
          label="Last session"
          value={
            data.last_session_at ? new Date(data.last_session_at).toLocaleString() : 'No sessions yet'
          }
          icon={<Activity size={12} />}
        />
      </section>

      {(data.slug || data.email) && (
        <section className="flex flex-wrap gap-2">
          {data.slug && (
            <>
              <a
                href={`/p/${data.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Public profile <ExternalLink size={11} />
              </a>
              <a
                href={`/book/${data.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Booking page <ExternalLink size={11} />
              </a>
            </>
          )}
          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Email this trainer <Mail size={11} />
            </a>
          )}
        </section>
      )}
    </>
  );
}

/* ─────────────── Clients tab ─────────────── */
function ClientsTab({ trainerId }: { trainerId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-trainer-clients', trainerId],
    queryFn: () =>
      api<{ rows: ClientRow[]; total: number }>(`/admin/trainers/${trainerId}/clients`),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading clients…</p>;
  if (error) return <p className="text-sm text-rose-600">{(error as Error).message}</p>;
  if (!data?.rows.length)
    return <EmptyTab text="This trainer hasn't added any clients yet." />;

  return (
    <ListSection title={`${data.total} client${data.total === 1 ? '' : 's'}`}>
      {data.rows.map((c) => (
        <li key={c.id} className="px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{c.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{c.email ?? c.phone ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {c.package_balance > 0 && (
              <span className="text-[10px] text-emerald-700 font-medium px-1.5 py-0.5 rounded bg-emerald-50">
                {c.package_balance} left
              </span>
            )}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                c.status === 'active'
                  ? 'bg-blue-50 text-blue-700'
                  : c.status === 'paused'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {c.status}
            </span>
          </div>
        </li>
      ))}
    </ListSection>
  );
}

/* ─────────────── Sessions tab ─────────────── */
function SessionsTab({ trainerId }: { trainerId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-trainer-sessions', trainerId],
    queryFn: () =>
      api<{ rows: SessionRow[]; total: number }>(`/admin/trainers/${trainerId}/sessions`),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading sessions…</p>;
  if (error) return <p className="text-sm text-rose-600">{(error as Error).message}</p>;
  if (!data?.rows.length)
    return <EmptyTab text="No sessions logged yet." />;

  return (
    <ListSection title={`${data.total} most recent session${data.total === 1 ? '' : 's'}`}>
      {data.rows.map((s) => (
        <li key={s.id} className="px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">
              {new Date(s.starts_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="text-xs text-slate-500">{s.session_type ?? 'Session'}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {s.price != null && (
              <span className="text-[11px] text-slate-700 font-medium">${Number(s.price).toFixed(0)}</span>
            )}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[s.status] ?? 'bg-slate-100 text-slate-500'}`}
            >
              {s.status.replace('_', ' ')}
            </span>
          </div>
        </li>
      ))}
    </ListSection>
  );
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
  no_show: 'bg-amber-50 text-amber-700',
};

/* ─────────────── Payments tab ─────────────── */
function PaymentsTab({ trainerId, currency }: { trainerId: string; currency: string | null }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-trainer-payments', trainerId],
    queryFn: () =>
      api<{ rows: PaymentRow[]; total: number }>(`/admin/trainers/${trainerId}/payments`),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading payments…</p>;
  if (error) return <p className="text-sm text-rose-600">{(error as Error).message}</p>;
  if (!data?.rows.length)
    return <EmptyTab text="No payments logged yet." />;

  const cur = currency || 'USD';
  const total = data.rows.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <ListSection
      title={`${data.total} payment${data.total === 1 ? '' : 's'} · ${cur} ${total.toFixed(2)} total shown`}
    >
      {data.rows.map((p) => (
        <li key={p.id} className="px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">
              {p.description || p.payment_type}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(p.paid_at).toLocaleDateString()} · {p.method ?? '—'}
            </p>
          </div>
          <span className="text-sm font-semibold text-slate-900">
            ${Number(p.amount).toFixed(2)}
          </span>
        </li>
      ))}
    </ListSection>
  );
}

/* ─────────────── Shared bits ─────────────── */
function EmptyTab({ text }: { text: string }) {
  return (
    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

function ListSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
          {title}
        </p>
      </div>
      <ul className="divide-y divide-slate-100">{children}</ul>
    </section>
  );
}

interface ClientRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  package_balance: number;
  created_at: string;
}

interface SessionRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  session_type: string | null;
  price: number | null;
  paid: boolean;
  client_id: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  payment_type: string;
  method: string | null;
  description: string | null;
  paid_at: string;
}

function DetailStat({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'indigo';
  label: string;
  value: string;
}) {
  const map = {
    blue: 'from-blue-50 to-sky-50 border-blue-100 text-blue-700',
    emerald: 'from-emerald-50 to-teal-50 border-emerald-100 text-emerald-700',
    amber: 'from-amber-50 to-orange-50 border-amber-100 text-amber-700',
    indigo: 'from-indigo-50 to-violet-50 border-indigo-100 text-indigo-700',
  };
  return (
    <div className={`bg-gradient-to-br border rounded-lg p-3 ${map[color]}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-80 mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  on,
  onIcon,
  offIcon,
  onChange,
  disabled,
}: {
  label: string;
  sub: string;
  on: boolean;
  onIcon?: React.ReactNode;
  offIcon?: React.ReactNode;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {(on ? onIcon : offIcon) ?? null}
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-[11px] text-slate-500">{sub}</p>
        </div>
      </div>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4"
      />
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Row({
  label,
  value,
  icon,
  swatch,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  swatch?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-xs text-slate-500 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-sm text-slate-900 text-right truncate flex items-center gap-2">
        {swatch && (
          <span
            className="inline-block w-3 h-3 rounded border border-slate-200"
            style={{ background: swatch }}
          />
        )}
        {value || '—'}
      </span>
    </div>
  );
}
