// 🎓 First-day tour — seven friendly cards. Shows itself once on first
// visit; restartable any time from Settings (via the
// 'babysitting-tour-open' event).

import { useEffect, useState } from 'react';
import { B } from '../theme';
import { Btn } from './ui';

const DONE_KEY = 'babysitting-tour-done';
export const TOUR_OPEN_EVENT = 'babysitting-tour-open';

const STEPS: Array<{ emoji: string; title: string; body: string }> = [
  {
    emoji: '🧸',
    title: 'Welcome to your babysitting office!',
    body: 'Everything lives here: your kids, the money, and the reminders that send themselves. This tour takes one minute.',
  },
  {
    emoji: '🏡',
    title: 'Home is your morning glance',
    body: "Who's here today (allergies right on their chip), who owes money, recent payments, birthdays coming up. Start every day here.",
  },
  {
    emoji: '👨‍👩‍👧',
    title: 'Kids belong to families',
    body: 'Each kid has their days, rates, allergies, and notes. Siblings share a family — one bill, one balance, one reminder for the whole family.',
  },
  {
    emoji: '💛',
    title: 'Billing without a calculator',
    body: 'Bill a flat week, hours × rate, or any amount — per kid or a whole family at once. Recorded a payment wrong? Everything can be undone.',
  },
  {
    emoji: '✉️',
    title: 'Messages — the magic part',
    body: 'The reminder run writes every "you owe" text and email for you — tap, send, next. Or flip on automatic sending and they go out by themselves on your day.',
  },
  {
    emoji: '🔒',
    title: 'The editing switch keeps you safe',
    body: 'When it says "View only", nothing can change — browse freely, hand the iPad to anyone. Flip it to edit; add a PIN in Settings if you like.',
  },
  {
    emoji: '⚙️',
    title: 'Make it completely yours',
    body: 'Settings has your colors, your fields on every kid, your payment methods, closed days, and the Simple/Standard/Pro switch. Enjoy! 🎉',
  },
];

export function TourWizard() {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(DONE_KEY) !== '1';
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reopen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(TOUR_OPEN_EVENT, reopen);
    return () => window.removeEventListener(TOUR_OPEN_EVENT, reopen);
  }, []);

  function finish() {
    try {
      window.localStorage.setItem(DONE_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(55, 40, 28, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: B.card,
          borderRadius: B.radiusLg,
          boxShadow: B.shadow,
          maxWidth: 440,
          width: '100%',
          padding: '28px 26px 22px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.6rem', marginBottom: 10 }}>{s.emoji}</div>
        <div style={{ fontFamily: B.fontDisplay, fontWeight: 800, fontSize: '1.15rem', color: B.ink, marginBottom: 8 }}>
          {s.title}
        </div>
        <div style={{ color: B.inkSoft, fontSize: '0.92rem', lineHeight: 1.55, marginBottom: 18 }}>{s.body}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === step ? B.primary : B.rule,
                display: 'inline-block',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Btn kind="ghost" size="sm" onClick={finish}>
            Skip
          </Btn>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <Btn kind="soft" size="sm" onClick={() => setStep(step - 1)}>
                ← Back
              </Btn>
            )}
            <Btn size="sm" onClick={() => (last ? finish() : setStep(step + 1))}>
              {last ? "Let's go! 🎉" : 'Next →'}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
