// ── UnifiedApp — the neutral "all-in-one" shell ─────────────────────
//
// For a coach who does several disciplines AND chose (at signup) to have
// ONE combined app rather than separate apps they switch between. This
// is a brand-new neutral shell — deliberately NOT the dojo's dark
// belt-tracker or the nutrition magazine look. It belongs to no single
// template, so a multi-discipline coach feels at home no matter what
// they do.
//
// Fully themed by the coach's chosen appearance (the --tp-* CSS
// variables applied app-wide), so their colors + fonts drive it.
//
//   UnifiedShell  — presentational sidebar + content frame (exported so
//                   it can be previewed in isolation)
//   UnifiedApp    — the real app: shell + its own routes

import { NavLink, Outlet, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { Trainer } from '../lib/database.types';
import { pickTemplateUx } from '../lib/templateUx';
import { workspacesFor } from '../lib/workspaces';
import { useEnabledModules } from '../lib/modules';
import { useLayout } from '../lib/layout';
import { coreNavFor } from '../lib/appNav';
import { UnifiedHome } from './UnifiedHome';
import { Clients } from '../pages/Clients';
import { ClientDetail } from '../pages/ClientDetail';
import { Sessions } from '../pages/Sessions';
import { Payments } from '../pages/Payments';
import { Workouts } from '../pages/Workouts';
import { Progress } from '../pages/Progress';
import { Settings } from '../pages/Settings';

export function UnifiedShell({
  trainer,
  children,
}: {
  trainer: Trainer | undefined;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const slugs = trainer?.template_slugs ?? [];
  const ux = pickTemplateUx(slugs);
  const disciplines = workspacesFor(slugs);
  const { isOn } = useEnabledModules(slugs);
  const { layout } = useLayout();

  const people = capitalize(ux.clientNounPlural);

  // Same menu brain as the default shell — features on/off + saved order.
  const visible = coreNavFor(isOn, layout.navOrder, people);

  const businessName =
    trainer?.business_name?.trim() || trainer?.full_name?.trim() || 'Your business';

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--tp-bg, #f6f7fb)',
        color: 'var(--tp-ink, #0f172a)',
        fontFamily: 'var(--tp-font-body, system-ui, sans-serif)',
      }}
    >
      <aside
        style={{
          width: 250,
          flexShrink: 0,
          background: 'var(--tp-surface, #ffffff)',
          borderRight: '1px solid var(--tp-rule, #e8ecf3)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--tp-rule, #e8ecf3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--tp-radius, 12px)',
                background:
                  'linear-gradient(135deg, var(--tp-primary, #4f46e5), var(--tp-accent, #7c3aed))',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontFamily: 'var(--tp-font-display, inherit)',
              }}
            >
              {initials(businessName)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: '0.98rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: 'var(--tp-font-display, inherit)',
                }}
                title={businessName}
              >
                {businessName}
              </p>
              <p style={{ margin: 0, fontSize: '0.66rem', color: 'var(--tp-ink-soft, #94a3b8)' }}>
                All-in-one workspace
              </p>
            </div>
          </div>
          {disciplines.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 13 }}>
              {disciplines.map((d) => (
                <span
                  key={d.key}
                  title={d.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'var(--tp-ink-soft, #475569)',
                    background: 'color-mix(in srgb, var(--tp-primary, #4f46e5) 8%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--tp-primary, #4f46e5) 22%, transparent)',
                    borderRadius: 999,
                    padding: '3px 9px',
                  }}
                >
                  <span>{d.emoji}</span>
                  {d.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: 11, overflowY: 'auto' }}>
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '10px 12px',
                  margin: '2px 0',
                  borderRadius: 'var(--tp-radius, 10px)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: isActive ? '#fff' : 'var(--tp-ink-soft, #475569)',
                  background: isActive ? 'var(--tp-primary, #4f46e5)' : 'transparent',
                })}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid var(--tp-rule, #e8ecf3)' }}>
          <div style={{ padding: '4px 8px 8px' }}>
            <p style={{ margin: 0, fontSize: '0.64rem', color: 'var(--tp-ink-soft, #94a3b8)' }}>
              Signed in as
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={user?.email ?? ''}
            >
              {user?.email ?? '—'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--tp-radius, 10px)',
              border: 'none',
              background: 'transparent',
              color: 'var(--tp-ink-soft, #475569)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}

export function UnifiedApp({ trainer }: { trainer: Trainer | undefined }) {
  return (
    <UnifiedShell trainer={trainer}>
      <Routes>
        <Route index element={<UnifiedHome trainer={trainer} />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="payments" element={<Payments />} />
        <Route path="workouts" element={<Workouts />} />
        <Route path="progress" element={<Progress />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UnifiedShell>
  );
}

// Outlet kept available for any future nested use.
export { Outlet };

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
