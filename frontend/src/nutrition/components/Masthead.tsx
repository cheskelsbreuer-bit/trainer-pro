// Nutrition coach app — magazine masthead. Centered serif logo, thin
// horizontal rules, small-caps section links underneath. Reads like
// the table of contents of a wellness magazine rather than an app's
// nav bar.

import { NavLink, useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { N, SERIF_FONT, useNutritionTheme } from '../theme';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';

const SECTIONS: { to: string; label: string }[] = [
  { to: '/', label: 'Practice' },
  { to: '/clients', label: 'Clients' },
  { to: '/check-ins', label: 'Check-ins' },
  { to: '/plans', label: 'Practices' },
  { to: '/habits', label: 'Habits' },
  { to: '/ask', label: 'Ask the Coach' },
  { to: '/plate', label: 'Plate' },
  { to: '/pantry', label: 'Pantry' },
];

export function Masthead({ trainer }: { trainer: Trainer | undefined }) {
  const navigate = useNavigate();
  const [mode, toggleMode] = useNutritionTheme();

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const practiceName = trainer?.business_name || trainer?.full_name || 'Your Practice';

  return (
    <header
      className="border-b"
      style={{ background: N.paper, borderColor: N.rule }}
    >
      {/* Hairline ribbon at top edge */}
      <div
        className="h-px w-full"
        style={{ background: N.sage }}
        aria-hidden
      />

      <div className="px-6 sm:px-12 pt-6 pb-3 flex items-center gap-4">
        {/* Tiny issue/date eyebrow on the left for masthead authenticity */}
        <span
          className="hidden md:block text-[10px] uppercase tracking-[0.3em] flex-1"
          style={{ color: N.mute, fontFamily: SERIF_FONT, fontStyle: 'italic' }}
        >
          Vol. I · This Week's Issue
        </span>

        {/* Logo block — serif, centered */}
        <div className="flex-1 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.5em] mb-1"
            style={{ color: N.sage }}
          >
            ✦ Nutrition Practice ✦
          </p>
          <h1
            className="leading-none truncate mx-auto max-w-xs sm:max-w-md"
            style={{
              fontFamily: SERIF_FONT,
              color: N.ink,
              fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '0.01em',
            }}
            title={practiceName}
          >
            {practiceName}
          </h1>
        </div>

        {/* Right cluster — theme + sign out, tiny + italic */}
        <div
          className="hidden md:flex items-center gap-3 flex-1 justify-end text-[10px] uppercase tracking-[0.2em]"
          style={{ color: N.mute, fontFamily: SERIF_FONT, fontStyle: 'italic' }}
        >
          <button
            onClick={toggleMode}
            className="inline-flex items-center gap-1 hover:opacity-80"
            title={mode === 'light' ? 'Switch to evening mode' : 'Switch to paper mode'}
          >
            {mode === 'light' ? <Moon size={11} /> : <Sun size={11} />}
            {mode === 'light' ? 'Evening' : 'Paper'}
          </button>
          <span style={{ color: N.muteFaint }}>·</span>
          <button onClick={signOut} className="hover:opacity-80">
            Sign out
          </button>
        </div>
      </div>

      {/* Hairline + section links — table-of-contents style */}
      <div
        className="border-t border-b mx-6 sm:mx-12"
        style={{ borderColor: N.ruleSoft }}
      >
        <nav className="flex items-center justify-center gap-1 sm:gap-2 py-2 overflow-x-auto">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.to === '/'}
              className={({ isActive }) =>
                `shrink-0 px-2 sm:px-3 py-1 text-[11px] uppercase transition-colors ${
                  isActive ? 'font-semibold' : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => ({
                fontFamily: SERIF_FONT,
                letterSpacing: '0.25em',
                color: isActive ? N.sageDeep : N.mute,
                fontStyle: isActive ? 'normal' : 'italic',
                borderBottom: isActive ? `1px solid ${N.sage}` : `1px solid transparent`,
                paddingBottom: '0.5rem',
              })}
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
