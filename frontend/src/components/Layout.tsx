import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useBrandTheme } from '../hooks/useBrandTheme';
import { supabase } from '../lib/supabase';
import { LogOut } from 'lucide-react';
import type { Trainer } from '../lib/database.types';
import { coreNavFor } from '../lib/appNav';
import { useEnabledModules } from '../lib/modules';
import { useLayout } from '../lib/layout';
import { pickTemplateUx } from '../lib/templateUx';

export function Layout() {
  const { user, signOut } = useAuth();
  const brand = useBrandTheme();

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

  // The menu is BUILT from the coach's choices: which features are on
  // (Settings → Customize → Features) and their saved order (→ Layout).
  const { isOn } = useEnabledModules(trainer?.template_slugs ?? undefined);
  const { layout } = useLayout();
  const clientNoun = capitalize(pickTemplateUx(trainer?.template_slugs ?? []).clientNounPlural);
  const navItems = coreNavFor(isOn, layout.navOrder, clientNoun);

  const displayName =
    trainer?.business_name?.trim() ||
    trainer?.full_name?.trim() ||
    'Trainer Pro';
  const initials = getInitials(displayName);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div
          className="px-5 py-5 border-b border-slate-200"
          style={{ borderTop: `3px solid ${brand}` }}
        >
          <div className="flex items-center gap-2.5">
            {trainer?.logo_url ? (
              <img
                src={trainer.logo_url}
                alt={displayName}
                className="w-9 h-9 rounded-lg object-cover bg-slate-100"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-sm flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${brand} 0%, ${shade(brand, -25)} 100%)`,
                }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-slate-900 text-sm truncate" title={displayName}>
                {displayName}
              </h1>
              <p className="text-[10px] text-slate-400 -mt-0.5">Powered by Trainer Pro</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? 'font-medium'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: 'var(--brand-tint)',
                      color: brand,
                    }
                  : undefined
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-slate-400">Signed in as</p>
            <p className="text-sm text-slate-700 truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function shade(hex: string, percent: number): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n + (n * percent) / 100)))
      .toString(16)
      .padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
