import { TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

export function Progress() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Progress" subtitle="Track weight, body comp, and personal records over time." />

      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
        <TrendingUp className="mx-auto text-slate-300 mb-2" size={40} />
        <p className="text-slate-500 mb-2">Coming in Phase 3.</p>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Database, photo storage, and chart library (Recharts) are ready. Next: per-client measurement entry forms,
          progress photo upload, line charts, and a Python endpoint for trend analysis.
        </p>
      </div>
    </div>
  );
}
