// The visual representation of a student's belt. Looks like an actual belt:
// a horizontal bar in the belt's color with a darker tip (the "knot end")
// and — for dan ranks — gold stripes for prestige.

import { DOJO_COLORS, type Belt } from '../theme';

interface BeltChipProps {
  belt: Belt | null;
  /** Size of the chip. Default 'sm' (in tables); 'lg' on profile pages. */
  size?: 'sm' | 'md' | 'lg';
  /** Show the belt's label next to the visual? Default true. */
  showLabel?: boolean;
  /** Optional override label. */
  label?: string;
}

export function BeltChip({ belt, size = 'sm', showLabel = true, label }: BeltChipProps) {
  if (!belt) {
    return (
      <span
        className="inline-flex items-center gap-2 italic"
        style={{ color: DOJO_COLORS.textMuted, fontSize: size === 'lg' ? 14 : 12 }}
      >
        no rank
      </span>
    );
  }

  const sizes = {
    sm: { w: 32, h: 8, tip: 6, font: 11 },
    md: { w: 44, h: 10, tip: 8, font: 12 },
    lg: { w: 72, h: 14, tip: 12, font: 14 },
  }[size];

  const isWhite = belt.color === '#F5F5F4' || belt.color.toLowerCase() === '#ffffff';
  // White belts get a thin border so they're visible on the dark page.
  const beltBorder = isWhite ? `1px solid ${DOJO_COLORS.divider}` : 'none';

  return (
    <span className="inline-flex items-center gap-2 align-middle">
      <span
        aria-hidden
        className="rounded-sm relative overflow-hidden shrink-0"
        style={{
          width: sizes.w,
          height: sizes.h,
          background: belt.color,
          border: beltBorder,
          boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.25)',
        }}
      >
        {/* Knot end — darker stripe at the right tip to evoke a tied belt */}
        <span
          className="absolute right-0 top-0 bottom-0"
          style={{
            width: sizes.tip,
            background: 'rgba(0,0,0,0.32)',
          }}
        />
        {/* Dan ranks get a gold stripe to denote prestige */}
        {belt.dan && (
          <span
            className="absolute left-0 right-0"
            style={{
              top: sizes.h / 2 - 1,
              height: 2,
              background: DOJO_COLORS.gold,
              opacity: 0.92,
            }}
          />
        )}
      </span>
      {showLabel && (
        <span
          className="font-medium tracking-wide"
          style={{ color: DOJO_COLORS.textPrimary, fontSize: sizes.font }}
        >
          {label ?? belt.label}
        </span>
      )}
    </span>
  );
}
