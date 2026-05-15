// Tour wizard — a short, friendly walk-through that shows up the first
// time a coach signs into the exercise app. Six steps, each pointing at
// a different tab. Stored as "exercise-tour-done" in localStorage so it
// only auto-fires once. Re-runnable from Settings.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';
import { E } from '../theme';

const STORAGE_KEY = 'exercise-tour-done';

interface Step {
  emoji: string;
  title: string;
  body: string;
  tab?: string;
}

const STEPS: Step[] = [
  {
    emoji: '👋',
    title: 'Welcome to your payment manager',
    body:
      'Quick tour — under 60 seconds. You can re-run it any time from Settings → Tour. Or skip with the × in the corner.',
  },
  {
    emoji: '📊',
    title: 'The Dashboard — your morning glance',
    body:
      'Total active members, who owes money, recent payments, birthdays this month, upcoming canceled classes. Everything you check first.',
    tab: '/',
  },
  {
    emoji: '👥',
    title: 'Members — your full roster',
    body:
      'Search and filter by class, balance, or tag. Click any name to see their full payment history. Flip Edit mode ON (top right) to add new members or record payments.',
    tab: '/members',
  },
  {
    emoji: '💰',
    title: 'Payments — every transaction, searchable',
    body:
      'All payment history with date and group filters. Edit mode lets you delete individual payments if you made a mistake.',
    tab: '/payments',
  },
  {
    emoji: '🗂',
    title: 'Groups — bulk-charge a class in one click',
    body:
      "Open any day's class, then hit \"💰 Charge this class\" (Edit mode). It records a payment for every active member at their own per-class rate — 18 charges in 5 seconds.",
    tab: '/groups',
  },
  {
    emoji: '📝',
    title: 'Notes — your workout combos',
    body:
      'All your routines organized by category — Aerobics, Kickboxing, Zumba, whatever. Search across every note, organize with folders.',
    tab: '/notes',
  },
  {
    emoji: '⚙',
    title: 'Settings — the rest',
    body:
      'Tags, custom fields, holidays, default rates, family discount, SMS template — all in Settings. Plus Reports for trends and Log for what just changed.',
    tab: '/settings',
  },
];

function hasFinished(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

/** Stand-alone hook — returns true if the tour should auto-open. */
export function useTourAutoShow(): [boolean, () => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!hasFinished()) {
      // Show after a tiny delay so the page can render first
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);
  return [open, () => setOpen(false)];
}

export function TourWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const nav = useNavigate();
  const s = STEPS[step];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Navigate to the tab for each step as the user moves through
  useEffect(() => {
    if (s.tab) nav(s.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function next() {
    if (step >= STEPS.length - 1) finish();
    else setStep(step + 1);
  }
  function prev() {
    if (step > 0) setStep(step - 1);
  }
  function finish() {
    window.localStorage.setItem(STORAGE_KEY, '1');
    onClose();
  }

  return (
    <div
      onClick={finish}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 250,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: '20px 24px',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 -8px 30px rgba(0,0,0,0.25)',
          border: `2px solid ${E.primary}`,
          fontFamily: 'Arial, sans-serif',
          marginBottom: 30,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{ fontSize: '2rem' }} aria-hidden>
            {s.emoji}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: E.mute, fontWeight: 600 }}>
              {step + 1} / {STEPS.length}
            </span>
            <button
              onClick={finish}
              aria-label="Skip tour"
              style={{
                background: 'transparent',
                border: 'none',
                color: E.mute,
                cursor: 'pointer',
                padding: 2,
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <h2
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: E.primaryDeep,
            margin: '4px 0 8px',
          }}
        >
          {s.title}
        </h2>
        <p style={{ fontSize: '0.92rem', color: E.inkSoft, lineHeight: 1.5, margin: 0 }}>{s.body}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
          <button
            onClick={prev}
            disabled={step === 0}
            style={{
              background: 'transparent',
              border: `1px solid ${E.rule}`,
              color: step === 0 ? E.muteFaint : E.ink,
              padding: '8px 14px',
              borderRadius: 8,
              cursor: step === 0 ? 'default' : 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={finish}
            style={{
              background: 'transparent',
              border: 'none',
              color: E.mute,
              fontSize: '0.83rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Skip
          </button>
          <button
            onClick={next}
            style={{
              background: E.primary,
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.86rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {step === STEPS.length - 1 ? 'Done' : 'Next'}
            {step < STEPS.length - 1 && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Reset so the next reload auto-shows the tour again. */
export function resetTour() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
}
