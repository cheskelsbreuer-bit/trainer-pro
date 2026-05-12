// Boxing app primitives — used by every page so the visual language
// stays consistent (red corner / blue corner / championship gold).

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { BOXING_COLORS } from '../theme';

const HEADER_FONT =
  "'Bebas Neue', 'Oswald', 'Arial Narrow', system-ui, sans-serif";

/** Heroic page header with a thin red/blue corner accent under the title. */
export function BoxingPageHeader({
  eyebrow,
  title,
  subtitle,
  corner = 'red',
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  corner?: 'red' | 'blue' | 'gold' | 'split';
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          {eyebrow && (
            <p
              className="text-xs uppercase tracking-[0.25em] font-semibold mb-1"
              style={{ color: BOXING_COLORS.gold }}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className="text-3xl sm:text-5xl font-black leading-none"
            style={{
              fontFamily: HEADER_FONT,
              color: BOXING_COLORS.textPrimary,
              letterSpacing: '0.02em',
            }}
          >
            {title}
          </h1>
        </div>
        {action}
      </div>
      {/* Corner-accent line — red, blue, or split between them. */}
      <div
        className="mt-3 h-[3px] rounded-sm"
        style={{
          background:
            corner === 'split'
              ? `linear-gradient(to right, ${BOXING_COLORS.red} 0%, ${BOXING_COLORS.red} 50%, ${BOXING_COLORS.blue} 50%, ${BOXING_COLORS.blue} 100%)`
              : corner === 'blue'
                ? BOXING_COLORS.blue
                : corner === 'gold'
                  ? BOXING_COLORS.gold
                  : BOXING_COLORS.red,
          width: 96,
        }}
      />
      {subtitle && (
        <p
          className="text-sm mt-3 max-w-2xl"
          style={{ color: BOXING_COLORS.textSecondary }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Card surface with an optional left accent (red corner, blue corner, gold). */
export function BoxingCard({
  accent,
  className = '',
  children,
}: {
  accent?: 'red' | 'blue' | 'gold' | 'none';
  className?: string;
  children: React.ReactNode;
}) {
  const accentColor =
    accent === 'red'
      ? BOXING_COLORS.red
      : accent === 'blue'
        ? BOXING_COLORS.blue
        : accent === 'gold'
          ? BOXING_COLORS.gold
          : null;
  return (
    <div
      className={`rounded-md border ${className}`}
      style={{
        background: BOXING_COLORS.bgPanel,
        borderColor: BOXING_COLORS.divider,
        borderLeftColor: accentColor ?? BOXING_COLORS.divider,
        borderLeftWidth: accentColor ? 3 : 1,
      }}
    >
      {children}
    </div>
  );
}

export function BoxingSectionHeader({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 border-b"
      style={{ borderColor: BOXING_COLORS.divider }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span style={{ color: BOXING_COLORS.gold }}>{icon}</span>}
        <h2
          className="font-bold uppercase tracking-wider text-sm"
          style={{
            fontFamily: HEADER_FONT,
            color: BOXING_COLORS.textPrimary,
            letterSpacing: '0.08em',
          }}
        >
          {title}
        </h2>
        {hint && (
          <span className="text-xs" style={{ color: BOXING_COLORS.textMuted }}>
            {hint}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

/** Stat tile — big number, screaming uppercase label. */
export function BoxingStatTile({
  label,
  value,
  sublabel,
  emphasis = 'normal',
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  emphasis?: 'normal' | 'gold' | 'red' | 'blue';
}) {
  const valueColor =
    emphasis === 'gold'
      ? BOXING_COLORS.gold
      : emphasis === 'red'
        ? BOXING_COLORS.red
        : emphasis === 'blue'
          ? BOXING_COLORS.blue
          : BOXING_COLORS.textPrimary;
  return (
    <div
      className="rounded-md p-4 border"
      style={{
        background: BOXING_COLORS.bgPanel,
        borderColor: BOXING_COLORS.divider,
      }}
    >
      <p
        className="text-xs uppercase tracking-[0.2em] font-semibold mb-2"
        style={{ color: BOXING_COLORS.textMuted }}
      >
        {label}
      </p>
      <p
        className="leading-none"
        style={{
          fontFamily: HEADER_FONT,
          color: valueColor,
          fontSize: 40,
          letterSpacing: '0.02em',
        }}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-xs mt-2" style={{ color: BOXING_COLORS.textSecondary }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

export function BoxingButton({
  children,
  onClick,
  type = 'button',
  variant = 'red',
  className = '',
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'red' | 'blue' | 'gold' | 'ghost';
  className?: string;
  disabled?: boolean;
}) {
  const base =
    'inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  if (variant === 'gold') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${base} ${className}`}
        style={{ background: BOXING_COLORS.gold, color: BOXING_COLORS.onGold }}
      >
        {children}
      </button>
    );
  }
  if (variant === 'blue') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${base} ${className} hover:opacity-90`}
        style={{ background: BOXING_COLORS.blue, color: BOXING_COLORS.onBlue }}
      >
        {children}
      </button>
    );
  }
  if (variant === 'ghost') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${base} ${className}`}
        style={{
          background: 'transparent',
          color: BOXING_COLORS.textPrimary,
          border: `1px solid ${BOXING_COLORS.divider}`,
        }}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${className} hover:opacity-90`}
      style={{ background: BOXING_COLORS.red, color: BOXING_COLORS.onRed }}
    >
      {children}
    </button>
  );
}

/** Back / Home bar — same UX as the dojo. Auto-hides on the gym home page. */
export function BoxingBackBar() {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === '/') return null;
  return (
    <div className="flex items-center gap-2 mb-4 text-xs uppercase tracking-wider">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors hover:opacity-90"
        style={{
          background: BOXING_COLORS.bgPanel,
          border: `1px solid ${BOXING_COLORS.divider}`,
          color: BOXING_COLORS.textSecondary,
        }}
      >
        <ArrowLeft size={13} /> Back
      </button>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors hover:opacity-90"
        style={{
          background: BOXING_COLORS.bgPanel,
          border: `1px solid ${BOXING_COLORS.divider}`,
          color: BOXING_COLORS.textSecondary,
        }}
      >
        <Home size={13} /> Gym
      </Link>
    </div>
  );
}

/** Page wrapper. */
export function BoxingPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 sm:px-8 py-8 max-w-7xl mx-auto">
      <BoxingBackBar />
      {children}
    </div>
  );
}
