// Left sidebar nav — the layout pattern every leading coaching app uses
// (Healthie, Practice Better, Trainerize, Cronometer Pro). Top-tab nav
// was the wrong call for a complex app with 8 sections; a sidebar is
// what coaches actually expect and scales better.
//
// Renamed from "Masthead" but kept the file name so the existing
// imports don't all need updating.

import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Inbox,
  BookOpen,
  Sparkles,
  Wallet,
  Settings,
  Sun,
  Moon,
  LogOut,
  ChefHat,
  ClipboardList,
  Library,
} from 'lucide-react';
import { N, useNutritionTheme } from '../theme';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';
import { useEnabledModules } from '../../lib/modules';
import { useLayout, applyNavOrder } from '../../lib/layout';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Optional capability module that gates this tab. Items with no
   *  module always show (they're core). When the module is off, the
   *  tab is hidden. */
  module?: string;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/sessions', label: 'Sessions', icon: CalendarClock, module: 'online-booking' },
  { to: '/check-ins', label: 'Check-ins', icon: Inbox, module: 'check-ins' },
  { to: '/intake', label: 'Intake forms', icon: ClipboardList, module: 'intake-forms' },
  { to: '/recipes', label: 'Recipes', icon: ChefHat, module: 'recipes' },
  { to: '/plans', label: 'Habit library', icon: BookOpen, module: 'habit-coaching' },
  { to: '/resources', label: 'Resources', icon: Library, module: 'resources' },
  { to: '/ask', label: 'Ask coach', icon: Sparkles, module: 'ask-coach' },
  { to: '/plate', label: 'Billing', icon: Wallet, module: 'payments' },
  { to: '/pantry', label: 'Settings', icon: Settings },
];

/** Filter the nav to the coach's enabled modules (core items always
 *  pass), then sort by the coach's saved menu order. */
function useVisibleNav(trainer: Trainer | undefined): NavItem[] {
  const { isOn } = useEnabledModules(trainer?.template_slugs?.[0]);
  const { layout } = useLayout();
  const filtered = NAV.filter((item) => !item.module || isOn(item.module));
  return applyNavOrder(filtered, layout.navOrder);
}

export function Masthead({ trainer }: { trainer: Trainer | undefined }) {
  const navigate = useNavigate();
  const [mode, toggleMode] = useNutritionTheme();
  const visibleNav = useVisibleNav(trainer);

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const practiceName = trainer?.business_name || trainer?.full_name || 'Your Practice';
  const letterMark = (practiceName[0] || 'N').toUpperCase();
  const coachName = trainer?.full_name ?? '';
  const coachInitials = coachName
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <aside
      className="hidden md:flex md:flex-col w-60 shrink-0 border-r"
      style={{
        background: N.card,
        borderColor: N.rule,
      }}
    >
      {/* Brand block */}
      <div
        className="px-5 pt-5 pb-4 border-b flex items-center gap-3"
        style={{ borderColor: N.rule }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
          style={{ background: N.coral, color: '#FFF' }}
          aria-hidden
        >
          {letterMark}
        </div>
        <div className="min-w-0">
          <p
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: N.coral }}
          >
            Nutrition
          </p>
          <p
            className="text-sm font-semibold truncate"
            style={{ color: N.ink }}
            title={practiceName}
          >
            {practiceName}
          </p>
        </div>
      </div>

      {/* Section nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 mx-0.5 my-0.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? '' : 'hover:bg-[var(--nut-inset)]'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? '#FFF' : N.inkSoft,
                background: isActive ? N.coral : 'transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    className={isActive ? '' : 'opacity-70'}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Coach footer — avatar + theme + sign-out */}
      <div
        className="px-3 py-3 border-t flex items-center gap-2"
        style={{ borderColor: N.rule }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0"
          style={{
            background: N.sageSoft,
            color: N.sageDeep,
          }}
        >
          {coachInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold truncate"
            style={{ color: N.ink }}
            title={coachName}
          >
            {coachName.split(' ')[0] || 'You'}
          </p>
          <p className="text-[10px] truncate" style={{ color: N.mute }}>
            Coach
          </p>
        </div>
        <button
          onClick={toggleMode}
          aria-label="Toggle theme"
          className="w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-[var(--nut-inset)] transition-colors"
          style={{ color: N.mute }}
          title={mode === 'light' ? 'Switch to dark' : 'Switch to light'}
        >
          {mode === 'light' ? <Moon size={13} /> : <Sun size={13} />}
        </button>
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-[var(--nut-inset)] transition-colors"
          style={{ color: N.mute }}
          title="Sign out"
        >
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  );
}

/** Mobile top bar — shown only on small screens since the sidebar is
 *  hidden there. Horizontal scrolling tabs so all 8 sections fit. */
export function MobileTopBar({ trainer }: { trainer: Trainer | undefined }) {
  const practiceName = trainer?.business_name || trainer?.full_name || 'Your Practice';
  const letterMark = (practiceName[0] || 'N').toUpperCase();
  const visibleNav = useVisibleNav(trainer);
  return (
    <div
      className="md:hidden sticky top-0 z-30 border-b"
      style={{ background: N.card, borderColor: N.rule }}
    >
      <div className="px-4 py-2.5 flex items-center gap-3 border-b" style={{ borderColor: N.rule }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
          style={{ background: N.coral, color: '#FFF' }}
        >
          {letterMark}
        </div>
        <p
          className="text-sm font-semibold truncate flex-1"
          style={{ color: N.ink }}
        >
          {practiceName}
        </p>
      </div>
      <div className="overflow-x-auto px-3 py-2 flex items-center gap-1">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                  isActive ? '' : 'hover:bg-[var(--nut-inset)]'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? N.coral : 'transparent',
                color: isActive ? '#FFF' : N.mute,
              })}
            >
              <Icon size={13} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
