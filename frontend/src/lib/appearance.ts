// ── Appearance system — "design your own app" ──────────────────────
//
// Beyond WHICH features (modules), a coach picks HOW their app looks:
// color palette, font pairing, light/dark, corner style, density, and
// nav layout. Stored per-trainer in trainers.public_profile.appearance.
//
// Applied by emitting CSS custom properties on :root (see
// appearanceToCss). Template shells progressively read these `--tp-*`
// vars so the coach's choices show up everywhere.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from '../hooks/useAuth';

export type ThemeMode = 'light' | 'dark';
export type Corners = 'sharp' | 'rounded' | 'pill';
export type Density = 'compact' | 'comfortable';
export type NavLayout = 'sidebar' | 'top';

export interface AppearanceConfig {
  themeMode: ThemeMode;
  paletteId: string; // preset id or 'custom'
  primary: string; // hex
  accent: string; // hex
  fontId: string; // font-pair preset id
  corners: Corners;
  density: Density;
  navLayout: NavLayout;
}

// ── Palette presets ──────────────────────────────────────────────────
export interface Palette {
  id: string;
  name: string;
  primary: string;
  accent: string;
}
export const PALETTES: Palette[] = [
  { id: 'violet', name: 'Electric Violet', primary: '#7C3AED', accent: '#06B6D4' },
  { id: 'ocean', name: 'Ocean Blue', primary: '#2563EB', accent: '#06B6D4' },
  { id: 'forest', name: 'Forest', primary: '#16A34A', accent: '#65A30D' },
  { id: 'sunset', name: 'Sunset', primary: '#F97316', accent: '#EC4899' },
  { id: 'coral', name: 'Warm Coral', primary: '#D87456', accent: '#6B8E5A' },
  { id: 'navy', name: 'Deep Navy', primary: '#1A3A5C', accent: '#2D6A9F' },
  { id: 'crimson', name: 'Crimson & Gold', primary: '#B91C1C', accent: '#D9A441' },
  { id: 'rose', name: 'Rose', primary: '#E11D48', accent: '#9333EA' },
  { id: 'slate', name: 'Mono Slate', primary: '#0F172A', accent: '#64748B' },
  { id: 'emerald', name: 'Emerald', primary: '#059669', accent: '#0D9488' },
];

// ── Font pairings ────────────────────────────────────────────────────
export interface FontPair {
  id: string;
  name: string;
  /** Human description shown in the picker. */
  vibe: string;
  display: string; // CSS font-family for headings
  body: string; // CSS font-family for body
  /** Google Fonts families to load (names as in the CSS API). */
  googleFonts: string[];
}
export const FONT_PAIRS: FontPair[] = [
  {
    id: 'modern',
    name: 'Modern',
    vibe: 'Clean, neutral, software-y',
    display: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    googleFonts: ['Inter:wght@400;500;600;700;800'],
  },
  {
    id: 'friendly',
    name: 'Friendly',
    vibe: 'Warm, rounded, approachable',
    display: "'Outfit', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    googleFonts: ['Outfit:wght@400;500;600;700;800', 'Inter:wght@400;500;600'],
  },
  {
    id: 'editorial',
    name: 'Editorial',
    vibe: 'Elegant serif headlines',
    display: "'Fraunces', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
    googleFonts: ['Fraunces:opsz,wght@9..144,400;9..144,600', 'Inter:wght@400;500;600'],
  },
  {
    id: 'bold',
    name: 'Bold Impact',
    vibe: 'Big condensed display type',
    display: "'Bebas Neue', Impact, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    googleFonts: ['Bebas+Neue', 'Inter:wght@400;500;600'],
  },
  {
    id: 'classic',
    name: 'Classic',
    vibe: 'Timeless, system-native',
    display: "Georgia, 'Times New Roman', serif",
    body: "-apple-system, 'Segoe UI', Roboto, sans-serif",
    googleFonts: [],
  },
];

// ── Defaults — derived loosely from the template ─────────────────────
const TEMPLATE_DEFAULTS: Record<string, Partial<AppearanceConfig>> = {
  nutrition_coach: { paletteId: 'coral', fontId: 'friendly', navLayout: 'sidebar' },
  // Mom's exact original navy, so her imported app stays identical.
  exercise_group: { paletteId: 'custom', primary: '#2d6a9f', accent: '#7ec8f5', fontId: 'modern', navLayout: 'top' },
  group_studio: { paletteId: 'violet', fontId: 'modern', navLayout: 'top' },
  martial_arts: { paletteId: 'crimson', fontId: 'bold', themeMode: 'dark', navLayout: 'sidebar' },
  boxing_gym: { paletteId: 'crimson', fontId: 'bold', themeMode: 'dark', navLayout: 'top' },
  yoga_studio: { paletteId: 'emerald', fontId: 'editorial', navLayout: 'top' },
};

