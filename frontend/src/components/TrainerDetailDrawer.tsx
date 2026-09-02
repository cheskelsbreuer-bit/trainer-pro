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
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { adminRpc, type AdminTrainerDetail, type AdminTrainerActivity } from '../lib/adminRpc';
import { appKeyForSlug, type AppKey } from '../lib/workspaces';
import { setViewAsTarget } from '../babysitting/lib/viewAs';
import { TEMPLATES_BY_SLUG } from '../lib/templates';

type TrainerDetail = AdminTrainerDetail;

type TabKey = 'overview' | 'activity' | 'clients' | 'sessions' | 'payments';

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
    queryFn: () => adminRpc.trainerDetail(trainerId) as Promise<TrainerDetail>,
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
      adminRpc.trainerPatch(trainerId, body) as Promise<TrainerDetail>,
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
                { k: 'activity', label: 'Activity' },
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
              {tab === 'activity' && <ActivityTab trainerId={trainerId} />}
              {tab === 'clients' && <ClientsTab trainerId={trainerId} />}
              {tab === 'sessions' && <SessionsTab trainerId={trainerId} />}
              {tab === 'payments' && (
                <PaymentsTab trainerId={trainerId} currency={detail.data.currency} />
              )}
              {tab === 'overview' && (
                <DangerZone
                  trainerId={trainerId}
                  trainerEmail={detail.data.email}
                  trainerName={
                    detail.data.business_name ?? detail.data.full_name ?? null
                  }
                  onDeleted={() => {
                    qc.invalidateQueries({ queryKey: ['admin-trainers'] });
                    qc.invalidateQueries({ queryKey: ['admin-overview'] });
                    onClose();
                  }}
                />
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ─────────────── Danger zone — permanent delete ─────────────── */
function DangerZone({
  trainerId,
  trainerEmail,
  trainerName,
  onDeleted,
}: {
  trainerId: string;
  trainerEmail: string | null;
  trainerName: string | null;
  onDeleted: () => void;
}) {
  const [confirmEmail, setConfirmEmail] = useState('');
  const [armed, setArmed] = useState(false);

  const del = useMutation({
    mutationFn: () => adminRpc.trainerDelete(trainerId),
    onSuccess: () => onDeleted(),
  });

  const canConfirm =
    armed && trainerEmail && confirmEmail.trim().toLowerCase() === trainerEmail.toLowerCase();

  return (
    <section className="border border-rose-200 rounded-xl bg-rose-50 overflow-hidden mt-6">
      <header className="px-4 py-3 bg-rose-100 border-b border-rose-200 flex items-center gap-2">
        <AlertTriangle size={16} className="text-rose-700" />
        <h4 className="text-sm font-bold text-rose-900 uppercase tracking-wide">
          Danger zone
        </h4>
      </header>
      <div className="p-4 space-y-3">
        <p className="text-sm text-rose-900">
          Permanently delete <strong>{trainerName ?? trainerEmail ?? 'this trainer'}</strong>{' '}
          and every row of their data — clients, sessions, payments, progress entries,
          workouts, messages, and their login. This cannot be undone.
        </p>
        {!armed ? (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            <Trash2 size={13} /> I want to delete this trainer
          </button>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-rose-900">
              Type the trainer's email to confirm: <code>{trainerEmail ?? '—'}</code>
            </label>
            <input
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={trainerEmail ?? ''}
              className="w-full px-3 py-2 text-sm rounded border border-rose-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setArmed(false);
                  setConfirmEmail('');
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => del.mutate()}
                disabled={!canConfirm || del.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={13} />
                {del.isPending ? 'Deleting…' : 'Permanently delete trainer'}
              </button>
              {del.error && (
                <span className="text-xs text-rose-700">
                  {(del.error as Error).message}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
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

      <OnboardingProgressCard data={data} />

      <LastActivityCard data={data} />

      <WhichAppCard data={data} onPatch={onPatch} patchPending={patchPending} />

      <LookInsideCard data={data} />

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

      {/* The link this account gives parents. Always available: the slug
          when they set one, otherwise the account id, so there is never a
          "they haven't got a link yet" case to explain. */}
      <JoinLinkCard slug={data.slug} id={data.id} />

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

/* ─────────────── Onboarding progress card ─────────────── */
// ── Which app is this account actually in? ──────────────────────────────
// The template someone picks at signup decides which app they land in. If
// they picked the wrong one — signed up "as a regular guy" and got the
// coach app instead of babysitting — there was no way to see it, let alone
// fix it. This card shows the answer in one line and moves them in one
// click.

const APP_LABELS: Record<AppKey, string> = {
  babysitting: '🧸 Babysitting app',
  coach: '🏋️ 1-on-1 Coach app',
  default: '📋 Classic app',
  martial: 'Martial arts',
  boxing: 'Boxing',
  nutrition: 'Nutrition',
  exercise: 'Exercise',
  studio_classes: 'Studio classes',
};

function WhichAppCard({
  data,
  onPatch,
  patchPending,
}: {
  data: TrainerDetail;
  onPatch: (body: Record<string, unknown>) => void;
  patchPending: boolean;
}) {
  const slugs = data.template_slugs ?? [];
  // Same rule App.tsx uses to decide what to mount: the Coach app wins
  // when the account owns it, and an account with no templates gets it.
  const keys = slugs.map(appKeyForSlug);
  const landsIn: AppKey = keys.includes('coach') ? 'coach' : (keys[0] ?? 'coach');
  const isBabysitting = landsIn === 'babysitting';
  const templateNames = slugs
    .map((s) => TEMPLATES_BY_SLUG[s]?.name ?? s)
    .join(', ');

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2.5">
        Which app they open
      </p>
      <p className="text-sm font-semibold text-slate-800">{APP_LABELS[landsIn] ?? landsIn}</p>
      <p className="text-xs text-slate-500 mt-1">
        {slugs.length ? `Signed up as: ${templateNames}` : 'They never picked a template.'}
      </p>
      {!isBabysitting && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-2.5">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            This account is not in the babysitting app. If that's where they belong,
            switch them — they'll see the babysitting app next time they load the page.
          </p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={patchPending || isBabysitting}
          onClick={() => onPatch({ template_slugs: ['babysitting'] })}
          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isBabysitting ? '✓ In the babysitting app' : 'Move to the babysitting app'}
        </button>
        {isBabysitting && (
          <button
            type="button"
            disabled={patchPending}
            onClick={() => onPatch({ template_slugs: ['solo_trainer'] })}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-40"
          >
            Move back to the coach app
          </button>
        )}
      </div>
    </section>
  );
}

/* ─────────────── Look inside their app (read-only) ─────────────── */
//
// The stats above say how many clients and how much money. They do not
// say whether the rates were ever filled in, whether any parent has a
// phone number, or whether the register has been touched since the day
// it was set up. This opens the account's own app, exactly as its owner
// sees it, so those questions answer themselves.
function LookInsideCard({ data }: { data: TrainerDetail }) {
  const keys = (data.template_slugs ?? []).map(appKeyForSlug);
  const isBabysitting = (keys.includes('coach') ? 'coach' : (keys[0] ?? 'coach')) === 'babysitting';
  const who = data.business_name || data.full_name || data.email || 'this account';

  function open() {
    setViewAsTarget(data.id);
    // A hard reload, like the demo entry point: App() re-reads the flag at
    // the top of the tree, so a soft navigation would not pick it up.
    window.location.assign('/');
  }

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2.5">
        Look inside their app
      </p>
      <p className="text-xs text-slate-500">
        Opens {who}'s babysitting app as they see it — their children, their
        balances, their settings, their chats. <strong>Read only:</strong> every
        button that would change something is switched off, nothing is written
        to their account, and they are not told you looked.
      </p>
      {!isBabysitting && (
        <p className="mt-2 text-xs text-amber-700">
          This account isn't in the babysitting app, so most screens will be empty.
        </p>
      )}
      <button
        type="button"
        onClick={open}
        className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 hover:bg-slate-50"
      >
        👀 Open their app
      </button>
      <p className="mt-2 text-[11px] text-slate-400">
        Needs supabase/43_admin_view_as.sql to have been run. Press Leave (or
        Shift+Esc) to come back here.
      </p>
    </section>
  );
}

function OnboardingProgressCard({ data }: { data: TrainerDetail }) {
  const total = data.onboarding_total_steps || 8;
  const done = data.onboarding_step_count || 0;
  const pct = Math.round((done / total) * 100);
  const isDone = !!data.onboarded_at;
  const firstUnfinished = (data.onboarding_steps || []).findIndex((s) => !s.done);
  const stuckAt =
    !isDone && firstUnfinished >= 0
      ? `Stuck at step ${firstUnfinished + 1}: ${data.onboarding_steps[firstUnfinished].label}`
      : null;
  return (
    <section
      className={`border rounded-lg p-4 ${
        isDone
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-600">
          Onboarding
        </p>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isDone ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
          }`}
        >
          {done}/{total}
        </span>
      </div>
      {stuckAt && (
        <p className="text-xs text-amber-800 font-medium mb-2">⏳ {stuckAt}</p>
      )}
      {isDone && data.onboarded_at && (
        <p className="text-xs text-emerald-800 font-medium mb-2">
          ✓ Completed {new Date(data.onboarded_at).toLocaleDateString()}
        </p>
      )}
      <div className="h-1.5 bg-white rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all rounded-full ${
            isDone ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1">
        {(data.onboarding_steps || []).map((s, idx) => (
          <li
            key={idx}
            className="flex items-center gap-2 text-xs"
          >
            {s.done ? (
              <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <span className="w-3 h-3 rounded-full border border-slate-300 flex-shrink-0" />
            )}
            <span className={s.done ? 'text-slate-700 line-through opacity-70' : 'text-slate-900'}>
              {idx + 1}. {s.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LastActivityCard({ data }: { data: TrainerDetail }) {
  if (!data.last_activity_at) {
    return (
      <section className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500">
        No activity yet.
      </section>
    );
  }
  const when = new Date(data.last_activity_at);
  const daysAgo = Math.floor((Date.now() - when.getTime()) / (1000 * 60 * 60 * 24));
  return (
    <section className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-0.5">
        Last seen
      </p>
      <p className="text-sm text-slate-900">
        {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}
        <span className="text-slate-500 font-normal"> · {data.last_activity_kind ?? '—'}</span>
      </p>
      <p className="text-[11px] text-slate-400 mt-0.5">
        {when.toLocaleString()}
      </p>
    </section>
  );
}

/* ─────────────── Activity tab ─────────────── */
function ActivityTab({ trainerId }: { trainerId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-trainer-activity', trainerId],
    queryFn: () => adminRpc.trainerActivity(trainerId),
  });
  if (isLoading) return <p className="text-sm text-slate-500">Loading activity…</p>;
  if (error) return <p className="text-sm text-rose-600">{(error as Error).message}</p>;
  const rows = (data ?? []) as AdminTrainerActivity[];
  if (rows.length === 0) return <EmptyTab text="No activity yet." />;
  const kindColor: Record<string, string> = {
    profile: 'bg-slate-100 text-slate-700',
    session: 'bg-blue-50 text-blue-700',
    payment: 'bg-amber-50 text-amber-700',
    client: 'bg-emerald-50 text-emerald-700',
    feedback: 'bg-violet-50 text-violet-700',
  };
  return (
    <ListSection title={`${rows.length} most recent`}>
      {rows.map((a, i) => (
        <li
          key={i}
          className="px-3 py-2.5 hover:bg-slate-50 flex items-start justify-between gap-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">{a.label}</p>
            {a.detail && (
              <p className="text-xs text-slate-500 truncate">{a.detail}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                kindColor[a.kind] ?? 'bg-slate-100 text-slate-500'
              }`}
            >
              {a.kind}
            </span>
            <span className="text-[10px] text-slate-400">
              {new Date(a.ts).toLocaleDateString()}
            </span>
          </div>
        </li>
      ))}
    </ListSection>
  );
}

/* ─────────────── Clients tab ─────────────── */
function ClientsTab({ trainerId }: { trainerId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-trainer-clients', trainerId],
    queryFn: async () => {
      const rows = (await adminRpc.trainerClients(trainerId)) as ClientRow[];
      return { rows, total: rows.length };
    },
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
    queryFn: async () => {
      const rows = (await adminRpc.trainerSessions(trainerId)) as SessionRow[];
      return { rows, total: rows.length };
    },
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
    queryFn: async () => {
      const rows = (await adminRpc.trainerPayments(trainerId)) as PaymentRow[];
      return { rows, total: rows.length };
    },
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


/** The public sign-up link for one account, ready to send.
 *  It is also the URL a carrier reviewer needs, which is the reason it is
 *  surfaced here rather than left to be assembled by hand. */
function JoinLinkCard({ slug, id }: { slug: string | null; id: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://www.trainerpro.coach/join?c=${slug || id}`;
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
        Parent sign-up link
      </p>
      <p className="text-xs text-slate-500 mb-2.5">
        Send this to a parent and they fill in their own details, including whether they want
        texts. Requests land in this account's activity, not straight into their kid list.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 break-all">
          {url}
        </code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(url).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              },
              () => undefined,
            );
          }}
          className="flex-none text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {!slug && (
        <p className="text-xs text-slate-400 mt-2">
          Using the account id because no short name is set. It works exactly the same.
        </p>
      )}
    </section>
  );
}
