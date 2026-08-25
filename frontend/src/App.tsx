import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { OnboardingWizard } from './components/OnboardingWizard';
import { AdminLogin } from './components/AdminLogin';
import type { Trainer } from './lib/database.types';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { Sessions } from './pages/Sessions';
import { Payments } from './pages/Payments';
import { Workouts } from './pages/Workouts';
import { Progress } from './pages/Progress';
import { Settings } from './pages/Settings';
import { BookingPage } from './pages/BookingPage';
import { IntakePage } from './pages/IntakePage';
import { JoinStudioPage } from './pages/JoinStudioPage';
import { FamilyPortalGate } from './babysitting/portal/FamilyPortalGate';
import { isDemoActive, setDemoActive, DemoProvider } from './babysitting/demo/flag';
import { DEMO_TRAINER } from './babysitting/demo/demoData';
import { PortalJoinPage } from './pages/PortalJoinPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { FindTrainersPage } from './pages/FindTrainersPage';
import { AdminPage } from './pages/AdminPage';
import { adminRpc } from './lib/adminRpc';
import { pickTemplateUx } from './lib/templateUx';
import { DojoApp } from './dojo/DojoApp';
import { BoxingApp } from './boxing/BoxingApp';
import { NutritionApp } from './nutrition/NutritionApp';
import { ExerciseApp } from './exercise/ExerciseApp';
import { BabysittingApp } from './babysitting/BabysittingApp';
import { StudioApp } from './studio/StudioApp';
import { applyAppearance, defaultAppearance } from './lib/appearance';
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
import { UnifiedApp, UnifiedShell } from './components/UnifiedApp';
import { UnifiedHome } from './components/UnifiedHome';
import {
  workspacesFor,
  appKeyForVariant,
  readActiveWorkspace,
  writeActiveWorkspace,
  type AppKey,
} from './lib/workspaces';

// TEMP: mock trainer for the /ui-preview design route. Remove with route.
const PREVIEW_TRAINER = {
  template_slugs: ['nutrition_coach', 'martial_arts', 'solo_trainer'],
  business_name: 'Summit Coaching',
  full_name: 'Jordan Lee',
  public_profile: {},
} as unknown as Trainer;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

// The shareable babysitting demo: /babysitting-demo turns the flag on,
// then hard-reloads to the root so App() re-evaluates and mounts the demo
// tree — works on every host (www serves a different router, so a soft
// <Navigate> would land on the marketing page there).
function DemoEntry() {
  setDemoActive(true);
  window.location.replace('/');
  return null;
}

function ProtectedShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Fetch trainer row to check onboarding status. The auth-user trigger creates
  // this row on signup, so it should always exist for an authed user.
  const { data: trainer, isLoading: trainerLoading } = useQuery({
    queryKey: ['trainer', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as Trainer;
    },
    enabled: !!user,
  });

  // The distinct apps this coach owns (one per discipline they picked).
  const workspaces = useMemo(
    () => workspacesFor(trainer?.template_slugs),
    [trainer?.template_slugs],
  );
  // Which app's shell is currently mounted. Defaults to the primary
  // template's app, but the coach can flip via the switcher and we
  // remember their last choice per-browser.
  const primaryKey = appKeyForVariant(pickTemplateUx(trainer?.template_slugs).dashboardVariant);
  const [activeKey, setActiveKey] = useState<AppKey | null>(null);

  // Seed / re-validate the active workspace once the trainer loads.
  useEffect(() => {
    if (!trainer) return;
    const stored = readActiveWorkspace(user?.id);
    const valid = (k: AppKey | null) => !!k && workspaces.some((w) => w.key === k);
    if (valid(activeKey)) return;
    setActiveKey(valid(stored) ? stored : primaryKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainer, workspaces]);

  // Apply the coach's saved appearance (colors, fonts, theme, corners)
  // app-wide via :root CSS vars. Falls back to the template's design
  // defaults if they haven't customized yet.
  useEffect(() => {
    if (!trainer) return;
    const stored = (trainer.public_profile as { appearance?: unknown } | null)?.appearance;
    applyAppearance(
      (stored as Parameters<typeof applyAppearance>[0]) ??
        defaultAppearance(trainer.template_slugs?.[0]),
    );
  }, [trainer]);

  if (loading || (user && trainerLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }
  if (!user) return <Login />;
  // First-time signup: walk them through the wizard before showing the app.
  if (trainer && !trainer.onboarded_at) return <OnboardingWizard trainer={trainer} />;

  // A coach who does several disciplines chose at signup how they want
  // it: ONE combined app (the neutral all-in-one shell) or SEPARATE apps
  // they flip between (the switcher). Default to separate for existing
  // accounts that predate the choice.
  const appMode =
    (trainer?.public_profile as { appMode?: 'combined' | 'separate' } | null)?.appMode ??
    'separate';
  const multiDiscipline = workspaces.length > 1;

  if (multiDiscipline && appMode === 'combined') {
    return <UnifiedApp trainer={trainer} />;
  }

  // Template-driven app fork. Each combat / boxing template mounts its
  // own complete app (dark theme, dedicated pages, sport-specific
  // vocabulary). Other variants keep the standard Layout. A coach who
  // picked several disciplines (and chose "separate") owns several apps
  // and flips between them with the floating switcher.
  const effectiveKey: AppKey =
    activeKey && workspaces.some((w) => w.key === activeKey) ? activeKey : primaryKey;

  function renderApp(key: AppKey) {
    if (key === 'martial') return <DojoApp trainer={trainer} />;
    if (key === 'boxing') return <BoxingApp trainer={trainer} />;
    if (key === 'nutrition') return <NutritionApp trainer={trainer} />;
    if (key === 'exercise') return <ExerciseApp trainer={trainer} />;
    if (key === 'babysitting') return <BabysittingApp trainer={trainer} />;
    if (key === 'studio_classes') return <StudioApp trainer={trainer} />;
    return <Layout />;
  }

  function switchTo(key: AppKey) {
    writeActiveWorkspace(user?.id, key);
    setActiveKey(key);
    // Land on the newly-mounted app's home — paths differ per app, so
    // resetting avoids a "route not found" flash that bounces to '/'.
    navigate('/');
  }

  return (
    <>
      {renderApp(effectiveKey)}
      {workspaces.length > 1 && (
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeKey={effectiveKey}
          onSwitch={switchTo}
        />
      )}
    </>
  );
}

// /portal uses the same auth gate but doesn't render the trainer Layout —
// ClientPortal is its own self-contained page.
function PortalShell() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }
  if (!user) return <Login />;
  // Babysitting parents get the family portal; everyone else keeps the
  // original client portal. The gate decides from the linked rows.
  return <FamilyPortalGate />;
}

