import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud during dev; in prod we still construct a client to keep imports valid.
  // The login screen will display a clear "configure your env" message.
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local and fill in your Supabase project values.',
  );
}

// We intentionally don't pass <Database> here. The auto-generated types from
// `supabase gen types typescript` are stricter than our hand-written ones and
// fight with supabase-js v2's overload signatures. We use explicit `as` casts
// at query sites for read paths, which is good enough until we wire up codegen.
export const supabase = createClient(
  url ?? 'https://missing.supabase.co',
  anonKey ?? 'missing-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export const isConfigured = !!url && !!anonKey;
