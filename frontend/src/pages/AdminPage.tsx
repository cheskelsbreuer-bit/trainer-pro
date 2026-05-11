import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Mail,
  TrendingUp,
  CheckCircle2,
  Calendar,
  DollarSign,
  Copy,
  Search,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  ListChecks,
  Send,
  Reply as ReplyIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { PROJECT_STATUS, STATUS_META, type StatusCategory } from '../lib/projectStatus';
import { TrainerDetailDrawer } from '../components/TrainerDetailDrawer';

interface OverviewStats {
  total_trainers: number;
  onboarded_trainers: number;
  new_trainers_this_week: number;
  new_trainers_this_month: number;
  total_clients: number;
  total_sessions: number;
  total_payments_amount: number;
  waitlist_count: number;
}

interface TrainerRow {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  onboarded_at: string | null;
  client_count_estimate: string | null;
  specialties: string[];
  created_at: string | null;
}

type SortKey = 'created_at' | 'email' | 'full_name' | 'business_name' | 'onboarded_at';
type SortDir = 'asc' | 'desc';

interface WaitlistRow {
  id: string;
  email: string;
  source: string | null;
  created_at: string | null;
}

interface FeedbackRow {
  id: string;
  trainer_id: string | null;
  trainer_email: string | null;
  category: string;
  message: string;
  user_agent: string | null;
  url: string | null;
  resolved_at: string | null;
  created_at: string | null;
  admin_reply: string | null;
  admin_replied_at: string | null;
  admin_reply_seen_at: string | null;
}

