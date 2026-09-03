// Shared UI kit for the Babysitting app. Every page composes these so
// the whole app reads as one hand-designed system: warm linen ground,
// white cards with soft shadows, terracotta primary actions, teal
// support, pill-shaped chips, generous rounding.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { B, avatarTone, initials, formatBalance } from '../theme';

// ── Layout ────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  pad = 20,
}: {
  children: ReactNode;
  style?: CSSProperties;
  pad?: number;
}) {
  return (
    <div
      style={{
        background: B.card,
        borderRadius: B.radiusLg,
        boxShadow: B.shadowSoft,
        border: `1px solid ${B.rule}`,
        padding: pad,
        // A card sitting in a grid or flex row defaults to min-width:auto,
        // which means it refuses to shrink below the widest thing inside
        // it. One wide table then drags the whole page sideways on a
        // phone. This lets the card shrink and the table scroll on its own.
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  right,
  style,
}: {
  children: ReactNode;
  right?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="bs-sectiontitle"
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        margin: '4px 2px 12px',
        ...style,
      }}
    >
      <h2
        style={{
          fontFamily: B.fontDisplay,
          fontSize: '1.02rem',
          fontWeight: 800,
          color: B.ink,
          letterSpacing: '0.01em',
          margin: 0,
        }}
      >
        {children}
      </h2>
      {right}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'plain',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'plain' | 'primary' | 'accent' | 'warn' | 'good';
}) {
  const tones: Record<string, { bg: string; ink: string; ring: string }> = {
    plain: { bg: B.card, ink: B.ink, ring: B.rule },
    primary: { bg: B.primarySoft, ink: B.primaryDeep, ring: 'transparent' },
    accent: { bg: B.accentSoft, ink: B.accentDeep, ring: 'transparent' },
    warn: { bg: B.redSoft, ink: B.red, ring: 'transparent' },
    good: { bg: B.greenSoft, ink: B.green, ring: 'transparent' },
  };
  const t = tones[tone];
  return (
    <div
      className="bs-stat"
      style={{
        background: t.bg,
        border: `1px solid ${t.ring}`,
        borderRadius: B.radiusLg,
        boxShadow: tone === 'plain' ? B.shadowSoft : 'none',
        padding: '16px 18px',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: '1.55rem', fontWeight: 800, color: t.ink, fontFamily: B.fontDisplay, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: t.ink, opacity: 0.75, marginTop: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: '0.72rem', color: B.mute, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '46px 20px', color: B.inkSoft }}>
      <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontFamily: B.fontDisplay, fontWeight: 800, fontSize: '1.05rem', color: B.ink }}>{title}</div>
      {body && <div style={{ fontSize: '0.86rem', marginTop: 6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>{body}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/** A closed-by-default section: a card-styled header row you tap to
 *  open. Settings and Messages use it so long pages stay one calm list
 *  of headings — only what you're touching unfolds. */
export function Collapse({
  title,
  badge,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: B.card,
          border: `1px solid ${B.rule}`,
          borderRadius: B.radiusLg,
          boxShadow: B.shadowSoft,
          padding: '15px 20px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontFamily: B.fontDisplay,
            fontSize: '1.02rem',
            fontWeight: 800,
            color: B.ink,
            flex: 1,
            minWidth: 0,
          }}
        >
          {title}
        </span>
        {badge}
        <span
          style={{
            color: B.mute,
            fontWeight: 800,
            fontSize: '0.85rem',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
          ▸
        </span>
      </button>
      {open && <div style={{ display: 'grid', gap: 18, marginTop: 12 }}>{children}</div>}
    </div>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────

const btnBase: CSSProperties = {
  border: 'none',
  cursor: 'pointer',
  fontFamily: B.fontBody,
  fontWeight: 700,
  borderRadius: B.pill,
  transition: 'filter 0.12s, transform 0.05s',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  whiteSpace: 'nowrap',
};

export function Btn({
  children,
  onClick,
  kind = 'primary',
  size = 'md',
  disabled,
  type = 'button',
  title,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: 'primary' | 'accent' | 'soft' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
  style?: CSSProperties;
}) {
  const kinds: Record<string, CSSProperties> = {
    primary: { background: B.primary, color: '#fff' },
    accent: { background: B.accent, color: '#fff' },
    soft: { background: B.primarySoft, color: B.primaryDeep },
    ghost: { background: 'transparent', color: B.inkSoft, border: `1.5px solid ${B.rule}` },
    danger: { background: B.redSoft, color: B.red },
  };
  const sizes: Record<string, CSSProperties> = {
    sm: { fontSize: '0.78rem', padding: '6px 13px' },
    md: { fontSize: '0.86rem', padding: '9px 18px' },
    lg: { fontSize: '0.95rem', padding: '12px 24px' },
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...btnBase,
        ...kinds[kind],
        ...sizes[size],
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** A link that looks and behaves like a Btn.
 *
 *  Text/email actions are real navigations (sms:, mailto:), so they must
 *  be anchors — and an anchor must never wrap a <button>: nested
 *  interactive elements break keyboard tabbing and read as two separate
 *  controls to a screen reader. This gives the anchor the button's look. */
export function LinkBtn({
  children,
  href,
  onClick,
  kind = 'primary',
  size = 'sm',
  title,
  style,
}: {
  children: ReactNode;
  href: string;
  onClick?: () => void;
  kind?: 'primary' | 'accent' | 'soft' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  style?: CSSProperties;
}) {
  const kinds: Record<string, CSSProperties> = {
    primary: { background: B.primary, color: '#fff' },
    accent: { background: B.accent, color: '#fff' },
    soft: { background: B.primarySoft, color: B.primaryDeep },
    ghost: { background: 'transparent', color: B.inkSoft, border: `1.5px solid ${B.rule}` },
    danger: { background: B.redSoft, color: B.red },
  };
  const sizes: Record<string, CSSProperties> = {
    sm: { fontSize: '0.78rem', padding: '6px 13px' },
    md: { fontSize: '0.86rem', padding: '9px 18px' },
    lg: { fontSize: '0.95rem', padding: '12px 24px' },
  };
  return (
    <a
      href={href}
      title={title}
      onClick={onClick}
      style={{
        ...btnBase,
        ...kinds[kind],
        ...sizes[size],
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </a>
  );
}

// ── Chips & badges ────────────────────────────────────────────────────

export function Chip({
  children,
  tone = 'neutral',
  style,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'primary' | 'accent' | 'butter' | 'red' | 'green' | 'plum';
  style?: CSSProperties;
}) {
  const tones: Record<string, { bg: string; ink: string }> = {
    neutral: { bg: '#f2ede4', ink: B.inkSoft },
    primary: { bg: B.primarySoft, ink: B.primaryDeep },
    accent: { bg: B.accentSoft, ink: B.accentDeep },
    butter: { bg: B.butterSoft, ink: '#8a6414' },
    red: { bg: B.redSoft, ink: B.red },
    green: { bg: B.greenSoft, ink: B.green },
    plum: { bg: B.plumSoft, ink: B.plum },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        background: t.bg,
        color: t.ink,
        borderRadius: B.pill,
        fontSize: '0.72rem',
        fontWeight: 800,
        padding: '3px 10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function BalancePill({ balance }: { balance: number }) {
  const b = formatBalance(balance);
  const tone = b.tone === 'owe' ? 'red' : b.tone === 'credit' ? 'accent' : 'green';
  // On a phone the red pill already says "owed" — the word only costs the
  // kid's name the room it needs. "Paid up" has no number, so it stays.
  const [amount, ...rest] = b.label.split(' ');
  if (b.tone === 'zero') return <Chip tone={tone}>{b.label}</Chip>;
  return (
    <Chip tone={tone} style={{ whiteSpace: 'nowrap' }}>
      {amount}
      <span className="bs-phone-hide"> {rest.join(' ')}</span>
    </Chip>
  );
}

export function AllergyBadge({ allergies }: { allergies: string | null | undefined }) {
  if (!allergies?.trim()) return null;
  return (
    <Chip tone="red" style={{ border: `1px dashed ${B.red}` }} >
      ⚠️ {allergies.length > 34 ? allergies.slice(0, 32) + '…' : allergies}
    </Chip>
  );
}

export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const t = avatarTone(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: t.bg,
        color: t.ink,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.36,
        fontFamily: B.fontDisplay,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

// ── Phone safety net ──────────────────────────────────────────────────
//
// A stack of cards written as `display: grid` gets an implicit column
// sized `auto` — and an `auto` track flatly refuses to be narrower than
// the widest thing inside it. One table of families is ~600px wide at
// min-content, so on a 375px phone the track stayed 600px and the ENTIRE
// page scrolled sideways: half of every stat tile off the edge, the nav
// sliding under your thumb. Pinning the implicit column to minmax(0, 1fr)
// lets those stacks be exactly as wide as the screen, and a wide table
// scrolls inside its own box, which is what TableWrap was always for.
// Grids that name their own columns are untouched.
//
// Render this once inside any root that carries className="bs-shell".
export function PhoneSafety() {
  return (
    <style>{`
      .bs-shell *[style*="grid"] { grid-auto-columns: minmax(0, 1fr); }
      .bs-shell table { max-width: 100%; }
      .bs-shell { overflow-x: clip; }
      /* Columns that earn their place on a laptop but only cost you a
         sideways scroll on a phone. What they held moves under the name
         instead — see .bs-phone-only. */
      .bs-phone-only { display: none; }
      @media (max-width: 700px) {
        .bs-shell .bs-phone-hide { display: none !important; }
        .bs-shell .bs-phone-only { display: block; }
        .bs-shell th, .bs-shell td { padding-left: 8px; padding-right: 8px; }
        /* Only the folded-up detail line may break mid-word; a name broken
           across lines as "Tzi / pp / y" is worse than a little scrolling. */
        .bs-shell .bs-phone-only { overflow-wrap: anywhere; }

        /* The tabs used to wrap into three rows, so on a phone you met a
           wall of buttons and had to scroll past it before seeing any of
           the app. One row that slides sideways instead. */
        /* !important because the nav sets flex-wrap inline, and an inline
           style beats a stylesheet rule without it. */
        .bs-shell nav[aria-label="Main"] {
          flex-wrap: nowrap !important;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-snap-type: x proximity;
          margin: 0 -6px;
          padding: 0 6px 2px;
          -webkit-overflow-scrolling: touch;
        }
        .bs-shell nav[aria-label="Main"]::-webkit-scrollbar { display: none; }
        .bs-shell nav[aria-label="Main"] > a { flex: 0 0 auto; scroll-snap-align: start; }

        /* A card heading and its buttons don't fit side by side on a phone:
           the heading wrapped mid-phrase and the buttons ran off the edge.
           Give the buttons a line of their own. */
        .bs-shell .bs-sectiontitle { flex-wrap: wrap; align-items: flex-start; }
        .bs-shell .bs-sectiontitle > h2 { flex: 1 1 100%; }

        /* Five tiles at desktop proportions ran to about 600px on a phone
           — the whole first screen spent on numbers, with the register (the
           thing she actually opens the app for) below the fold. Same
           numbers, two thirds of the height. */
        .bs-shell .bs-stat { padding: 10px 11px !important; }
        .bs-shell .bs-stat > div:first-child { font-size: 1.22rem; }
        .bs-shell .bs-stat > div + div { margin-top: 2px; font-size: 0.7rem; }
        /* Three across rather than two: five tiles then take two rows
           instead of three, and the register clears the fold. */
        .bs-shell .bs-statrow {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 8px !important;
        }

        /* The register is the thing she taps every morning, so it has to be
           right on a phone above everything else. Each child gets a full
           row: name on the left taking whatever space is left, the two
           marks together on the right. They used to stack one above the
           other beside a narrow name pill, which read as broken. */
        .bs-shell .bs-regrow {
          width: 100%;
          flex-wrap: nowrap !important;
          gap: 8px !important;
        }
        .bs-shell .bs-regrow > a { flex: 1 1 auto; min-width: 0; }
        .bs-shell .bs-regrow > a > div { width: 100%; }
        /* Side by side, and big enough to hit. They are stacked on a
           desktop because the chips are small there; on a phone that put
           one mark above the other next to a full-width name, which looked
           like a mistake. The old targets were 2px tall on a screen you
           use one-handed with a child on your hip. */
        .bs-shell .bs-regmarks {
          flex-direction: row !important;
          gap: 6px !important;
          flex: 0 0 auto;
        }
        .bs-shell .bs-regmarks > button {
          min-width: 44px;
          min-height: 38px;
          font-size: 0.95rem !important;
        }

        /* The floating "tell us" bubble is a pill with a word in it, which
           on a phone is wide enough to sit on top of whatever button
           happens to be bottom-right — a Pay button, in the middle of the
           one table where that matters. Shrink it to the icon. */
        .bs-comment-fab {
          padding: 0 !important;
          width: 46px;
          height: 46px;
          justify-content: center;
        }
        /* By class, not :last-child — when there is an unread reply the
           badge is the last child, and hiding that is the opposite of
           what we want. */
        .bs-comment-fab .bs-comment-word { display: none; }
      }
    `}</style>
  );
}

// ── Tables ────────────────────────────────────────────────────────────

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        overflowX: 'auto',
        // Same reason as Card: without this, overflow-x has nothing to do
        // because the box never gets narrower than the table inside it.
        minWidth: 0,
        // Momentum scrolling, and don't steal the page's vertical swipe.
        WebkitOverflowScrolling: 'touch',
        background: B.card,
        borderRadius: B.radiusLg,
        border: `1px solid ${B.rule}`,
        boxShadow: B.shadowSoft,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>{children}</table>
    </div>
  );
}

export function Th({
  children,
  style,
  className,
}: {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <th
      className={className}
      style={{
        textAlign: 'left',
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: B.mute,
        fontWeight: 800,
        padding: '12px 14px',
        borderBottom: `1.5px solid ${B.rule}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  style,
  className,
}: {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <td className={className} style={{ padding: '11px 14px', borderBottom: `1px solid ${B.rule}`, color: B.ink, verticalAlign: 'middle', ...style }}>
      {children}
    </td>
  );
}

// ── Forms ─────────────────────────────────────────────────────────────

export const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 13px',
  borderRadius: B.radiusSm,
  border: `1.5px solid ${B.rule}`,
  background: '#fffdf9',
  color: B.ink,
  fontSize: '0.9rem',
  fontFamily: B.fontBody,
  outline: 'none',
};

export function Field({
  label,
  children,
  hint,
  style,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  style?: CSSProperties;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 13, ...style }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: B.inkSoft, marginBottom: 5, letterSpacing: '0.02em' }}>
        {label}
      </div>
      {children}
      {hint && <div style={{ fontSize: '0.7rem', color: B.mute, marginTop: 3 }}>{hint}</div>}
    </label>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────

export function Modal({
  title,
  onClose,
  children,
  width = 460,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(55, 40, 28, 0.4)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '7vh 16px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: B.card,
          borderRadius: B.radiusLg,
          boxShadow: B.shadow,
          width: '100%',
          maxWidth: width,
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontFamily: B.fontDisplay, fontWeight: 800, fontSize: '1.08rem', color: B.ink }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 'none',
              background: '#f2ede4',
              color: B.inkSoft,
              width: 30,
              height: 30,
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
