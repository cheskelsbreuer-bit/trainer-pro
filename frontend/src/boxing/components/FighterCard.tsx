// Fighter trading card — the unit on the Stable page. Portrait shape,
// boxing card aesthetic: big initials medallion, record splashed across
// the top as type-art, tier ribbon on the corner.
//
// Deliberately NOT a row in a table (which is what every CRUD app does
// and what the dojo's roster page uses). The grid of cards reads like a
// gym wall of fight posters or trading cards.

import { Link } from 'react-router-dom';
import {
  C,
  DISPLAY_FONT,
  recordString,
  computeWeightStatus,
  type Record,
  type FighterTier,
  type WeightClass,
  type Stance,
} from '../theme';

interface FighterCardProps {
  id: string;
  name: string;
  record: Record;
  tier: FighterTier;
  weight: WeightClass | null;
  stance: Stance | null;
  /** Current body weight in pounds — drives "on weight" indicator. */
  currentWeightLb?: number | null;
  /** Link target — defaults to "/stable" (no detail page yet); pass null to disable. */
  to?: string | null;
}

export function FighterCard({
  id,
  name,
  record,
  tier,
  weight,
  stance,
  currentWeightLb = null,
  to = '/stable',
}: FighterCardProps) {
  const weightStatus = computeWeightStatus(currentWeightLb, weight);
  const weightStatusColor =
    weightStatus.kind === 'on-weight'
      ? C.ok
      : weightStatus.kind === 'over'
        ? C.danger
        : weightStatus.kind === 'under'
          ? C.warn
          : C.textFaint;
  const inner = (
    <article
      className="relative aspect-[3/4] overflow-hidden flex flex-col"
      style={{
        background: C.ink,
        color: C.text,
        border: `1px solid ${C.rule}`,
      }}
    >
      {/* Tier ribbon — diagonal corner banner like a trading card grade */}
      <div
        className="absolute top-2 left-2 px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold z-10"
        style={{
          background: tier.color,
          color: '#FFFFFF',
          fontFamily: DISPLAY_FONT,
          letterSpacing: '0.15em',
        }}
      >
        {tier.label}
      </div>

      {/* Stance shorthand top-right */}
      {stance && (
        <div
          className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] uppercase tracking-widest z-10"
          style={{
            color: C.textDim,
            border: `1px solid ${C.rule}`,
            background: C.ink,
            fontFamily: DISPLAY_FONT,
          }}
          title={`Stance: ${stance}`}
        >
          {stance === 'orthodox' ? 'ORTH' : 'SP'}
        </div>
      )}

      {/* Big record as art — splashed across the upper third in faint paper */}
      <div className="px-4 pt-12 pb-2 text-center">
        <p
          className="font-black"
          style={{
            fontFamily: DISPLAY_FONT,
            color: C.beltGold,
            fontSize: 'clamp(2.5rem, 8vw, 4rem)',
            lineHeight: 0.9,
            letterSpacing: '0.02em',
          }}
        >
          {record.total === 0 ? '0' : recordString(record)}
        </p>
        {record.ko > 0 && (
          <p
            className="text-[10px] uppercase tracking-[0.3em] mt-1"
            style={{ color: C.beltGold }}
          >
            {record.ko} by knockout
          </p>
        )}
        {record.total === 0 && (
          <p
            className="text-[10px] uppercase tracking-[0.3em] mt-1"
            style={{ color: C.textFaint }}
          >
            no record yet
          </p>
        )}
      </div>

      {/* Initials medallion centerpiece */}
      <div className="flex-1 flex items-center justify-center px-4 -mt-2">
        <div
          className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center"
          style={{
            background: 'transparent',
            border: `2px solid ${C.red}`,
            borderRadius: '50%',
            fontFamily: DISPLAY_FONT,
            color: C.text,
            fontSize: '2.25rem',
            letterSpacing: '0.05em',
          }}
        >
          {initials(name)}
        </div>
      </div>

      {/* Name + weight class + on-weight status */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: C.rule, background: C.inkSoft }}
      >
        <p
          className="font-black uppercase truncate"
          style={{
            fontFamily: DISPLAY_FONT,
            color: C.text,
            fontSize: '1.25rem',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}
          title={name}
        >
          {name}
        </p>
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <p
            className="text-[10px] uppercase tracking-[0.3em] truncate"
            style={{ color: C.textDim }}
          >
            {weight?.label ?? 'No class'}
          </p>
          {(weightStatus.kind === 'on-weight' ||
            weightStatus.kind === 'over' ||
            weightStatus.kind === 'under') && (
            <span
              className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5"
              style={{
                color: weightStatusColor,
                border: `1px solid ${weightStatusColor}66`,
                fontFamily: DISPLAY_FONT,
              }}
              title={`Current: ${currentWeightLb} lb`}
            >
              {weightStatus.label}
            </span>
          )}
        </div>
      </div>
    </article>
  );

  if (!to) return inner;
  return (
    <Link to={to} className="block focus:outline-none focus:ring-2 focus:ring-offset-2" key={id}>
      {inner}
    </Link>
  );
}

function initials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
