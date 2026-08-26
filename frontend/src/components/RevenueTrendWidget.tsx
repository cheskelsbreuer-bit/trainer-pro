import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api, apiBaseUrl } from '../lib/api';
import { formatMoney } from '../lib/format';

interface RevenuePoint {
  period: string; // "2026-04"
  amount: number;
  sessions: number;
}

interface RevenueResponse {
  granularity: string;
  points: RevenuePoint[];
  total: number;
  average: number;
}

// Calls the FastAPI backend at /analytics/revenue. If the backend isn't
// running or VITE_API_URL is unset, the widget shows a friendly offline state.
export function RevenueTrendWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['revenue-trend'],
    queryFn: async () => api<RevenueResponse>('/analytics/revenue?months=6'),
    enabled: !!apiBaseUrl,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (!apiBaseUrl) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <Header />
        <div className="text-xs text-slate-500 py-6 text-center">
          VITE_API_URL is not set. Add it to <code className="bg-slate-100 px-1 rounded">frontend/.env.local</code> and restart.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <Header />
        <div className="text-xs text-slate-500 py-6 text-center">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <Header />
        <div className="text-xs text-slate-500 py-4 flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-lg p-3">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>The trend chart couldn't load just now — it'll be back on the next refresh.</span>
        </div>
      </div>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <Header />
        <div className="text-xs text-slate-500 py-6 text-center">No data yet.</div>
      </div>
    );
  }

  const chartData = data.points.map((p) => ({
    label: shortMonth(p.period),
    revenue: p.amount,
    sessions: p.sessions,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <Header />
      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <Stat label="6-month total" value={formatMoney(data.total)} />
        <Stat label="Monthly average" value={formatMoney(data.average)} />
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              stroke="#cbd5e1"
              tickFormatter={(v) => '$' + (v >= 1000 ? Math.round(v / 100) / 10 + 'k' : v)}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value: number, name) => (name === 'revenue' ? formatMoney(value) : value)}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--brand, #2d6a9f)"
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <TrendingUp size={16} className="text-emerald-600" />
      <h2 className="font-semibold text-slate-900">Revenue trend</h2>
      <span className="text-xs text-slate-400 ml-auto">last 6 months</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2">
      <div className="text-slate-500">{label}</div>
      <div className="font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function shortMonth(period: string): string {
  // "2026-04" → "Apr"
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString(undefined, { month: 'short' });
}
