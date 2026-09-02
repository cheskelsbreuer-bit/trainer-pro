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
const client = createClient(
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

// ── The read-only latch ───────────────────────────────────────────────
//
// While an admin is looking inside somebody else's account, no write may
// leave this browser. The database already refuses them — an admin is
// granted SELECT on that account and nothing else — but a refusal arriving
// as a policy error, halfway through a form, is a poor way to find out.
//
// So the client itself stops them here. It is deliberately at this level
// rather than on the buttons: the babysitting app hides the buttons it
// knows about, the classic and Coach apps have hundreds between them, and
// one missed button would be a write attempt on a stranger's data. Reads
// are untouched, which is the whole point of being in there.
const WRITE_VERBS = ['insert', 'update', 'upsert', 'delete'] as const;

function lookingAtSomeoneElse(): boolean {
  try {
    return !!window.sessionStorage.getItem('tp-view-as');
  } catch {
    return false;
  }
}

const READ_ONLY_MESSAGE =
  "You're looking at this account read-only. Nothing here can be changed. " +
  'Press Leave at the bottom of the screen to go back to your own.';

export const supabase = new Proxy(client, {
  get(target, prop, receiver) {
    if (prop !== 'from') return Reflect.get(target, prop, receiver);
    return (table: string) => {
      const builder = target.from(table);
      if (!lookingAtSomeoneElse()) return builder;
      return new Proxy(builder, {
        get(b, key, r) {
          if (WRITE_VERBS.includes(key as (typeof WRITE_VERBS)[number])) {
            return () => {
              // Say so out loud as well as throwing. Pages catch a failed
              // save and print their own line — the Coach app's is
              // "check the connection and try again", which would send
              // someone off debugging their wifi. The bar at the bottom
              // listens for this and says what really happened.
              window.dispatchEvent(
                new CustomEvent('tp-view-as-blocked', { detail: { table } }),
              );
              throw new Error(READ_ONLY_MESSAGE);
            };
          }
          return Reflect.get(b, key, r);
        },
      });
    };
  },
}) as typeof client;

export const isConfigured = !!url && !!anonKey;