// Admin shell — a magic-link sign-in trusts the browser for 7 days. We
// store the verification deadline in localStorage so closing the tab,
// rebooting, or letting the Supabase token quietly refresh doesn't kick
// the admin back to the magic-link form. Real auth still happens on the
// backend via the email allowlist — the verified flag only signals
// "this device proved itself recently."
const ADMIN_VERIFIED_UNTIL_KEY = 'admin_verified_until';
const ADMIN_VERIFY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function readAdminVerified(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = window.localStorage.getItem(ADMIN_VERIFIED_UNTIL_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() < ts;
}
function writeAdminVerified() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    ADMIN_VERIFIED_UNTIL_KEY,
    String(Date.now() + ADMIN_VERIFY_TTL_MS),
  );
}

function AdminShell() {
  const { user, loading } = useAuth();

  const [verified, setVerified] = useState<boolean>(() => readAdminVerified());

  // Magic-link callback: Supabase parses tokens from the URL fragment
  // automatically. We watch for the ?verified=1 marker we set in the redirect
  // URL, then flag this device as verified for 7 days and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1' && user) {
      writeAdminVerified();
      setVerified(true);
      window.history.replaceState({}, '', '/chesky');
    }
  }, [user]);

  const check = useQuery({
    queryKey: ['admin-whoami', user?.id],
    queryFn: () => adminRpc.whoami(),
    enabled: !!user && verified,
    retry: false,
  });

  // Not verified — magic-link form. (Real admin auth gate.)
  if (!verified) {
    return <AdminLogin />;
  }

  if (loading || (user && check.isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }
  // Verified device, but Supabase session is briefly gone. Stay on the
  // magic-link admin form (NOT the regular Login) — Login navigates to
  // `/` on success which dumps the admin back into the trainer app
  // instead of /chesky. AdminLogin sends a magic link that lands back
  // here with the verified=1 marker, preserving the admin context.
  if (!user) {
    return <AdminLogin />;
  }
  // Treat any error or non-admin as 404 — don't reveal /chesky exists.
  if (check.error || !check.data?.is_admin) {
    return <NotFound />;
  }
  return <AdminPage />;
}

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h1 className="text-6xl font-bold text-slate-200 mb-2">404</h1>
        <p className="text-slate-700 font-medium mb-1">Page not found</p>
        <p className="text-sm text-slate-500 mb-5">
          The link you followed may be broken, or the page may have been removed.
        </p>
        <a
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}

/** Page shown when Supabase redirected back with an OTP / magic-link
 *  error in the URL fragment (e.g. expired, already-used, or pre-fetched
 *  by Gmail/Outlook's anti-spam scanner). Without this the user lands on
 *  whatever the root route resolves to with no idea what went wrong. */
