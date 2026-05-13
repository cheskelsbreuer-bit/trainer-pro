// The fight poster. Used as the dashboard hero AND as the page-by-page
// card on the Fight Night page. Modeled on a real boxing event poster:
//   - Massive event date stacked top-left
//   - Two fighters side-by-side, name + record + corner color
//   - Huge "VS." in the center as type-as-art
//   - Venue at the bottom
//
// Deliberately NOT a generic card with a colored left border (the
// dojo's pattern). The shape is portrait-tall, the type does the
// decoration, and the corner stripes (red left / blue right) ARE
// the visual story.

import { C, DISPLAY_FONT, recordString, type Record } from '../theme';

interface PosterFighter {
  name: string;
  record?: Record;
  tier?: { label: string; color: string };
  weightLabel?: string | null;
  stance?: 'orthodox' | 'southpaw' | null;
  // Tale-of-the-tape stats. Any subset is fine — comparison row only
  // renders metrics where at least ONE corner has a value.
  heightIn?: number | null;
  reachIn?: number | null;
  age?: number | null;
  weightLb?: number | null;
}

interface FightPosterProps {
  /** Red corner fighter — typically "your fighter" in your stable. */
  red: PosterFighter;
  /** Blue corner — usually the opponent. Optional (TBD before booked). */
  blue?: PosterFighter | null;
  date: Date | string;
  venue?: string | null;
  /** Optional label above the date — e.g., "FIGHT NIGHT", "MAIN EVENT", "TITLE BOUT". */
  banner?: string;
  /** "FIGHT NIGHT" hero version vs compact stack-version on Fight Night page. */
  variant?: 'hero' | 'card';
}

