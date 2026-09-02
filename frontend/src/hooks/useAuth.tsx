import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { viewAsTarget } from '../babysitting/lib/viewAs';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate from existing session immediately so we don't flash the login screen.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // "Look inside their app": while an admin is reading someone else's
  // account, every page in every app should ask the database for THAT
  // account's rows. They all ask the same way — filter by the signed-in
  // user's id — so swapping the id here does the whole job, once, instead
  // of rerouting each page's queries one at a time. Babysitting, the 1-on-1
  // Coach app and the classic app all work with no changes of their own.
  //
  // This grants nothing by itself. Changing the id only changes which rows
  // are asked for; whether any come back is row-level security's decision,
  // and it says yes only to an admin — see
  // supabase/45_admin_read_any_account.sql. Someone who is not an admin and
  // sets the flag by hand gets an empty screen and nothing else.
  //
  // The session is deliberately left alone: session.user is still really
  // them, so signing out, token refresh, and anything reading the session
  // directly all behave normally.
  const lookingAt = viewAsTarget();
  const realUser = session?.user ?? null;
  const user =
    lookingAt && realUser && realUser.id !== lookingAt
      ? ({ ...realUser, id: lookingAt } as User)
      : realUser;

  const value: AuthContextValue = {
    user,
    session,
    loading,

    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },

    async signUp(email, password, fullName) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      return { error: error?.message ?? null };
    },

    async sendMagicLink(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      return { error: error?.message ?? null };
    },

    async signOut() {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
