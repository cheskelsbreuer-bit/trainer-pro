// The W-L-D chip — appears on every fighter row, profile, and fight card.
// Designed to read at a glance, like a real boxing record: "12-1-0 (8 KO)".
// Three-digit segments are color-coded: wins gold, losses red, draws muted.

import { BOXING_COLORS, type FighterRecord as Record } from '../theme';

interface Props {
  record: Record;
  size?: 'sm' | 'md' | 'lg';
  /** Show "(N KO)" suffix when wins by knockout > 0. Default true. */
  showKnockouts?: boolean;
}

export function FighterRecordChip({ record, size = 'sm', showKnockouts = true }: Props) {
  const fontSize = size === 'lg' ? 18 : size === 'md' ? 14 : 12;
  const numSize = size === 'lg' ? 22 : size === 'md' ? 16 : 13;

  return (
    <span
      className="inline-flex items-center gap-1 font-mono"
      style={{ fontSize, color: BOXING_COLORS.textSecondary }}
      title={`${record.wins} wins · ${record.losses} losses · ${record.draws} draws${record.knockouts > 0 ? ` · ${record.knockouts} by knockout` : ''}`}
    >
      <span
        className="font-bold"
        style={{ color: BOXING_COLORS.gold, fontSize: numSize }}
      >
        {record.wins}
      </span>
      <span style={{ opacity: 0.5 }}>–</span>
      <span
        className="font-bold"
        style={{ color: BOXING_COLORS.red, fontSize: numSize }}
      >
        {record.losses}
      </span>
      <span style={{ opacity: 0.5 }}>–</span>
      <span
        className="font-bold"
        style={{ color: BOXING_COLORS.textMuted, fontSize: numSize }}
      >
        {record.draws}
      </span>
      {showKnockouts && record.knockouts > 0 && (
        <span
          className="ml-1 text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: BOXING_COLORS.gold }}
        >
          {record.knockouts} KO
        </span>
      )}
    </span>
  );
}

/** Compact tier badge — used inline next to fighter names. */
export function TierBadge({ tier }: { tier: { id: string; label: string; color: string } }) {
  return (
    <span
      className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded"
      style={{
        background: `${tier.color}26`, // ~15% alpha
        color: tier.color,
        border: `1px solid ${tier.color}55`,
      }}
    >
      {tier.label}
    </span>
  );
}
