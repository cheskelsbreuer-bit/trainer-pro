// Shared dojo-app primitives. Every dojo page composes from these so the
// dark theme + crimson/gold accents stay consistent without a global CSS
// override.

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { DOJO_COLORS } from '../theme';

const HEADER_FONT =
  "'Bebas Neue', 'Oswald', 'Arial Narrow', system-ui, sans-serif";

/** Dojo-specific page header — heroic Bebas Neue type, gold eyebrow line,
 *  optional right-side action (e.g. "Add student" button). */
export function DojoPageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
      <div>
        {eyebrow && (
          <p
            className="text-xs uppercase tracking-[0.25em] font-semibold mb-1"
            style={{ color: DOJO_COLORS.gold }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="text-3xl sm:text-4xl font-black leading-none"
          style={{
            fontFamily: HEADER_FONT,
            color: DOJO_COLORS.textPrimary,
            letterSpacing: '0.02em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-sm mt-2 max-w-2xl"
            style={{ color: DOJO_COLORS.textSecondary }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Card surface for the dojo. Slightly raised panel with a hairline border
 *  and optional crimson accent on the left edge. */
export function DojoCard({
  accent,
  className = '',
  children,
}: {
  accent?: 'brand' | 'gold' | 'none';
  className?: string;
  children: React.ReactNode;
}) {
  const accentColor =
    accent === 'brand'
      ? DOJO_COLORS.brand
      : accent === 'gold'
        ? DOJO_COLORS.gold
        : null;
  return (
    <div
      className={`rounded-md border ${className}`}
      style={{
        background: DOJO_COLORS.bgPanel,
        borderColor: DOJO_COLORS.divider,
        borderLeftColor: accentColor ?? DOJO_COLORS.divider,
        borderLeftWidth: accentColor ? 3 : 1,
      }}
    >
      {children}
    </div>
  );
}

/** Section header strip used INSIDE cards (table caption, "Today's promotion watch", etc.) */
export function DojoSectionHeader({
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
      style={{ borderColor: DOJO_COLORS.divider }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span style={{ color: DOJO_COLORS.gold }}>{icon}</span>}
        <h2
          className="font-bold uppercase tracking-wider text-sm"
          style={{
            fontFamily: HEADER_FONT,
            color: DOJO_COLORS.textPrimary,
            letterSpacing: '0.08em',
          }}
        >
          {title}
        </h2>
        {hint && (
          <span
            className="text-xs"
            style={{ color: DOJO_COLORS.textMuted }}
          >
            {hint}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

/** Big numeric tile used in the dashboard stats row. Designed for impact
 *  reads at a glance — "32 STUDENTS UP FOR PROMOTION" etc. */
export function DojoStatTile({
  label,
  value,
  sublabel,
  emphasis = 'normal',
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  emphasis?: 'normal' | 'gold' | 'brand';
}) {
  const valueColor =
    emphasis === 'gold'
      ? DOJO_COLORS.gold
      : emphasis === 'brand'
        ? DOJO_COLORS.brand
        : DOJO_COLORS.textPrimary;
  return (
    <div
      className="rounded-md p-4 border"
      style={{
        background: DOJO_COLORS.bgPanel,
        borderColor: DOJO_COLORS.divider,
      }}
    >
      <p
        className="text-xs uppercase tracking-[0.2em] font-semibold mb-2"
        style={{ color: DOJO_COLORS.textMuted }}
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
        <p
          className="text-xs mt-2"
          style={{ color: DOJO_COLORS.textSecondary }}
        >
          {sublabel}
        </p>
      )}
    </div>
  );
}

/** Dark-theme primary button — crimson fill. */
export function DojoButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost' | 'gold';
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
        style={{
          background: DOJO_COLORS.gold,
          color: DOJO_COLORS.onGold,
        }}
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
          color: DOJO_COLORS.textPrimary,
          border: `1px solid ${DOJO_COLORS.divider}`,
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
      style={{ background: DOJO_COLORS.brand, color: '#FFF' }}
    >
      {children}
    </button>
  );
}

/** Back button shown at the top of every non-home dojo page. Goes one step
 *  back in browser history; also exposes a Home shortcut to the dashboard. */
export function DojoBackBar({
  to,
  homeLabel = 'Dojo',
}: {
  /** Optional override for the back destination. Defaults to history(-1). */
  to?: string;
  /** Text next to the Home icon (defaults to "Dojo"). */
  homeLabel?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // On the home route this would be redundant — render nothing.
  if (location.pathname === '/') return null;
  return (
    <div className="flex items-center gap-2 mb-4 text-xs uppercase tracking-wider">
      <button
        onClick={() => (to ? navigate(to) : navigate(-1))}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors hover:opacity-90"
        style={{
          background: DOJO_COLORS.bgPanel,
          border: `1px solid ${DOJO_COLORS.divider}`,
          color: DOJO_COLORS.textSecondary,
        }}
      >
        <ArrowLeft size={13} /> Back
      </button>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors hover:opacity-90"
        style={{
          background: DOJO_COLORS.bgPanel,
          border: `1px solid ${DOJO_COLORS.divider}`,
          color: DOJO_COLORS.textSecondary,
        }}
      >
        <Home size={13} /> {homeLabel}
      </Link>
    </div>
  );
}

/** Page container — keeps consistent padding + max width for dojo pages.
 *  Automatically renders the back/home bar on every page except the
 *  dashboard, so no individual page has to remember to include it. */
export function DojoPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 sm:px-8 py-8 max-w-7xl mx-auto">
      <DojoBackBar />
      {children}
    </div>
  );
}
