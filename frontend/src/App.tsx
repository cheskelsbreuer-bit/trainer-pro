import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { OnboardingWizard } from './components/OnboardingWizard';
import { AdminLogin } from './components/AdminLogin';
import type { Trainer } from './lib/database.types';
import { Dashboard } from './pages/Dashboard';
import { ModuleGate } from './components/ModuleGate';
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
import { readAdminVerified, writeAdminVerified, ADMIN_AWAITING_KEY } from './lib/adminSession';
import { BabysittingApp } from './babysitting/BabysittingApp';
import { LookingInsideBar } from './babysitting/LookingInside';
import { viewAsTarget } from './babysitting/lib/viewAs';
import { CoachApp } from './coach/CoachApp';
import { applyAppearance, defaultAppearance } from './lib/appearance';
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
import { UnifiedApp, UnifiedShell } from './components/UnifiedApp';
import { UnifiedHome } from './components/UnifiedHome';
import {
  workspacesFor,
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
  const location = useLocation();

  // Fetch trainer row to check onboarding status. The auth-user trigger creates
  // this row on signup, so it should always exist for an authed user.
  const { data: trainer, isLoading: trainerLoading } = useQuery({
    queryKey: ['trainer', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      // null = this account is not a coach. Parents sign in with the
      // same auth system and simply have no trainers row.
      return (data as Trainer | null) ?? null;
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
  // The Coach app is the flagship: when the account owns it at all, it
  // is the app you land in (the switcher reaches the others). Accounts
  // with no templates get it too — this is a 1-on-1 platform first.
  const primaryKey: AppKey =
    workspaces.find((w) => w.key === 'coach')?.key ?? workspaces[0]?.key ?? 'coach';
  // Read the remembered workspace synchronously: if it seeds one render
  // late, the primary app mounts first and its router eats any deep link
  // (e.g. /settings gets bounced to / before the real workspace loads).
  const [activeKey, setActiveKey] = useState<AppKey | null>(() => readActiveWorkspace(user?.id));

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
  // No trainers row = not a coach. That's a PARENT (or client) who signed
  // in at the site root rather than /portal — send them to their own
  // portal instead of a coach dashboard they can't use.
  if (!trainer) return <FamilyPortalGate />;
  // First-time signup: walk them through the wizard before showing the app.
  //
  // Not while an admin is looking inside, though. Someone who signed up and
  // never finished is exactly the account worth inspecting, and dropping the
  // admin into that person's wizard shows them a form instead of an app —
  // and a wizard whose every save is refused, at that. Skip straight to the
  // app; an empty one is itself the answer to "what did they do".
  if (!trainer.onboarded_at && !viewAsTarget()) {
    return <OnboardingWizard trainer={trainer} />;
  }

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
  //
  // Multi-app coaches: hold one frame until the remembered workspace is
  // seeded — mounting the primary app early lets its router eat deep
  // links (/settings bounced to / before the real workspace loads).
  if (multiDiscipline && activeKey === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }
  const effectiveKey: AppKey =
    activeKey && workspaces.some((w) => w.key === activeKey) ? activeKey : primaryKey;

  // The reset (see archive/pre-groundup-verticals): the old vertical
  // shells are gone. Babysitting and the 1-on-1 Coach app are the
  // ground-up apps; every other template rides the base Layout.
  //
  // The Coach app doesn't cover booking or settings yet, so classic-only
  // paths keep rendering the Layout (whose pages come via the outer
  // router's Outlet) — coach users reach them from the sidebar's "More
  // tools" links, and Today's "book sessions" link.
  const CLASSIC_ONLY = ['/sessions', '/payments', '/workouts', '/progress', '/settings'];
  const onClassicPath = CLASSIC_ONLY.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + '/'),
  );
  function renderApp(key: AppKey) {
    if (key === 'babysitting') return <BabysittingApp trainer={trainer ?? undefined} />;
    if (key === 'coach' && !onClassicPath) return <CoachApp />;
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

// The Coach preview: same auth gate, its own self-contained shell.
function CoachPreviewShell() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }
  if (!user) return <Login />;
  return <CoachApp base="/coach-preview" preview />;
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

function AdminShell() {
  const { user, loading } = useAuth();

  const [verified, setVerified] = useState<boolean>(() => readAdminVerified());

  // Magic-link callback: Supabase parses tokens from the URL fragment
  // automatically. We watch for the ?verified=1 marker we set in the redirect
  // URL, then flag this device as verified for 7 days and clean the URL.
  useEffect(() => {
    if (!user) return;
    // Two ways to know a fresh magic link just landed. The ?verified=1
    // marker is the old one, kept for links already sitting in an inbox.
    // The flag is the new one: it lives in this tab rather than in the
    // URL, so the address we ask Supabase to send people back to has no
    // query string on it at all — one less thing that has to match a
    // redirect allow-list exactly.
    const params = new URLSearchParams(window.location.search);
    const marked = params.get('verified') === '1';
    const awaiting = sessionStorage.getItem(ADMIN_AWAITING_KEY) === '1';
    if (!marked && !awaiting) return;
    sessionStorage.removeItem(ADMIN_AWAITING_KEY);
    writeAdminVerified();
    setVerified(true);
    if (marked) {
      // Keep whichever door they came in by (/chesky or /hq) — rewriting
      // it to a fixed path would bounce them off the alias.
      window.history.replaceState({}, '', window.location.pathname);
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
  //
  // The cost of that lie is that it also says nothing to the person who IS
  // supposed to be here and is staring at a 404 wondering what broke. So
  // `?why=1` on the URL tells the truth. It gives nothing away that the
  // reader doesn't already have: you have to be signed in, and you have to
  // have guessed this URL in the first place.
  if (check.error || !check.data?.is_admin) {
    const why = new URLSearchParams(window.location.search).get('why') === '1';
    return why ? (
      <AdminWhyNot email={user.email ?? null} uid={user.id} error={check.error} />
    ) : (
      <NotFound />
    );
  }
  return <AdminPage />;
}

/** Why the admin page is refusing you. Only shown for ?why=1. */
function AdminWhyNot({
  email,
  uid,
  error,
}: {
  email: string | null;
  uid: string;
  error: unknown;
}) {
  const msg = error instanceof Error ? error.message : error ? String(error) : null;
  const missing = msg ? /does not exist|schema cache|find the function/i.test(msg) : false;
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md text-sm text-slate-700 space-y-3">
        <h1 className="text-lg font-semibold text-slate-900">
          {msg
            ? "You're signed in, but the check itself failed"
            : "You're signed in, but not as an admin"}
        </h1>
        <p>
          The page is fine. The database was asked whether this account is an admin and{' '}
          {msg ? 'could not answer' : 'said no'}, so the page showed you a 404 rather than admit it
          exists.
        </p>
        <dl className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 font-mono text-xs">
          <div>
            <dt className="inline text-slate-500">signed in as </dt>
            <dd className="inline text-slate-900">{email ?? '(no email on this account)'}</dd>
          </div>
          <div>
            <dt className="inline text-slate-500">account id </dt>
            <dd className="inline text-slate-900">{uid}</dd>
          </div>
          <div>
            <dt className="inline text-slate-500">answer </dt>
            <dd className="inline text-slate-900">{msg ? `error — ${msg}` : 'is_admin = false'}</dd>
          </div>
        </dl>
        {missing ? (
          <p>
            That error means the admin functions were never added to this database. Run{' '}
            <code className="bg-slate-100 px-1 rounded">supabase/22_admin_via_rpc.sql</code> and{' '}
            <code className="bg-slate-100 px-1 rounded">23</code>,{' '}
            <code className="bg-slate-100 px-1 rounded">24</code> in the Supabase SQL editor.
          </p>
        ) : (
          <p>
            If that address is the right one, run{' '}
            <code className="bg-slate-100 px-1 rounded">supabase/44_admin_fix_me.sql</code> in the
            Supabase SQL editor — it marks that account as an admin and prints what it found. If it
            is the <em>wrong</em> address, sign out and sign back in with the right one.
          </p>
        )}
        <p className="text-slate-500 text-xs">
          Nobody sees this page without both a signed-in account and the <code>?why=1</code> on the
          address.
        </p>
      </div>
    </div>
  );
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

  // Admin looking inside someone's account. Nothing is taken over: useAuth
  // hands every page that account's id, so the normal tree below renders
  // whichever app they actually open — babysitting, the Coach app, the
  // classic one — with their rows in it. All that is added is a bar saying
  // whose account this is and how to get out.
  const lookingAt = viewAsTarget();

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
              {/* /hq is the same page under a shorter name. Chrome's address
                  bar autocompletes "chesky" to another site of his, so there
                  needs to be a door whose first letters aren't a prefix of
                  anything else he visits. */}
              <Route path="/hq" element={<AdminShell />} />
              <Route path="/admin" element={<Navigate to="/hq" replace />} />
              {/* Shareable no-signup babysitting demo — must exist on the
                  www/apex router too, or the link dead-ends on the homepage. */}
              <Route path="/babysitting-demo" element={<DemoEntry />} />
              {/* Parent/client portal links are sent to outsiders, so they
                  must work on the public host too — otherwise an invite
                  link dead-ends on the marketing homepage. */}
              <Route path="/portal-join/:token" element={<PortalJoinPage />} />
              <Route path="/portal" element={<PortalShell />} />
              <Route path="/intake/:token" element={<IntakePage />} />
              <Route path="/join-studio/:token" element={<JoinStudioPage />} />
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </BrowserRouter>
          {lookingAt && <LookingInsideBar trainerId={lookingAt} />}
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
            {/* The flagship Coach app, growing behind a preview door until
                it replaces the classic shell for 1-on-1 templates. */}
            <Route path="/coach-preview/*" element={<CoachPreviewShell />} />

            {/* Admin — hidden, no nav link, gated by backend email allowlist */}
            {/* Renamed from /admin → /chesky to bypass Livigent-style URL
                filters that block paths containing 'admin'. */}
            <Route path="/chesky" element={<AdminShell />} />
            <Route path="/hq" element={<AdminShell />} />
            <Route path="/admin" element={<Navigate to="/hq" replace />} />

            {/* Trainer app — protected. Feature tabs sit behind ModuleGate,
                so a switched-off feature shows a one-click turn-on screen
                instead of pretending the toggle doesn't exist. */}
            <Route element={<ProtectedShell />}>
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="sessions" element={<ModuleGate route="/sessions"><Sessions /></ModuleGate>} />
              <Route path="payments" element={<ModuleGate route="/payments"><Payments /></ModuleGate>} />
              <Route path="workouts" element={<ModuleGate route="/workouts"><Workouts /></ModuleGate>} />
              <Route path="progress" element={<ModuleGate route="/progress"><Progress /></ModuleGate>} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        {lookingAt && <LookingInsideBar trainerId={lookingAt} />}
      </AuthProvider>
    </QueryClientProvider>
  );
}