export function FightPoster({
  red,
  blue,
  date,
  venue,
  banner = 'NEXT BOUT',
  variant = 'hero',
}: FightPosterProps) {
  const dt = typeof date === 'string' ? new Date(date) : date;
  const isHero = variant === 'hero';

  return (
    <article
      className="relative overflow-hidden"
      style={{
        background: C.ink,
        color: C.text,
        border: `1px solid ${C.rule}`,
      }}
    >
      {/* The corners — literal red/blue stripes top and bottom edges.
          They sandwich the poster like real ring ropes. */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ background: C.red }}
        aria-hidden
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5"
        style={{ background: C.blueCorner }}
        aria-hidden
      />

      <div className={`px-6 sm:px-10 ${isHero ? 'py-8 sm:py-10' : 'py-6'}`}>
        {/* Banner */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <span
            aria-hidden
            className="h-px flex-1 max-w-[80px]"
            style={{ background: C.rule }}
          />
          <span
            className="text-xs uppercase font-bold tracking-[0.4em]"
            style={{ color: C.red }}
          >
            {banner}
          </span>
          <span
            aria-hidden
            className="h-px flex-1 max-w-[80px]"
            style={{ background: C.rule }}
          />
        </div>

        {/* Date — newspaper masthead style, all caps */}
        <p
          className="text-center font-black uppercase mb-1"
          style={{
            fontFamily: DISPLAY_FONT,
            color: C.text,
            fontSize: isHero ? 'clamp(2.5rem, 5vw, 4.5rem)' : '1.75rem',
            letterSpacing: '0.05em',
            lineHeight: 0.9,
          }}
        >
          {dt.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <p
          className="text-center text-xs uppercase tracking-[0.3em]"
          style={{ color: C.textDim }}
        >
          {dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </p>

        {/* The matchup — three columns: red / VS / blue */}
        <div className={`grid grid-cols-[1fr_auto_1fr] items-center ${isHero ? 'mt-8' : 'mt-5'} gap-2 sm:gap-6`}>
          <Corner side="red" fighter={red} isHero={isHero} />
          <div
            className="text-center select-none"
            style={{
              fontFamily: DISPLAY_FONT,
              color: C.red,
              fontSize: isHero ? 'clamp(3rem, 6vw, 5rem)' : '2.5rem',
              letterSpacing: '0.02em',
              lineHeight: 0.85,
            }}
            aria-hidden
          >
            VS
          </div>
          <Corner side="blue" fighter={blue} isHero={isHero} />
        </div>

        {/* Tale of the tape — rendered when at least one corner has stats */}
        <TaleOfTape red={red} blue={blue ?? null} isHero={isHero} />

        {/* Venue */}
        {venue && (
          <p
            className="text-center mt-6 text-xs uppercase tracking-[0.3em]"
            style={{ color: C.textDim }}
          >
            {venue}
          </p>
        )}
      </div>
    </article>
  );
}

function TaleOfTape({
  red,
  blue,
  isHero,
}: {
  red: PosterFighter;
  blue: PosterFighter | null;
  isHero: boolean;
}) {
  // What metrics are worth showing?
  const metrics: { key: 'height' | 'reach' | 'age' | 'weight'; label: string }[] = [
    { key: 'height', label: 'Height' },
    { key: 'reach', label: 'Reach' },
    { key: 'age', label: 'Age' },
    { key: 'weight', label: 'Weight' },
  ];

  const rows = metrics
    .map((m) => {
      const r = readMetric(red, m.key);
      const b = readMetric(blue, m.key);
      return { ...m, r, b, hasAny: r !== null || b !== null };
    })
    .filter((row) => row.hasAny);

  if (rows.length === 0) return null;

  return (
    <div
      className={`mx-auto ${isHero ? 'max-w-xl mt-6' : 'max-w-lg mt-5'} border-t border-b py-3`}
      style={{ borderColor: C.rule }}
    >
      <p
        className="text-center text-[10px] uppercase tracking-[0.4em] mb-2"
        style={{ color: C.beltGold }}
      >
        Tale of the tape
      </p>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td
                className="py-1 text-right font-mono"
                style={{
                  color: row.r !== null ? C.text : C.textFaint,
                  width: '38%',
                  fontFamily: DISPLAY_FONT,
                  fontSize: isHero ? '1.125rem' : '0.95rem',
                  letterSpacing: '0.05em',
                }}
              >
                {row.r ?? '—'}
              </td>
              <td
                className="text-center text-[10px] uppercase tracking-[0.3em] px-2"
                style={{ color: C.textDim, width: '24%' }}
              >
                {row.label}
              </td>
              <td
                className="py-1 text-left font-mono"
                style={{
                  color: row.b !== null ? C.text : C.textFaint,
                  width: '38%',
                  fontFamily: DISPLAY_FONT,
                  fontSize: isHero ? '1.125rem' : '0.95rem',
                  letterSpacing: '0.05em',
                }}
              >
                {row.b ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function readMetric(
  f: PosterFighter | null,
  key: 'height' | 'reach' | 'age' | 'weight',
): string | null {
  if (!f) return null;
  if (key === 'height' && f.heightIn != null) {
    const ft = Math.floor(f.heightIn / 12);
    const inch = f.heightIn % 12;
    return `${ft}'${inch}"`;
  }
  if (key === 'reach' && f.reachIn != null) return `${f.reachIn}"`;
  if (key === 'age' && f.age != null) return `${f.age} yrs`;
  if (key === 'weight' && f.weightLb != null) return `${f.weightLb} lb`;
  return null;
}

function Corner({
  side,
  fighter,
  isHero,
}: {
  side: 'red' | 'blue';
  fighter: PosterFighter | null | undefined;
  isHero: boolean;
}) {
  const cornerColor = side === 'red' ? C.red : C.blueCorner;
  return (
    <div className="min-w-0 text-center">
      {/* Corner label, screaming caps */}
      <p
        className="text-[10px] uppercase font-bold tracking-[0.4em] mb-2"
        style={{ color: cornerColor }}
      >
        {side === 'red' ? 'Red Corner' : 'Blue Corner'}
      </p>
      {fighter ? (
        <>
          <p
            className="font-black uppercase break-words"
            style={{
              fontFamily: DISPLAY_FONT,
              color: C.text,
              fontSize: isHero ? 'clamp(1.5rem, 3vw, 2.5rem)' : '1.25rem',
              lineHeight: 0.95,
              letterSpacing: '0.02em',
            }}
          >
            {fighter.name}
          </p>
          {fighter.record && fighter.record.total > 0 && (
            <p
              className="font-mono mt-3"
              style={{
                color: C.beltGold,
                fontSize: isHero ? '1.25rem' : '1rem',
                letterSpacing: '0.05em',
              }}
            >
              {recordString(fighter.record)}
              {fighter.record.ko > 0 && (
                <span
                  className="ml-1.5 text-[10px] uppercase tracking-widest font-bold"
                  style={{ color: C.beltGold }}
                >
                  {fighter.record.ko} KO
                </span>
              )}
            </p>
          )}
          <div className="mt-2 flex items-center justify-center gap-2 flex-wrap text-[10px] uppercase tracking-widest" style={{ color: C.textDim }}>
            {fighter.tier && (
              <span
                className="px-1.5 py-0.5"
                style={{
                  border: `1px solid ${fighter.tier.color}`,
                  color: fighter.tier.color,
                }}
              >
                {fighter.tier.label}
              </span>
            )}
            {fighter.weightLabel && <span>· {fighter.weightLabel}</span>}
            {fighter.stance && <span>· {fighter.stance}</span>}
          </div>
        </>
      ) : (
        <p
          className="font-black uppercase italic"
          style={{
            fontFamily: DISPLAY_FONT,
            color: C.textFaint,
            fontSize: isHero ? '2rem' : '1.25rem',
            letterSpacing: '0.05em',
          }}
        >
          TBA
        </p>
      )}
    </div>
  );
}
