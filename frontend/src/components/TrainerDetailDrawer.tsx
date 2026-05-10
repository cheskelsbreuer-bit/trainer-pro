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

/**
 * Admin drawer that slides in from the right when a trainer row is clicked.
 * Shows everything we know about that trainer + lets the admin suspend
 * directory listing, suspend bookings, or edit their name/business/area.
 *
 * Patches go through PATCH /admin/trainers/{id}; the drawer reloads + the
 * outer trainers list is invalidated so it picks up changes.
 */
export function TrainerDetailDrawer({
  trainerId,
  onClose,
}: {
  trainerId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ['admin-trainer-detail', trainerId],
    queryFn: () => api<TrainerDetail>(`/admin/trainers/${trainerId}`),
    refetchOnWindowFocus: false,
  });

  // Local edit state — initialized from server data, allows tweak before save.
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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex-1 bg-slate-900/40 backdrop-blur-sm"
      />
      {/* Drawer */}
      <aside className="w-full max-w-xl bg-white shadow-2xl overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Trainer detail
            </p>
            <h3 className="font-bold text-slate-900">
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
        </header>

        <div className="p-5 space-y-5">
          {detail.isLoading && (
            <p className="text-sm text-slate-500">Loading…</p>
          )}
          {detail.error && (
            <p className="text-sm text-red-600">
              Couldn&rsquo;t load: {(detail.error as Error).message}
            </p>
          )}
          {detail.data && (
            <>
              {/* Stats */}
              <section className="grid grid-cols-2 gap-2.5">
                <DetailStat
                  icon={<Users size={14} />}
                  color="blue"
                  label="Clients"
                  value={detail.data.client_count.toString()}
                />
                <DetailStat
                  icon={<Calendar size={14} />}
                  color="emerald"
                  label="Sessions"
                  value={detail.data.session_count.toString()}
                />
                <DetailStat
                  icon={<DollarSign size={14} />}
                  color="amber"
                  label="Revenue"
                  value={`$${detail.data.payment_total.toFixed(0)}`}
                />
                <DetailStat
                  icon={<CheckCircle2 size={14} />}
                  color="indigo"
                  label="Onboarded"
                  value={detail.data.onboarded_at ? '✓ Yes' : 'No'}
                />
              </section>

              {/* Quick actions */}
              <section className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2.5">
                  Visibility & status
                </p>
                <div className="space-y-2.5">
                  <ToggleRow
                    label="Listed in public directory"
                    sub="Appears at trainerpro.coach/find-trainers"
                    on={detail.data.directory_listed}
                    onIcon={<Eye size={14} className="text-emerald-600" />}
                    offIcon={<EyeOff size={14} className="text-slate-400" />}
                    onChange={(v) => patch.mutate({ directory_listed: v })}
                    disabled={patch.isPending}
                  />
                  <ToggleRow
                    label="Booking page enabled"
                    sub="Public link clients use to self-book"
                    on={detail.data.booking_enabled}
                    onChange={(v) => patch.mutate({ booking_enabled: v })}
                    disabled={patch.isPending}
                  />
                </div>
              </section>

              {/* Editable fields */}
              <section className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">
                  Override fields
                </p>
                <div className="space-y-3">
                  <Field
                    label="Full name"
                    value={fullName}
                    onChange={setFullName}
                  />
                  <Field
                    label="Business name"
                    value={businessName}
                    onChange={setBusinessName}
                  />
                  <Field
                    label="Service area"
                    value={serviceArea}
                    onChange={setServiceArea}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patch.mutate({
                        full_name: fullName || null,
                        business_name: businessName || null,
                        service_area: serviceArea || null,
                      })
                    }
                    disabled={patch.isPending}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
                  >
                    <Save size={13} />
                    {patch.isPending ? 'Saving…' : 'Save changes'}
                  </button>
                  {patch.error && (
                    <p className="text-xs text-rose-600">
                      {(patch.error as Error).message}
                    </p>
                  )}
                </div>
              </section>

              {/* Static info */}
              <section className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 text-sm">
                <Row label="Email" value={detail.data.email} icon={<Mail size={12} />} />
                <Row label="Phone" value={detail.data.phone} icon={<Phone size={12} />} />
                <Row label="Timezone" value={detail.data.timezone} />
                <Row label="Currency" value={detail.data.currency} />
                <Row
                  label="Primary color"
                  value={detail.data.primary_color}
                  swatch={detail.data.primary_color ?? undefined}
                />
                <Row
                  label="Specialties"
                  value={
                    detail.data.specialties.length
                      ? detail.data.specialties.map((s) => s.replace(/_/g, ' ')).join(', ')
                      : '—'
                  }
                />
                <Row label="Self-reported clients" value={detail.data.client_count_estimate} />
                <Row
                  label="Joined"
                  value={
                    detail.data.created_at
                      ? new Date(detail.data.created_at).toLocaleString()
                      : null
                  }
                />
                <Row
                  label="Last session"
                  value={
                    detail.data.last_session_at
                      ? new Date(detail.data.last_session_at).toLocaleString()
                      : 'No sessions yet'
                  }
                />
              </section>

              {/* External links */}
              {detail.data.slug && (
                <section className="flex flex-wrap gap-2">
                  <a
                    href={`/p/${detail.data.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                  >
                    Public profile <ExternalLink size={11} />
                  </a>
                  <a
                    href={`/book/${detail.data.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                  >
                    Booking page <ExternalLink size={11} />
                  </a>
                  {detail.data.email && (
                    <a
                      href={`mailto:${detail.data.email}`}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Email this trainer <Mail size={11} />
                    </a>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
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