export function defaultAppearance(templateSlug: string | undefined): AppearanceConfig {
  const base: AppearanceConfig = {
    themeMode: 'light',
    paletteId: 'ocean',
    primary: '#2563EB',
    accent: '#06B6D4',
    fontId: 'modern',
    corners: 'rounded',
    density: 'comfortable',
    navLayout: 'sidebar',
  };
  const t = templateSlug ? TEMPLATE_DEFAULTS[templateSlug] : undefined;
  if (!t) return base;
  const pal = t.paletteId ? PALETTES.find((p) => p.id === t.paletteId) : undefined;
  return {
    ...base,
    ...t,
    // Explicit primary/accent in the template default win, then the
    // palette, then the base.
    primary: t.primary ?? pal?.primary ?? base.primary,
    accent: t.accent ?? pal?.accent ?? base.accent,
  };
}

// ── CSS generation ───────────────────────────────────────────────────
function radiusFor(c: Corners): { sm: string; md: string; lg: string; pill: string } {
  if (c === 'sharp') return { sm: '2px', md: '4px', lg: '6px', pill: '6px' };
  if (c === 'pill') return { sm: '10px', md: '16px', lg: '24px', pill: '999px' };
  return { sm: '6px', md: '10px', lg: '14px', pill: '999px' }; // rounded
}

export function appearanceToCss(a: AppearanceConfig): string {
  const r = radiusFor(a.corners);
  const font = FONT_PAIRS.find((f) => f.id === a.fontId) ?? FONT_PAIRS[0];
  const pad = a.density === 'compact' ? '0.55rem' : '0.85rem';
  const dark = a.themeMode === 'dark';
  return `:root{
  --tp-primary:${a.primary};
  --tp-primary-deep:color-mix(in srgb, ${a.primary} 78%, black);
  --tp-primary-soft:color-mix(in srgb, ${a.primary} 12%, white);
  --tp-accent:${a.accent};
  --tp-accent-deep:color-mix(in srgb, ${a.accent} 78%, black);
  --tp-accent-soft:color-mix(in srgb, ${a.accent} 14%, white);
  --tp-bg:${dark ? '#0f172a' : '#f7f8fb'};
  --tp-surface:${dark ? '#1e293b' : '#ffffff'};
  --tp-ink:${dark ? '#f1f5f9' : '#0f172a'};
  --tp-ink-soft:${dark ? '#cbd5e1' : '#334155'};
  --tp-rule:${dark ? '#334155' : '#e5eaf2'};
  --tp-radius-sm:${r.sm};
  --tp-radius:${r.md};
  --tp-radius-lg:${r.lg};
  --tp-radius-pill:${r.pill};
  --tp-pad:${pad};
  --tp-font-display:${font.display};
  --tp-font-body:${font.body};
}`;
}

/** Build the Google Fonts stylesheet URL for a font pair. */
export function googleFontsHref(fontId: string): string | null {
  const font = FONT_PAIRS.find((f) => f.id === fontId);
  if (!font || font.googleFonts.length === 0) return null;
  const families = font.googleFonts.map((f) => `family=${f}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

function hydrate(raw: unknown, templateSlug: string | undefined): AppearanceConfig {
  const d = defaultAppearance(templateSlug);
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<AppearanceConfig>;
  return {
    themeMode: r.themeMode ?? d.themeMode,
    paletteId: r.paletteId ?? d.paletteId,
    primary: r.primary ?? d.primary,
    accent: r.accent ?? d.accent,
    fontId: r.fontId ?? d.fontId,
    corners: r.corners ?? d.corners,
    density: r.density ?? d.density,
    navLayout: r.navLayout ?? d.navLayout,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────
interface ProfileRow {
  public_profile: Record<string, unknown> | null;
}

export function useAppearance(templateSlug: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['appearance', user?.id],
    queryFn: async (): Promise<AppearanceConfig> => {
      const { data, error } = await supabase
        .from('trainers')
        .select('public_profile')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      const profile = (data as ProfileRow).public_profile ?? {};
      return hydrate((profile as Record<string, unknown>).appearance, templateSlug);
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async (next: AppearanceConfig) => {
      if (!user) throw new Error('Not signed in');
      const { data: cur, error: e1 } = await supabase
        .from('trainers')
        .select('public_profile')
        .eq('id', user.id)
        .single();
      if (e1) throw e1;
      const profile = ((cur as ProfileRow | null)?.public_profile ?? {}) as Record<string, unknown>;
      const { error } = await supabase
        .from('trainers')
        .update({ public_profile: { ...profile, appearance: next } })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appearance'] }),
  });

  return { appearance: query.data ?? defaultAppearance(templateSlug), isLoading: query.isLoading, save };
}

/** Injects the appearance CSS + Google Fonts into <head>. Call once near
 *  the app root. Safe to call with a live config (re-runs on change). */
export function applyAppearance(a: AppearanceConfig) {
  if (typeof document === 'undefined') return;
  // CSS vars
  let styleEl = document.getElementById('tp-appearance') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'tp-appearance';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = appearanceToCss(a);
  // Fonts
  const href = googleFontsHref(a.fontId);
  let linkEl = document.getElementById('tp-fonts') as HTMLLinkElement | null;
  if (href) {
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.id = 'tp-fonts';
      linkEl.rel = 'stylesheet';
      document.head.appendChild(linkEl);
    }
    if (linkEl.href !== href) linkEl.href = href;
  }
}
