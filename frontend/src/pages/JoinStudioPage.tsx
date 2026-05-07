import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface InviteInfo {
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  role: 'staff' | 'owner';
  expires_at: string;
  studio: {
    name: string;
    primary_color: string | null;
    logo_url: string | null;
    intro_text: string | null;
  };
}

export function JoinStudioPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [accepted, setAccepted] = useState(false);
  const [signupForm, setSignupForm] = useState({ email: '', password: '', full_name: '' });
  const [signupError, setSignupError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invite-info', token],
    queryFn: async (): Promise<InviteInfo | null> => {
      if (!token) return null;
      const { data, error } = await supabase.rpc('public_studio_invite_info', { p_token: token });
      if (error) throw error;
      return data as InviteInfo | null;
    },
    enabled: !!token,
  });

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('accept_studio_invite', { p_token: token });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setAccepted(true);
      setTimeout(() => navigate('/'), 1500);
    },
  });

  const signup = useMutation({
    mutationFn: async () => {
      setSignupError(null);
      const { error } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: { data: { full_name: signupForm.full_name } },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // After signup, trigger creates trainer row. Then we can accept.
      setTimeout(() => accept.mutate(), 700);
    },
    onError: (e: Error) => setSignupError(e.message),
  });

  if (isLoading || authLoading) return <Centered>Loading…</Centered>;

  if (!data) {
    return (
      <Centered>
        <Icon><AlertCircle size={20} /></Icon>
        <h1 className="text-xl font-semibold text-slate-900">Invalid invite</h1>
        <p className="text-sm text-slate-500 mt-1">This invite link doesn't exist.</p>
      </Centered>
    );
  }
  if (data.status === 'revoked') {
    return (
      <Centered>
        <Icon><AlertCircle size={20} /></Icon>
        <h1 className="text-xl font-semibold text-slate-900">Invite revoked</h1>
        <p className="text-sm text-slate-500 mt-1">Ask the studio owner for a new one.</p>
      </Centered>
    );
  }
  if (data.status === 'expired') {
    return (
      <Centered>
        <Icon><AlertCircle size={20} /></Icon>
        <h1 className="text-xl font-semibold text-slate-900">Invite expired</h1>
        <p className="text-sm text-slate-500 mt-1">Ask the studio owner for a new one.</p>
      </Centered>
    );
  }
  if (data.status === 'accepted' || accepted) {
    return (
      <Centered>
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">You're in!</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome to {data.studio.name}.</p>
      </Centered>
    );
  }

  // Pending — show accept flow
  const color = data.studio.primary_color || '#2d6a9f';
  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className="text-white py-10 px-6"
        style={{ background: `linear-gradient(135deg, ${color}, ${darken(color, 12)})` }}
      >
        <div className="max-w-md mx-auto flex items-center gap-4">
          {data.studio.logo_url ? (
            <img src={data.studio.logo_url} alt="" className="w-14 h-14 rounded-full object-cover bg-white/10" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
              <Building2 size={26} />
            </div>
          )}
          <div>
            <p className="text-white/85 text-sm">You've been invited to join</p>
            <h1 className="text-2xl font-bold">{data.studio.name}</h1>
            <p className="text-white/70 text-xs">as a {data.role}</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-8">
        {user ? (
          // Already signed in — accept directly
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-sm text-slate-700">
              Signed in as <span className="font-medium">{user.email}</span>.
              {' '}Accept the invite to join the studio.
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
              {accept.isPending ? 'Joining…' : `Join ${data.studio.name}`}
            </button>
          </div>
        ) : (
          // Not signed in — sign up flow
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-semibold text-slate-900">Create your trainer account</h2>
            <p className="text-xs text-slate-500">After signup, you'll automatically join the studio.</p>
            <input
              placeholder="Your full name"
              value={signupForm.full_name}
              onChange={(e) => setSignupForm({ ...signupForm, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email"
              value={signupForm.email}
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
            {signupError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                {signupError}
              </p>
            )}
            <button
              onClick={() => signup.mutate()}
              disabled={
                signup.isPending ||
                accept.isPending ||
                !signupForm.email ||
                !signupForm.password ||
                !signupForm.full_name
              }
              className="w-full text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {signup.isPending || accept.isPending ? 'Creating account…' : 'Sign up & join studio'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
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