function ExpiredMagicLink({ description }: { description: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 items-center justify-center mb-4 text-2xl">
          ⏰
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Sign-in link expired
        </h1>
        <p className="text-slate-600 text-sm mb-3">
          {description || 'That magic link is no longer valid.'}
        </p>
        <p className="text-slate-500 text-xs mb-6 leading-relaxed">
          Two common reasons: too much time passed (links expire in an hour),
          or your email client pre-fetched the link before you clicked it
          (Gmail / Outlook anti-spam scanners click links to test them, which
          uses up the single-use token). Try requesting a fresh link and
          clicking it as soon as the email arrives.
        </p>
        <a
          href="/chesky"
          className="block w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-semibold"
        >
          Request a new sign-in link
        </a>
      </div>
    </div>
  );
}

/** Returns the parsed Supabase auth error from the URL fragment if one is
 *  present (e.g. "#error=access_denied&error_code=otp_expired&..."). */
function readAuthErrorFromHash():
  | { code: string; description: string }
  | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes('error=')) return null;
  // Hash starts with '#' — strip it before URLSearchParams.
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const code = params.get('error_code') ?? params.get('error') ?? '';
  if (!code) return null;
  const desc = (params.get('error_description') ?? '').replace(/\+/g, ' ');
  return { code, description: desc };
}

function isLandingHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'trainerpro.coach' || host === 'www.trainerpro.coach';
}

export default function App() {
  // Magic-link error detector — runs before any routing. If Supabase
  // bounced the user back with an OTP / access_denied error in the URL
  // fragment, show a friendly "link expired" page instead of dumping
  // them on whatever the root route happens to resolve to.
  const authError = readAuthErrorFromHash();
  if (
    authError &&
    (authError.code === 'otp_expired' ||
      authError.code === 'access_denied' ||
      authError.code === 'invalid_request')
  ) {
    return (
      <QueryClientProvider client={queryClient}>
        <ExpiredMagicLink description={authError.description} />
      </QueryClientProvider>
    );
  }

  // The babysitting demo runs on EVERY host, www included — it needs no
  // login and touches no data, so it takes over the whole tree while the
  // per-tab flag is set. BabysittingApp brings its own <Routes>, so /kids,
  // /billing etc. all resolve inside the demo.
  if (isDemoActive()) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <DemoProvider>
              <BabysittingApp trainer={DEMO_TRAINER} />
            </DemoProvider>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  // Apex / www domain serves the marketing site + public-facing pages.
  // Wrapped in BrowserRouter so trainer cards on /find-trainers can deep-link
  // into /p/:slug and /book/:slug — without this, those URLs fall through to
  // the landing page and the customer goes in circles.
  if (isLandingHost()) {
    return (
      <QueryClientProvider client={queryClient}>
        {/* AuthProvider needed for the admin route below — public pages
            don't use it but AdminShell does. Safe to wrap the whole tree. */}
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/find-trainers" element={<FindTrainersPage />} />
              <Route path="/p/:slug" element={<PublicProfilePage />} />
              <Route path="/book/:slug" element={<BookingPage />} />
              {/* Admin — must be present on the apex host too, otherwise
                  trainerpro.coach/chesky falls through to LandingPage. */}
              <Route path="/chesky" element={<AdminShell />} />
              <Route path="/admin" element={<Navigate to="/chesky" replace />} />
              {/* Shareable no-signup babysitting demo — must exist on the
                  www/apex router too, or the link dead-ends on the homepage. */}
              <Route path="/babysitting-demo" element={<DemoEntry />} />
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* TEMP: design preview of the combined app (no auth). Remove. */}
            <Route
              path="/ui-preview"
              element={
                <UnifiedShell trainer={PREVIEW_TRAINER}>
                  <UnifiedHome trainer={PREVIEW_TRAINER} preview />
                </UnifiedShell>
              }
            />

            {/* Marketing + legal + public directory (work on app subdomain too) */}
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/find-trainers" element={<FindTrainersPage />} />

            {/* Public — no auth required */}
            <Route path="/p/:slug" element={<PublicProfilePage />} />
            <Route path="/book/:slug" element={<BookingPage />} />
            <Route path="/intake/:token" element={<IntakePage />} />
            <Route path="/join-studio/:token" element={<JoinStudioPage />} />
            <Route path="/portal-join/:token" element={<PortalJoinPage />} />
            <Route path="/babysitting-demo" element={<DemoEntry />} />

            {/* Auth-protected but uses its own layout */}
            <Route path="/portal" element={<PortalShell />} />

            {/* Admin — hidden, no nav link, gated by backend email allowlist */}
            {/* Renamed from /admin → /chesky to bypass Livigent-style URL
                filters that block paths containing 'admin'. */}
            <Route path="/chesky" element={<AdminShell />} />
            <Route path="/admin" element={<Navigate to="/chesky" replace />} />

            {/* Trainer app — protected */}
            <Route element={<ProtectedShell />}>
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="payments" element={<Payments />} />
              <Route path="workouts" element={<Workouts />} />
              <Route path="progress" element={<Progress />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
