// In-app design editor — change the app's look ANYTIME (not just at
// signup) and see it apply live across the whole app immediately. Auto-
// saves to the coach's account. This is the in-app twin of the
// onboarding "Design your app" step.

import { useEffect, useRef, useState } from 'react';
import {
  useAppearance,
  applyAppearance,
  PALETTES,
  FONT_PAIRS,
  type AppearanceConfig,
  type Corners,
  type Density,
  type NavLayout,
} from '../lib/appearance';

export function AppearanceEditor({ templateSlug }: { templateSlug: string | undefined }) {
  const { appearance, isLoading, save } = useAppearance(templateSlug);
  const [draft, setDraft] = useState<AppearanceConfig>(appearance);
  const seeded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed the draft once the saved config loads.
  useEffect(() => {
    if (!isLoading && !seeded.current) {
      setDraft(appearance);
      seeded.current = true;
    }
  }, [isLoading, appearance]);

  // Live-apply on every change so the whole app re-themes instantly,
  // and debounce-save to the DB so we don't hammer it on color drags.
  function update(next: AppearanceConfig) {
    setDraft(next);
    applyAppearance(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save.mutate(next), 500);
  }
  function set<K extends keyof AppearanceConfig>(k: K, v: AppearanceConfig[K]) {
    update({ ...draft, [k]: v });
  }

  if (isLoading) return <p style={{ color: '#64748B', fontSize: '0.88rem' }}>Loading…</p>;

  const dark = draft.themeMode === 'dark';
  const font = FONT_PAIRS.find((f) => f.id === draft.fontId) ?? FONT_PAIRS[0];
  const radius = draft.corners === 'sharp' ? '4px' : draft.corners === 'pill' ? '18px' : '12px';

  return (
    <div>
      <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: 16 }}>
        Change anything below — it applies to your whole app instantly and saves automatically.
      </p>

      {/* Live preview */}
      <div
        style={{
          marginBottom: 22,
          overflow: 'hidden',
          borderRadius: radius,
          border: `1px solid ${dark ? '#334155' : '#e5eaf2'}`,
          background: dark ? '#0f172a' : '#f7f8fb',
          maxWidth: 420,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: dark ? '#1e293b' : '#fff',
            borderBottom: `1px solid ${dark ? '#334155' : '#e5eaf2'}`,
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: radius === '18px' ? 12 : 6,
              background: `linear-gradient(135deg, ${draft.primary}, ${draft.accent})`,
            }}
          />
          <span style={{ fontFamily: font.display, fontWeight: 800, color: dark ? '#f1f5f9' : '#0f172a' }}>
            Your App
          </span>
          <span style={{ marginLeft: 'auto', color: draft.primary, fontWeight: 700, fontSize: '0.8rem', fontFamily: font.body }}>
            Dashboard
          </span>
        </div>
        <div style={{ padding: draft.density === 'compact' ? 12 : 18 }}>
          <button
            type="button"
            style={{
              background: draft.primary,
              color: '#fff',
              border: 'none',
              borderRadius: draft.corners === 'pill' ? 999 : radius,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: '0.84rem',
              fontFamily: font.body,
              cursor: 'default',
            }}
          >
            Primary button
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Row label="Light or dark">
          <Seg options={[{ v: 'light', l: '☀️ Light' }, { v: 'dark', l: '🌙 Dark' }]} value={draft.themeMode} onChange={(v) => set('themeMode', v as AppearanceConfig['themeMode'])} />
        </Row>

        <Row label="Color palette">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PALETTES.map((p) => {
              const on = draft.paletteId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.name}
                  onClick={() => update({ ...draft, paletteId: p.id, primary: p.primary, accent: p.accent })}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: on ? '3px solid #0f172a' : '2px solid #fff',
                    outline: on ? '2px solid #cbd5e1' : 'none',
                    background: `linear-gradient(135deg, ${p.primary} 60%, ${p.accent} 60%)`,
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.78rem', color: '#64748b' }}>
              Primary
              <input type="color" value={draft.primary} onChange={(e) => update({ ...draft, paletteId: 'custom', primary: e.target.value })} style={{ width: 44, height: 30, border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }} />
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.78rem', color: '#64748b' }}>
              Accent
              <input type="color" value={draft.accent} onChange={(e) => update({ ...draft, paletteId: 'custom', accent: e.target.value })} style={{ width: 44, height: 30, border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }} />
            </label>
          </div>
        </Row>

        <Row label="Font style">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {FONT_PAIRS.map((f) => {
              const on = draft.fontId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => set('fontId', f.id)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 10,
                    border: `1px solid ${on ? '#7c3aed' : '#e5eaf2'}`,
                    background: on ? '#f5f3ff' : '#fff',
                    padding: 11,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'block', fontWeight: 800, color: '#0f172a', fontFamily: f.display }}>{f.name}</span>
                  <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b' }}>{f.vibe}</span>
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="Corner style">
          <Seg options={[{ v: 'sharp', l: 'Sharp' }, { v: 'rounded', l: 'Rounded' }, { v: 'pill', l: 'Soft' }]} value={draft.corners} onChange={(v) => set('corners', v as Corners)} />
        </Row>

        <Row label="Spacing">
          <Seg options={[{ v: 'comfortable', l: 'Comfortable' }, { v: 'compact', l: 'Compact' }]} value={draft.density} onChange={(v) => set('density', v as Density)} />
        </Row>

        <Row label="Where the menu sits">
          <Seg options={[{ v: 'sidebar', l: '◧ Side menu' }, { v: 'top', l: '⎺ Top bar' }]} value={draft.navLayout} onChange={(v) => set('navLayout', v as NavLayout)} />
        </Row>
      </div>

      <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 14 }}>
        {save.isPending ? 'Saving…' : 'Saved automatically.'}
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 8px' }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Seg({
  options,
  value,
  onChange,
}: {
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid #e5eaf2', borderRadius: 10, overflow: 'hidden' }}>
      {options.map((o, i) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              borderLeft: i > 0 ? '1px solid #e5eaf2' : 'none',
              background: on ? '#7c3aed' : '#fff',
              color: on ? '#fff' : '#475569',
            }}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
