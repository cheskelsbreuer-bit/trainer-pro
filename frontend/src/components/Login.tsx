import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isConfigured, supabase } from '../lib/supabase';
import { PasteSignInLink } from './PasteSignInLink';

type Mode = 'sign-in' | 'sign-up' | 'magic-link';

function initialModeFromUrl(): Mode {
  if (typeof window === 'undefined') return 'sign-in';
  const m = new URLSearchParams(window.location.search).get('mode');
  if (m === 'sign-up' || m === 'sign-in' || m === 'magic-link') return m;
  return 'sign-in';
}

export function Login() {
  const { signIn, signUp, sendMagicLink } = useAuth();
  const [mode, setMode] = useState<Mode>(initialModeFromUrl());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-lg bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Setup needed</h1>
          <p className="text-slate-700 mb-4">
            This app needs a Supabase project before it can run.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
            <li>
              Create a free Supabase project at{' '}
              <a href="https://supabase.com" className="text-blue-600 underline">
                supabase.com
              </a>
              .
            </li>
            <li>In the SQL editor, run the file <code>supabase/01_schema.sql</code>.</li>
            <li>
              Copy <code>frontend/.env.example</code> to <code>frontend/.env.local</code> and fill in your
              project URL and anon key.
            </li>
            <li>
              Run <code>npm run dev</code> again.
            </li>
          </ol>
        </div>
      </div>
    );
  }

  async function handleGoogle() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      // On success the browser navigates away to Google's OAuth screen.
      if (error) setError(error.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      } else if (mode === 'sign-up') {
        const { error } = await signUp(email, password, fullName || email.split('@')[0]);
        if (error) setError(error);
        else setInfo('Account created. Check your email to confirm, then sign in.');
      } else {
        const { error } = await sendMagicLink(email);
        if (error) setError(error);
        else setInfo("Check your email for a sign-in link.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white items-center justify-center mb-3 shadow-lg shadow-blue-600/30">
            <Dumbbell size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Trainer Pro</h1>
          <p className="text-sm text-slate-500 mt-1">Run your training business in one place.</p>
        </div>

        {/* Google sign-in shortcut — works for both sign-in and sign-up. */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2.5 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-lg py-2.5 mb-4 text-sm font-medium text-slate-700 transition disabled:opacity-50"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4 text-xs text-slate-400">
          <div className="flex-1 h-px bg-slate-200" />
          <span>or with email</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
          {(['sign-in', 'sign-up', 'magic-link'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 text-sm py-2 rounded-md transition ${
                mode === m
                  ? 'bg-white shadow text-slate-900 font-medium'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m === 'sign-in' ? 'Sign in' : m === 'sign-up' ? 'Sign up' : 'Magic link'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'sign-up' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Trainer"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {mode !== 'magic-link' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium py-2.5 rounded-lg transition"
          >
            {busy
              ? 'Working…'
              : mode === 'sign-in'
                ? 'Sign in'
                : mode === 'sign-up'
                  ? 'Create account'
                  : 'Send magic link'}
          </button>
        </form>

        {/* Shown once we've told them to go check their inbox: the answer to
            "I clicked the link and it took me somewhere else". */}
        {info && info.toLowerCase().includes('email') && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <PasteSignInLink />
          </div>
        )}

        <p className="text-xs text-slate-400 text-center mt-6">
          Your data is private — only you can read it.
        </p>
        {mode === 'sign-up' && (
          <p className="text-[11px] text-slate-400 text-center mt-2 leading-relaxed">
            By creating an account you agree to our{' '}
            <a href="/terms" className="underline hover:text-slate-600" target="_blank" rel="noreferrer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="underline hover:text-slate-600" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  // Inline SVG so we don't pull a new dep — official Google "G" colors.
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.6 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.5c5.5 0 10.4-2 14.1-5.4l-6.5-5.5C29.6 34 26.9 35 24 35c-5.3 0-9.7-3.4-11.3-8L6 31.6C9.4 38 16.1 43.5 24 43.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.5 5.5c-.5.4 7-5.1 7-15.1 0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