export function AdminPage() {
  const { user, signOut } = useAuth();
  const [search, setSearch] = useState('');
  const [openTrainerId, setOpenTrainerId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterMode, setFilterMode] = useState<'all' | 'onboarded' | 'pending'>('all');

  const overview = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api<OverviewStats>('/chesky/overview'),
    refetchOnWindowFocus: false,
  });
  const trainers = useQuery({
    queryKey: ['admin-trainers'],
    queryFn: () => api<{ rows: TrainerRow[]; total: number }>('/chesky/trainers'),
    refetchOnWindowFocus: false,
  });
  const waitlist = useQuery({
    queryKey: ['admin-waitlist'],
    queryFn: () => api<{ rows: WaitlistRow[]; total: number }>('/chesky/waitlist'),
    refetchOnWindowFocus: false,
  });
  const feedback = useQuery({
    queryKey: ['admin-feedback'],
    queryFn: () => api<{ rows: FeedbackRow[]; total: number }>('/chesky/feedback'),
    refetchOnWindowFocus: false,
  });

  const filteredTrainers = (trainers.data?.rows ?? [])
    .filter((t) => {
      if (filterMode === 'onboarded' && !t.onboarded_at) return false;
      if (filterMode === 'pending' && t.onboarded_at) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        (t.email ?? '').toLowerCase().includes(s) ||
        (t.full_name ?? '').toLowerCase().includes(s) ||
        (t.business_name ?? '').toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      const av = (a[sortKey] ?? '').toString().toLowerCase();
      const bv = (b[sortKey] ?? '').toString().toLowerCase();
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filteredWaitlist = (waitlist.data?.rows ?? []).filter((w) => {
    if (!search.trim()) return true;
    return w.email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
              <ShieldCheck size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Admin</h1>
              <p className="text-[11px] text-slate-400 -mt-0.5">
                Signed in as {user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-1"
            >
              Back to app
            </a>
            <button
              onClick={signOut}
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats grid */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Overview</h2>
          {overview.isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : overview.error ? (
            <p className="text-sm text-red-600">
              Couldn't load: {(overview.error as Error).message}
            </p>
          ) : overview.data ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={<Users size={16} />}
                color="blue"
                label="Total trainers"
                value={overview.data.total_trainers.toString()}
                sub={`${overview.data.onboarded_trainers} finished onboarding`}
              />
              <StatCard
                icon={<TrendingUp size={16} />}
                color="emerald"
                label="New this week"
                value={`+${overview.data.new_trainers_this_week}`}
                sub={`+${overview.data.new_trainers_this_month} in 30 days`}
              />
              <StatCard
                icon={<Mail size={16} />}
                color="amber"
                label="Waitlist signups"
                value={overview.data.waitlist_count.toString()}
                sub="From landing page"
              />
              <StatCard
                icon={<DollarSign size={16} />}
                color="purple"
                label="Total revenue"
                value={`$${overview.data.total_payments_amount.toFixed(0)}`}
                sub="All trainers · all-time"
              />
              <StatCard
                icon={<Users size={16} />}
                color="cyan"
                label="Total clients"
                value={overview.data.total_clients.toString()}
                sub="Across every trainer"
              />
              <StatCard
                icon={<Calendar size={16} />}
                color="rose"
                label="Sessions logged"
                value={overview.data.total_sessions.toString()}
                sub="All time"
              />
              <StatCard
                icon={<CheckCircle2 size={16} />}
                color="indigo"
                label="Onboarding rate"
                value={
                  overview.data.total_trainers > 0
                    ? `${Math.round(
                        (overview.data.onboarded_trainers / overview.data.total_trainers) * 100,
                      )}%`
                    : '—'
                }
                sub="Finished the wizard"
              />
              <StatCard
                icon={<DollarSign size={16} />}
                color="pink"
                label="Avg revenue / trainer"
                value={
                  overview.data.total_trainers > 0
                    ? `$${(
                        overview.data.total_payments_amount / overview.data.total_trainers
                      ).toFixed(0)}`
                    : '—'
                }
                sub="Lifetime"
              />
            </div>
          ) : null}
        </section>

        {/* Search */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2">
          <Search size={16} className="text-slate-400 ml-2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, business…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        {/* Trainers table */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Trainers</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filteredTrainers.length} of {trainers.data?.total ?? 0}
                <span className="text-slate-400"> · click any row to open the trainer drawer</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status filter pills */}
              {(['all', 'onboarded', 'pending'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFilterMode(m)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                    filterMode === m
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {m === 'all' ? 'All' : m === 'onboarded' ? '✓ Onboarded' : '⏳ Pending'}
                </button>
              ))}
              <CopyEmailsButton
                emails={filteredTrainers.map((t) => t.email).filter((e): e is string => !!e)}
                label="Copy emails"
              />
              <MailtoBccButton
                emails={filteredTrainers.map((t) => t.email).filter((e): e is string => !!e)}
              />
            </div>
          </div>
          {trainers.isLoading ? (
            <p className="p-5 text-sm text-slate-500">Loading…</p>
          ) : trainers.error ? (
            <p className="p-5 text-sm text-red-600">
              Couldn't load: {(trainers.error as Error).message}
            </p>
          ) : filteredTrainers.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No trainers yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <tr>
                    <SortableHeader k="email" label="Email" current={sortKey} dir={sortDir} onClick={toggleSort} />
                    <SortableHeader k="full_name" label="Name" current={sortKey} dir={sortDir} onClick={toggleSort} />
                    <SortableHeader k="business_name" label="Business" current={sortKey} dir={sortDir} onClick={toggleSort} />
                    <th className="text-left px-4 py-2">Specialties</th>
                    <SortableHeader k="onboarded_at" label="Onboarded" current={sortKey} dir={sortDir} onClick={toggleSort} />
                    <SortableHeader k="created_at" label="Joined" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTrainers.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setOpenTrainerId(t.id)}
                      className="hover:bg-blue-50 cursor-pointer transition"
                      title="Click to view + edit this trainer"
                    >
                      <td className="px-4 py-2.5 font-mono text-slate-900">{t.email ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-700">{t.full_name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-700">{t.business_name ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(t.specialties ?? []).slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium"
                            >
                              {s.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {(t.specialties ?? []).length > 3 && (
                            <span className="text-[10px] text-slate-500">
                              +{(t.specialties ?? []).length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {t.onboarded_at ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                            ✓ Done
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                            In progress
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Waitlist */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Waitlist</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filteredWaitlist.length} of {waitlist.data?.total ?? 0} · Landing-page email signups
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CopyEmailsButton
                emails={filteredWaitlist.map((w) => w.email)}
                label="Copy emails"
              />
              <MailtoBccButton emails={filteredWaitlist.map((w) => w.email)} />
            </div>
          </div>
          {waitlist.isLoading ? (
            <p className="p-5 text-sm text-slate-500">Loading…</p>
          ) : waitlist.error ? (
            <p className="p-5 text-sm text-red-600">
              Couldn't load: {(waitlist.error as Error).message}
            </p>
          ) : filteredWaitlist.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No waitlist signups yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2">Email</th>
                    <th className="text-left px-4 py-2">Source</th>
                    <th className="text-left px-4 py-2">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWaitlist.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-slate-900">{w.email}</td>
                      <td className="px-4 py-2.5 text-slate-500">{w.source ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {w.created_at
                          ? new Date(w.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Feedback */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <MessageSquare size={18} className="text-violet-600" />
            <div>
              <h2 className="font-bold text-slate-900">Feedback</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {feedback.data?.total ?? 0} message{feedback.data?.total === 1 ? '' : 's'} from
                trainers
              </p>
            </div>
          </div>
          {feedback.isLoading ? (
            <p className="p-5 text-sm text-slate-500">Loading…</p>
          ) : feedback.error ? (
            <p className="p-5 text-sm text-red-600">
              Couldn't load: {(feedback.error as Error).message}
            </p>
          ) : (feedback.data?.rows ?? []).length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No feedback yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(feedback.data?.rows ?? []).map((f) => (
                <FeedbackItem key={f.id} feedback={f} />
              ))}
            </ul>
          )}
        </section>

        {/* Project status — your private build tracker */}
        <ProjectStatusSection />

        <p className="text-center text-xs text-slate-400 pt-4">
          Admin tools · Trainer Pro
        </p>
      </main>

      {openTrainerId && (
        <TrainerDetailDrawer
          trainerId={openTrainerId}
          onClose={() => setOpenTrainerId(null)}
        />
      )}
    </div>
  );
}

function FeedbackItem({ feedback: f }: { feedback: FeedbackRow }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(f.admin_reply ?? '');
  const [open, setOpen] = useState(!f.admin_reply); // collapsed once a reply exists

  const send = useMutation({
    mutationFn: () =>
      api(`/chesky/feedback/${f.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply: draft }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-feedback'] });
      setOpen(false);
    },
  });

  return (
    <li className="p-4 hover:bg-slate-50">
      <div className="flex items-center gap-2 mb-1.5 text-xs">
        <span className={CATEGORY_COLORS[f.category] ?? CATEGORY_COLORS.general}>
          {CATEGORY_LABELS[f.category] ?? f.category}
        </span>
        <span className="text-slate-500 font-mono">{f.trainer_email ?? 'unknown'}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">
          {f.created_at
            ? new Date(f.created_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'}
        </span>
        {f.admin_reply && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
            {f.admin_reply_seen_at ? '✓ seen' : 'replied'}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{f.message}</p>
      {f.url && <p className="text-[11px] text-slate-400 mt-1 truncate">From: {f.url}</p>}

      {/* Existing reply collapsed view */}
      {f.admin_reply && !open && (
        <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
          <div className="flex items-center justify-between text-[11px] text-blue-700 mb-1">
            <span className="font-semibold flex items-center gap-1">
              <ReplyIcon size={11} /> Your reply
              {f.admin_replied_at && (
                <span className="text-blue-500 font-normal ml-1">
                  ·{' '}
                  {new Date(f.admin_replied_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-blue-600 hover:text-blue-900 underline"
            >
              Edit
            </button>
          </div>
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            {f.admin_reply}
          </p>
        </div>
      )}

      {/* Reply composer */}
      {open && (
        <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2 flex items-center gap-1">
            <ReplyIcon size={11} /> Reply to {f.trainer_email ?? 'trainer'}
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Hey — thanks for flagging this. I just shipped a fix…"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <div className="flex items-center justify-between gap-2 mt-2">
            <p className="text-[10px] text-slate-400">
              They&rsquo;ll see this in their dashboard banner + Settings.
            </p>
            <div className="flex items-center gap-2">
              {f.admin_reply && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1.5 rounded"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={() => send.mutate()}
                disabled={send.isPending || !draft.trim()}
                className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
              >
                <Send size={11} />
                {send.isPending ? 'Sending…' : f.admin_reply ? 'Update reply' : 'Send reply'}
              </button>
            </div>
          </div>
          {send.error && (
            <p className="text-xs text-red-600 mt-1">{(send.error as Error).message}</p>
          )}
        </div>
      )}
    </li>
  );
}

function ProjectStatusSection() {
  const grouped = PROJECT_STATUS.reduce<Record<StatusCategory, typeof PROJECT_STATUS>>(
    (acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    },
    {} as Record<StatusCategory, typeof PROJECT_STATUS>,
  );

  const orderedCategories = (Object.keys(STATUS_META) as StatusCategory[]).sort(
    (a, b) => STATUS_META[a].order - STATUS_META[b].order,
  );

  const totalShipped = (grouped.shipped ?? []).length;
  const totalAll = PROJECT_STATUS.length;

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <ListChecks size={18} className="text-blue-600" />
          <div>
            <h2 className="font-bold text-slate-900">Project status</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalShipped} of {totalAll} items live · everything we've built, broken, and
              planning. Edit{' '}
              <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">
                frontend/src/lib/projectStatus.ts
              </code>{' '}
              to update.
            </p>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-6">
        {orderedCategories.map((cat) => {
          const items = grouped[cat] ?? [];
          if (items.length === 0) return null;
          const meta = STATUS_META[cat];
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">{meta.emoji}</span>
                <h3 className="font-semibold text-slate-800 text-sm">{meta.label}</h3>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${categoryBadge(cat)}`}
                >
                  {items.length}
                </span>
              </div>
              <ul className="space-y-1.5">
                {items.map((it, i) => (
                  <li
                    key={`${cat}-${i}`}
                    className={`p-3 rounded-lg border ${categoryBg(cat)}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{it.title}</p>
                        {it.detail && (
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            {it.detail}
                          </p>
                        )}
                        {it.blocker && (
                          <p className="text-xs text-amber-700 mt-1.5 leading-relaxed">
                            <span className="font-semibold">Blocker:</span> {it.blocker}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function categoryBadge(cat: StatusCategory): string {
  const map: Record<StatusCategory, string> = {
    shipped: 'bg-emerald-100 text-emerald-700',
    testing: 'bg-amber-100 text-amber-700',
    thisWeek: 'bg-blue-100 text-blue-700',
    soon: 'bg-indigo-100 text-indigo-700',
    ideas: 'bg-slate-200 text-slate-700',
  };
  return map[cat];
}

function categoryBg(cat: StatusCategory): string {
  const map: Record<StatusCategory, string> = {
    shipped: 'bg-emerald-50/40 border-emerald-100',
    testing: 'bg-amber-50/40 border-amber-100',
    thisWeek: 'bg-blue-50/40 border-blue-100',
    soon: 'bg-indigo-50/40 border-indigo-100',
    ideas: 'bg-slate-50 border-slate-200',
  };
  return map[cat];
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug',
  feature: '✨ Feature request',
  general: '💬 General',
  other: '🤷 Other',
};
const CATEGORY_COLORS: Record<string, string> = {
  bug: 'px-1.5 py-0.5 rounded text-rose-700 bg-rose-50 font-medium',
  feature: 'px-1.5 py-0.5 rounded text-blue-700 bg-blue-50 font-medium',
  general: 'px-1.5 py-0.5 rounded text-slate-700 bg-slate-100 font-medium',
  other: 'px-1.5 py-0.5 rounded text-amber-700 bg-amber-50 font-medium',
};

/* ─────────────── Helpers ─────────────── */
function SortableHeader({
  k,
  label,
  current,
  dir,
  onClick,
}: {
  k: SortKey;
  label: string;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = current === k;
  return (
    <th
      onClick={() => onClick(k)}
      className="text-left px-4 py-2 cursor-pointer hover:text-slate-900 select-none"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (
          <span className="text-slate-400">{dir === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan' | 'rose' | 'indigo' | 'pink';
  label: string;
  value: string;
  sub: string;
}) {
  const colors = {
    blue: 'from-blue-50 to-sky-50 border-blue-100 text-blue-700',
    emerald: 'from-emerald-50 to-teal-50 border-emerald-100 text-emerald-700',
    amber: 'from-amber-50 to-orange-50 border-amber-100 text-amber-700',
    purple: 'from-purple-50 to-fuchsia-50 border-purple-100 text-purple-700',
    cyan: 'from-cyan-50 to-sky-50 border-cyan-100 text-cyan-700',
    rose: 'from-rose-50 to-pink-50 border-rose-100 text-rose-700',
    indigo: 'from-indigo-50 to-violet-50 border-indigo-100 text-indigo-700',
    pink: 'from-pink-50 to-rose-50 border-pink-100 text-pink-700',
  };
  return (
    <div className={`bg-gradient-to-br border rounded-xl p-3 ${colors[color]}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-80 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-[11px] mt-0.5 opacity-80">{sub}</div>
    </div>
  );
}

function CopyEmailsButton({ emails, label }: { emails: string[]; label: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    if (emails.length === 0) return;
    await navigator.clipboard.writeText(emails.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={onClick}
      disabled={emails.length === 0}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
    >
      <Copy size={12} />
      {copied ? 'Copied!' : label}
    </button>
  );
}

function MailtoBccButton({ emails }: { emails: string[] }) {
  if (emails.length === 0) {
    return null;
  }
  // Gmail's mailto: handles a few hundred BCC OK; chunk if you have thousands.
  const href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}`;
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
    >
      <Mail size={12} />
      Email all <ExternalLink size={10} />
    </a>
  );
}
