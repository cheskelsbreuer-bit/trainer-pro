// ── The "Customize your app" switchboard ────────────────────────────
//
// This is Trainer Pro's signature control panel — the thing that makes
// the product "the most customizable." A coach turns capabilities
// (modules) on and off here, and their app reshapes to match.
//
// This is META-UI (the control panel), not coaching UI — so it's shared
// infrastructure rather than a per-template page. It styles neutrally
// and is meant to be dropped into any template's Settings.

import { useMemo } from 'react';
import {
  useEnabledModules,
  modulesForTemplate,
  type AppModule,
  type ModuleCategory,
} from '../lib/modules';

const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  core: 'Always on',
  nutrition: 'Nutrition coaching',
  martial: 'Martial arts',
  boxing: 'Boxing',
  studio: 'Group classes',
  exercise: 'Group exercise',
  private: '1-on-1 training',
  comms: 'Communication',
  growth: 'Growth & extras',
  crosscutting: 'Money & payments',
};

const CATEGORY_ORDER: ModuleCategory[] = [
  'core',
  'crosscutting',
  'nutrition',
  'studio',
  'martial',
  'boxing',
  'exercise',
  'private',
  'comms',
  'growth',
];

export function ModuleSwitchboard({
  templateSlug,
  accent = '#7C3AED',
}: {
  templateSlug: string | undefined;
  /** Template's accent color so the switchboard feels native. */
  accent?: string;
}) {
  const { isOn, toggle, isLoading, saving } = useEnabledModules(templateSlug);

  const offered = useMemo(() => modulesForTemplate(templateSlug), [templateSlug]);

  const byCategory = useMemo(() => {
    const map = new Map<ModuleCategory, AppModule[]>();
    for (const m of offered) {
      if (!map.has(m.category)) map.set(m.category, []);
      map.get(m.category)!.push(m);
    }
    return map;
  }, [offered]);

  const enabledCount = offered.filter((m) => isOn(m.id)).length;

  // Suggestions: modules with a `suggest` line that aren't on yet.
  const suggestions = offered.filter((m) => m.suggest && !isOn(m.id) && !m.core);

  if (isLoading) {
    return <p style={{ color: '#64748B', fontSize: '0.88rem' }}>Loading your app…</p>;
  }

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* Header line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <p style={{ fontSize: '0.86rem', color: '#475569', margin: 0 }}>
          <strong style={{ color: '#0F172A' }}>{enabledCount}</strong> features on. Flip anything
          on or off — your app reshapes instantly.
        </p>
        {saving && (
          <span style={{ fontSize: '0.78rem', color: accent, fontWeight: 600 }}>Saving…</span>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div
          style={{
            background: accent + '0E',
            border: `1px solid ${accent}33`,
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 18,
          }}
        >
          <p
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: accent,
              margin: '0 0 10px',
            }}
          >
            💡 Suggested for you
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.slice(0, 4).map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                    {m.icon} {m.name}
                  </span>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '1px 0 0' }}>
                    {m.suggest}
                  </p>
                </div>
                <button
                  onClick={() => toggle(m.id)}
                  style={{
                    flexShrink: 0,
                    background: accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Turn on
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {CATEGORY_ORDER.map((cat) => {
        const mods = byCategory.get(cat);
        if (!mods || mods.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: 18 }}>
            <p
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#94A3B8',
                margin: '0 0 8px',
              }}
            >
              {CATEGORY_LABELS[cat]}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 8,
              }}
            >
              {mods.map((m) => {
                const on = isOn(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    disabled={m.core}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      textAlign: 'left',
                      background: on ? accent + '0C' : '#fff',
                      border: `1px solid ${on ? accent + '55' : '#E5EAF2'}`,
                      borderRadius: 10,
                      padding: '11px 13px',
                      cursor: m.core ? 'default' : 'pointer',
                      opacity: m.core ? 0.85 : 1,
                      fontFamily: 'inherit',
                      transition: 'all 0.12s',
                    }}
                  >
                    <span style={{ fontSize: '1.15rem', lineHeight: 1, marginTop: 1 }}>{m.icon}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: '#0F172A',
                        }}
                      >
                        {m.name}
                        {m.core && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              letterSpacing: '0.06em',
                              color: '#94A3B8',
                              border: '1px solid #E5EAF2',
                              borderRadius: 5,
                              padding: '0 5px',
                            }}
                          >
                            CORE
                          </span>
                        )}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                        {m.description}
                      </span>
                    </span>
                    {/* Toggle pill */}
                    <span
                      style={{
                        flexShrink: 0,
                        width: 38,
                        height: 22,
                        borderRadius: 22,
                        background: on ? accent : '#CBD5E1',
                        position: 'relative',
                        transition: 'background 0.15s',
                        marginTop: 1,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: on ? 18 : 2,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.15s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 4 }}>
        Turn something off and its tab disappears from your app. Turn it back on anytime — your
        data is never deleted, just hidden.
      </p>
    </div>
  );
}
