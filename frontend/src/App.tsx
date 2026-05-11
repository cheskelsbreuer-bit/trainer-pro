import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { ClientPortal } from './pages/ClientPortal';
import { PortalJoinPage } from './pages/PortalJoinPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { FindTrainersPage } from './pages/FindTrainersPage';
import { AdminPage } from './pages/AdminPage';
import { api, ApiError } from './lib/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

function ProtectedShell() {
  const { user, loading } = useAuth();

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
  return <Layout />;
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
  return <ClientPortal />;
}

// Admin shell — every browser tab requires a fresh magic-link sign-in. We track
// "this tab has verified" in sessionStorage (auto-cleared on tab close) so a
// long-lived Supabase session in localStorage doesn't grant admin access by
// itself. Real auth still happens on the backend via the email allowlist.
function AdminShell() {
  const { user, loading } = useAuth();

  const [verified, setVerified] = useState<boolean>(() =>
    typeof window !== 'undefined' && sessionStorage.getItem('admin_verified') === 'true',
  );

  // Magic-link callback: Supabase parses tokens from the URL fragment
  // automatically. We watch for the ?verified=1 marker we set in the redirect
  // URL, then flag this tab as verified and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1' && user) {
      sessionStorage.setItem('admin_verified', 'true');
      setVerified(true);
      window.history.replaceState({}, '', '/chesky');
    }
  }, [user]);

  const check = useQuery({
    queryKey: ['admin-whoami', user?.id],
    queryFn: () => api<{ is_admin: boolean }>('/chesky/whoami'),
    enabled: !!user && verified,
    retry: false,
  });

  // Not verified for this tab — always show the magic-link form, even if the
  // user has a persisted Supabase session for the regular app.
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
  // Edge case: verified flag set but session expired between requests.
  if (!user) {
    sessionStorage.removeItem('admin_verified');
    return <AdminLogin />;
  }
  // Treat any error or non-admin as 404 — don't reveal /admin exists.
  if (check.error instanceof ApiError || !check.data?.is_admin) {
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

function isLandingHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'trainerpro.coach' || host === 'www.trainerpro.coach';
}

export default function App() {
  // Apex / www domain serves the marketing site + public-facing pages.
  // Wrapped in BrowserRouter so trainer cards on /find-trainers can deep-link
  // into /p/:slug and /book/:slug — without this, those URLs fall through to
  // the landing page and the customer goes in circles.
  if (isLandingHost()) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/find-trainers" element={<FindTrainersPage />} />
            <Route path="/p/:slug" element={<PublicProfilePage />} />
            <Route path="/book/:slug" element={<BookingPage />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
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
