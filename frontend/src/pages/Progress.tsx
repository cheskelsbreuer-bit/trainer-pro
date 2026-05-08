import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, TrendingUp, ChevronRight, ImageIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { ProgressEntryModal } from '../components/progress/ProgressEntryModal';
import { initials, formatDate } from '../lib/format';
import type { Client, ProgressEntry } from '../lib/database.types';

export function Progress() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-with-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, status, trainer_id')
        .neq('status', 'archived')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Pick<Client, 'id' | 'full_name' | 'status' | 'trainer_id'>[];
    },
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Progress"
        subtitle="Track weight, body comp, PRs, and photos over time."
      />

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        {/* client picker */}
        <aside className="bg-white border border-slate-200 rounded-xl p-2 max-h-[70vh] overflow-y-auto">
          <p className="text-[11px] uppercase tracking-wide text-slate-400 px-2 py-1.5">
            Clients
          </p>
          <ul className="space-y-0.5">
            {clients.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedClientId(c.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition ${
                    selectedClientId === c.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {initials(c.full_name)}
                  </div>
                  <span className="text-sm flex-1 text-left truncate">{c.full_name}</span>
                  {selectedClientId === c.id && <ChevronRight size={14} />}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* main pane */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          {selectedClient ? (
            <ClientProgressView client={selectedClient} />
          ) : (
            <div className="text-center py-16">
              <TrendingUp className="mx-auto text-slate-300 mb-2" size={40} />
              <p className="text-slate-500">Pick a client on the left to see their progress.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientProgressView({
  client,
}: {
  client: Pick<Client, 'id' | 'full_name' | 'trainer_id'>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProgressEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['progress', client.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('client_id', client.id)
        .order('measured_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProgressEntry[];
    },
  });

  // Group by metric_type
  const byMetric = useMemo(() => {
    const m = new Map<string, ProgressEntry[]>();
    for (const e of entries) {
      const arr = m.get(e.metric_type) ?? [];
      arr.push(e);
      m.set(e.metric_type, arr);
    }
    return m;
  }, [entries]);

  const numericMetrics = Array.from(byMetric.entries()).filter(
    ([_, arr]) => arr.some((e) => e.metric_value != null),
  );
  const photos = entries.filter((e) => e.photo_url);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">{client.full_name}</h3>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <Plus size={14} /> Log measurement
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <TrendingUp className="mx-auto text-slate-300 mb-2" size={36} />
          <p className="text-sm text-slate-500 mb-3">No measurements yet for {client.full_name.split(' ')[0]}.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <Plus size={14} /> First entry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charts */}
          {numericMetrics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {numericMetrics.map(([metric, arr]) => (
                <MetricChart
                  key={metric}
                  metric={metric}
                  entries={arr}
                  onClickPoint={(e) => {
                    setEditing(e);
                    setModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <ImageIcon size={14} /> Photos ({photos.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setEditing(p);
                      setModalOpen(true);
                    }}
                    className="group relative bg-slate-100 rounded-lg overflow-hidden aspect-square"
                  >
                    <img
                      src={p.photo_url!}
                      alt={p.metric_type}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs text-white">
                      <div className="font-medium capitalize">
                        {p.metric_type.replace('photo_', '')}
                      </div>
                      <div className="opacity-80">{formatDate(p.measured_at)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent entries table */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Recent entries</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 uppercase tracking-wide">
                  <tr className="border-b border-slate-100">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Metric</th>
                    <th className="py-2 pr-3 text-right">Value</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...entries].reverse().slice(0, 12).map((e) => (
                    <tr
                      key={e.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => {
                        setEditing(e);
                        setModalOpen(true);
                      }}
                    >
                      <td className="py-2 pr-3 text-slate-700">{formatDate(e.measured_at)}</td>
                      <td className="py-2 pr-3 text-slate-700 capitalize">
                        {e.metric_type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">
                        {e.metric_value != null
                          ? `${e.metric_value}${e.metric_unit ? ' ' + e.metric_unit : ''}`
                          : e.photo_url
                            ? '📷'
                            : '—'}
                      </td>
                      <td className="py-2 text-slate-500 truncate max-w-xs">{e.notes ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ProgressEntryModal
        open={modalOpen}
        clientId={client.id}
        trainerId={client.trainer_id}
        entry={editing ?? undefined}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}

function MetricChart({
  metric,
  entries,
  onClickPoint,
}: {
  metric: string;
  entries: ProgressEntry[];
  onClickPoint: (e: ProgressEntry) => void;
}) {
  const data = entries
    .filter((e) => e.metric_value != null)
    .map((e) => ({
      label: new Date(e.measured_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      value: Number(e.metric_value),
      _entry: e,
    }));
  const unit = entries.find((e) => e.metric_unit)?.metric_unit ?? '';
  const latest = data[data.length - 1]?.value;
  const first = data[0]?.value;
  const delta = latest != null && first != null ? latest - first : null;
  const deltaSign = delta == null ? '' : delta > 0 ? '+' : '';

  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h5 className="text-sm font-semibold text-slate-800 capitalize">
          {metric.replace(/_/g, ' ')}
        </h5>
        {latest != null && (
          <div className="text-right">
            <div className="text-base font-bold text-slate-900">
              {latest}
              <span className="text-sm font-normal text-slate-500 ml-0.5">{unit}</span>
            </div>
            {delta != null && Math.abs(delta) > 0.01 && (
              <div
                className={`text-[11px] ${
                  delta > 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {deltaSign}
                {delta.toFixed(1)}
                {unit} since first
              </div>
            )}
          </div>
        )}
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#64748b' }}
              stroke="#cbd5e1"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              stroke="#cbd5e1"
              width={36}
              domain={['dataMin - 1', 'dataMax + 1']}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(v: number) => [`${v} ${unit}`, '']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--brand, #2d6a9f)"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, cursor: 'pointer' }}
              activeDot={{
                r: 5,
                onClick: (_: unknown, payload: unknown) => {
                  const p = payload as { payload?: { _entry: ProgressEntry } } | undefined;
                  if (p?.payload?._entry) onClickPoint(p.payload._entry);
                },
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
