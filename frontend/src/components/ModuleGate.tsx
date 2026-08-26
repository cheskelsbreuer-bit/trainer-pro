// Route guard for tabs the coach switched off. Instead of a dead page
// or a hard redirect, it says what this tab is and offers to flip it on
// right there — the switchboard's promise, kept at the route level.

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useEnabledModules, MODULE_BY_ID } from '../lib/modules';
import { navDefForRoute } from '../lib/appNav';
import type { Trainer } from '../lib/database.types';

export function ModuleGate({ route, children }: { route: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: trainer } = useQuery({
    queryKey: ['trainer', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as Trainer;
    },
    enabled: !!user,
  });
  const { isOn, toggle, isLoading, saving } = useEnabledModules(
    trainer?.template_slugs ?? undefined,
  );

  const def = navDefForRoute(route);
  // Core routes and unknown routes pass straight through; so does
  // anything while the module set is still loading (no flash).
  if (!def || def.modules.length === 0 || isLoading || def.modules.some((m) => isOn(m))) {
    return <>{children}</>;
  }

  const primary = MODULE_BY_ID[def.modules[0]];

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="text-4xl mb-3">{primary?.icon ?? '🔌'}</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          {def.label} is switched off
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          You turned this feature off in your app setup
          {primary ? ` (${primary.name.toLowerCase()} — ${primary.description.replace(/\.$/, '').toLowerCase()})` : ''}.
          Turn it back on and the tab returns to your menu instantly.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => primary && toggle(primary.id)}
            disabled={saving || !primary}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? 'Turning on…' : `Turn on ${def.label}`}
          </button>
          <Link
            to="/settings"
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            App setup
          </Link>
        </div>
      </div>
    </div>
  );
}
