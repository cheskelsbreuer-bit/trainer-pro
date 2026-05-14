// Top bar for the nutrition coach app — modern coaching-software feel,
// not a magazine masthead. Modeled on Precision Nutrition's own header
// and on the leading coach platforms (Healthie, Practice Better):
// logo letter-mark on the left, section tabs in the center, account
// menu on the right.

import { NavLink, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut } from 'lucide-react';
import { N, useNutritionTheme } from '../theme';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';

const SECTIONS: { to: string; label: string }[] = [
  { to: '/', label: 'Home' },
  { to: '/clients', label: 'Clients' },
  { to: '/check-ins', label: 'Check-ins' },
  { to: '/plans', label: 'Library' },
  { to: '/habits', label: 'Habits' },
  { to: '/ask', label: 'Ask coach' },
  { to: '/plate', label: 'Billing' },
  { to: '/pantry', label: 'Settings' },
];

export function Masthead({ trainer }: { trainer: Trainer | undefined }) {
  const navigate = useNavigate();
  const [mode, toggleMode] = useNutritionTheme();

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const practiceName = trainer?.business_name || trainer?.full_name || 'Your Practice';
  // First letter of the practice name, used as the logo mark.
  const letterMark = (practiceName[0] || 'N').toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 border-b"
      style={{
        background: N.card,
        borderColor: N.rule,
      }}
    >
      <div className="px-4 sm:px-8 h-14 flex items-center gap-4">
        {/* Left — logo + practice name */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base"
            style={{
              background: N.coral,
              color: '#FFF',
            }}
            aria-hidden
          >
            {letterMark}
          </div>
          <p
            className="text-sm font-semibold truncate max-w-[160px] hidden sm:block"
            style={{ color: N.ink }}
            title={practiceName}
          >
            {practiceName}
          </p>
        </div>

        {/* Center — section tabs */}
        <nav className="flex-1 min-w-0">
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {SECTIONS.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                end={s.to === '/'}
                className={({ isActive }) =>
                  `shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? '' : 'hover:bg-[var(--nut-inset)]'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? N.coral : N.mute,
                  background: isActive ? N.coralSoft : 'transparent',
                })}
              >
                {s.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Right — utility actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleMode}
            aria-label="Toggle theme"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--nut-inset)] transition-colors"
            style={{ color: N.mute }}
            title={mode === 'light' ? 'Switch to dark' : 'Switch to light'}
          >
            {mode === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--nut-inset)] transition-colors"
            style={{ color: N.mute }}
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
