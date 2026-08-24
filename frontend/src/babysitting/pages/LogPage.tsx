// Activity log — a quiet paper trail of everything that happened:
// kids added, payments, charges, away spells, settings tweaks, messages.
// Read-only by design; entries are written by the pages that act.

import { useMemo, useState } from 'react';
import { B, shortDate } from '../theme';
import { useBabysittingConfig, type LogEntry } from '../lib/config';
import { Card, SectionTitle, EmptyState, Chip } from '../components/ui';

type ChipTone = 'neutral' | 'primary' | 'accent' | 'butter' | 'red' | 'green' | 'plum';
type Filter = 'all' | LogEntry['category'];

const CATEGORIES: Array<{ key: LogEntry['category']; emoji: string; label: string; tone: ChipTone }> = [
  { key: 'kid', emoji: '🧸', label: 'Kids', tone: 'primary' },
  { key: 'payment', emoji: '💛', label: 'Payments', tone: 'green' },
  { key: 'charge', emoji: '🧾', label: 'Charges', tone: 'butter' },
  { key: 'away', emoji: '⏸', label: 'Away', tone: 'plum' },
  { key: 'settings', emoji: '⚙️', label: 'Settings', tone: 'neutral' },
  { key: 'message', emoji: '✉️', label: 'Messages', tone: 'accent' },
];

const SHOW_CAP = 200;

function categoryOf(key: LogEntry['category']): { emoji: string; label: string; tone: ChipTone } {
  return CATEGORIES.find((c) => c.key === key) ?? { emoji: '📌', label: key, tone: 'neutral' };
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function LogPage() {
  const cfg = useBabysittingConfig();
  const [filter, setFilter] = useState<Filter>('all');

  const log = useMemo<LogEntry[]>(() => cfg.data?.log ?? [], [cfg.data]);
  const filtered = useMemo<LogEntry[]>(
    () => (filter === 'all' ? log : log.filter((e) => e.category === filter)),
    [log, filter],
  );
  const shown = filtered.slice(0, SHOW_CAP);

  if (cfg.isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Opening the log…</div>;
  }

  if (!log.length) {
    return (
      <Card pad={0}>
        <EmptyState
          emoji="📜"
          title="Nothing in the log yet"
          body="Every change you make — adding kids, billing, recording payments — leaves a little note here, so you can always look back."
        />
      </Card>
    );
  }

  const filterBtn = (key: Filter, label: string, emoji?: string) => {
    const on = filter === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setFilter(key)}
        style={{
          border: 'none',
          cursor: 'pointer',
          borderRadius: B.pill,
          padding: '7px 13px',
          fontSize: '0.78rem',
          fontWeight: 800,
          fontFamily: B.fontDisplay,
          background: on ? B.accent : '#f2ede4',
          color: on ? '#fff' : B.inkSoft,
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        {emoji ? `${emoji} ${label}` : label}
      </button>
    );
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <SectionTitle style={{ margin: '4px 2px 0' }}>What happened lately</SectionTitle>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {filterBtn('all', `All (${log.length})`)}
        {CATEGORIES.map((c) => filterBtn(c.key, c.label, c.emoji))}
      </div>

      {shown.length ? (
        <Card pad={0}>
          {shown.map((e, i) => {
            const cat = categoryOf(e.category);
            return (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 16px',
                  borderTop: i ? `1px solid ${B.rule}` : 'none',
                  background: i % 2 ? B.rowAlt : 'transparent',
                }}
              >
                <Chip tone={cat.tone} style={{ minWidth: 96, justifyContent: 'center' }}>
                  {cat.emoji} {cat.label}
                </Chip>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.87rem', color: B.ink }}>{e.action}</div>
                  {e.details && (
                    <div style={{ fontSize: '0.76rem', color: B.mute, marginTop: 1 }}>{e.details}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: B.inkSoft }}>{shortDate(e.ts)}</div>
                  <div style={{ fontSize: '0.7rem', color: B.mute }}>{timeOf(e.ts)}</div>
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <Card pad={0}>
          <EmptyState
            emoji="🌿"
            title="Nothing here for that filter"
            body="No entries of that kind yet — try another category, or All."
          />
        </Card>
      )}

      {filtered.length > SHOW_CAP && (
        <div style={{ textAlign: 'center', color: B.mute, fontSize: '0.78rem' }}>
          Showing the latest {SHOW_CAP} of {filtered.length} entries.
        </div>
      )}
    </div>
  );
}
