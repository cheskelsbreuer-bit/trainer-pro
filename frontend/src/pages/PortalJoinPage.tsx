import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PasteSignInLink } from '../components/PasteSignInLink';
import { useAuth } from '../hooks/useAuth';

interface Info {
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  client: { full_name: string; email: string | null };
  trainer: { full_name: string; business_name: string | null; primary_color: string | null; logo_url: string | null };
}

export function PortalJoinPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [signupForm, setSignupForm] = useState({ email: '', password: '' });
  const [signupError, setSignupError] = useState<string | null>(null);
  // A parent who already has a login (a second child, a re-invite, or a
  // returning account) needs a way in that is not "create an account".
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  // Some projects require email confirmation, so signUp returns a user
  // but NO session. Linking would then fail with NOT_AUTHENTICATED.
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const { data, isLoading, error: inviteError } = useQuery({
    queryKey: ['portal-invite', token],
    queryFn: async (): Promise<Info | null> => {
      if (!token) return null;
      const { data, error } = await supabase.rpc('public_portal_invite_info', { p_token: token });
      if (error) throw error;
      return data as Info | null;
    },
    enabled: !!token,
    // An expired or mistyped link does not become valid on the third
    // attempt. Retrying only made a mother watch a spinner for twelve
    // seconds before being told anything at all.
    retry: false,
  });

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('accept_client_portal_invite', { p_token: token });
      if (error) throw new Error(friendly(error.message));
    },
    onSuccess: () => {
      setAccepted(true);
      setTimeout(() => navigate('/portal'), 1200);
    },
  });

  const signup = useMutation({
    mutationFn: async (): Promise<{ hasSession: boolean }> => {
      setSignupError(null);
      const email = (signupForm.email || data?.client.email || '').trim();
      const { data: res, error } = await supabase.auth.signUp({
        email,
        password: signupForm.password,
        options: { data: { full_name: data?.client.full_name } },
      });
      if (error) {
        // Already has an account — send them to sign-in rather than a wall.
        if (/already|registered|exists/i.test(error.message)) {
          setMode('signin');
          throw new Error('You already have a login for that email — enter your password below.');
        }
        throw new Error(error.message);
      }
      // No session means the project requires email confirmation.
      return { hasSession: !!res.session };
    },
    onSuccess: ({ hasSession }) => {
      if (hasSession) accept.mutate();
      else setNeedsConfirm(true);
    },
    onError: (e: Error) => setSignupError(e.message),
  });

  const signin = useMutation({
    mutationFn: async () => {
      setSignupError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email: (signupForm.email || data?.client.email || '').trim(),
        password: signupForm.password,
      });
      if (error) throw new Error(
        /invalid/i.test(error.message) ? 'That email and password do not match.' : error.message,
      );
    },
    onSuccess: () => accept.mutate(),
    onError: (e: Error) => setSignupError(e.message),
  });

  if (isLoading || authLoading) return <Centered>Loading…</Centered>;

  if (!data) {
    // Say WHICH problem and what to do about it. "Invalid link" sent a
    // mother hunting for a typo when her link had simply run out.
    // Supabase throws a plain object, not an Error, so instanceof misses
    // it and every failure looked the same.
    const raw =
      typeof inviteError === 'string'
        ? inviteError
        : ((inviteError as { message?: string } | null)?.message ?? '');
    const expired = /INVITE_EXPIRED/.test(raw);
    return (
      <Centered>
        <Icon><AlertCircle size={20} /></Icon>
        <h1 className="text-xl font-semibold text-slate-900">
          {expired ? 'This link has expired' : "This link doesn't work"}
        </h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          {expired
            ? 'Invite links only last a short while. Ask for a new one and it will work straight away.'
            : 'Check you copied the whole link from the message. If it still fails, ask for a new one.'}
        </p>
      </Centered>
    );
  }
  if (data.status === 'revoked') {
    return (
      <Centered>
        <Icon><AlertCircle size={20} /></Icon>
        <h1 className="text-xl font-semibold text-slate-900">Link cancelled</h1>
        <p className="text-sm text-slate-500 mt-1">Ask your trainer for a fresh one.</p>
      </Centered>
    );
  }
  if (data.status === 'expired') {
    return (
      <Centered>
        <Icon><AlertCircle size={20} /></Icon>
        <h1 className="text-xl font-semibold text-slate-900">Link expired</h1>
        <p className="text-sm text-slate-500 mt-1">Ask your trainer for a fresh one.</p>
      </Centered>
    );
  }
  if (data.status === 'accepted' || accepted) {
    return (
      <Centered>
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">You're in</h1>
        <p className="text-sm text-slate-500 mt-1">Redirecting to your portal…</p>
      </Centered>
    );
  }

  const color = data.trainer.primary_color || '#2d6a9f';
  const heading = data.trainer.business_name || data.trainer.full_name;

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className="text-white py-10 px-6"
        style={{ background: `linear-gradient(135deg, ${color}, ${darken(color, 12)})` }}
      >
        <div className="max-w-md mx-auto flex items-center gap-4">
          {data.trainer.logo_url ? (
            <img src={data.trainer.logo_url} alt="" className="w-14 h-14 rounded-full object-cover bg-white/10" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
              <Heart size={26} />
            </div>
          )}
          <div>
            <p className="text-white/85 text-sm">Welcome, {data.client.full_name.split(' ')[0]}</p>
            <h1 className="text-2xl font-bold">{heading}</h1>
            <p className="text-white/70 text-xs">Set up your client portal</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-8">
        {needsConfirm ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-semibold text-slate-900">Check your email 📬</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We sent a confirmation link to{' '}
              <span className="font-medium">{signupForm.email || data.client.email}</span>. Open it,
              then come back to <em>this</em> link and you'll go straight into your portal.
            </p>
            <p className="text-xs text-slate-500">
              Nothing arrived? Check spam, or ask {heading} to send the invite again.
            </p>
            <div className="pt-1">
              <PasteSignInLink />
            </div>
            <button
              onClick={() => { setNeedsConfirm(false); setMode('signin'); }}
              className="w-full border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg"
            >
              I already confirmed — sign me in
            </button>
          </div>
        ) : user ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-sm text-slate-700">
              Signed in as <span className="font-medium">{user.email}</span>. Click below to link this
              account to your client profile and access your portal.
            </p>
            {accept.error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                {(accept.error as Error).message}
              </p>
            )}
            <button
              onClick={() => accept.mutate()}
              disabled={accept.isPending}
              className="w-full text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {accept.isPending ? 'Linking…' : 'Open my portal'}
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => { setMode('signup'); setSignupError(null); }}
                className={`flex-1 text-sm font-medium py-2 rounded-lg border ${mode === 'signup' ? 'text-white border-transparent' : 'text-slate-600 border-slate-300'}`}
                style={mode === 'signup' ? { backgroundColor: color } : undefined}
              >
                I'm new
              </button>
              <button
                onClick={() => { setMode('signin'); setSignupError(null); }}
                className={`flex-1 text-sm font-medium py-2 rounded-lg border ${mode === 'signin' ? 'text-white border-transparent' : 'text-slate-600 border-slate-300'}`}
                style={mode === 'signin' ? { backgroundColor: color } : undefined}
              >
                I have a login
              </button>
            </div>
            <h2 className="font-semibold text-slate-900">
              {mode === 'signup' ? 'Create a password' : 'Sign in'}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === 'signup'
                ? "We'll email you confirmations and reminders here. You'll only enter this once."
                : 'Use the email and password you already set up.'}
            </p>
            <input
              type="email"
              placeholder="Email"
              value={signupForm.email || data.client.email || ''}
              onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={signupForm.password}
              onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(signupError || accept.error) && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                {signupError || (accept.error as Error).message}
              </p>
            )}
            <button
              onClick={() => (mode === 'signup' ? signup.mutate() : signin.mutate())}
              disabled={
                signup.isPending ||
                signin.isPending ||
                accept.isPending ||
                !(signupForm.email || data.client.email) ||
                !signupForm.password
              }
              className="w-full text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {signup.isPending || signin.isPending || accept.isPending
                ? 'One moment…'
                : mode === 'signup'
                  ? 'Create my portal account'
                  : 'Sign in and open my portal'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

/** The RPC speaks in codes; parents should not have to. */
function friendly(msg: string): string {
  if (/NOT_AUTHENTICATED/.test(msg)) return 'Please confirm your email first, then open this link again.';
  if (/INVITE_EXPIRED/.test(msg)) return 'This link has expired — ask for a fresh one.';
  if (/INVITE_INVALID/.test(msg)) return 'This link is no longer valid — ask for a fresh one.';
  return msg;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm max-w-sm">{children}</div>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
      {children}
    </div>
  );
}

function darken(hex: string, percent: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - Math.round(255 * (percent / 100)));
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - Math.round(255 * (percent / 100)));
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - Math.round(255 * (percent / 100)));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
