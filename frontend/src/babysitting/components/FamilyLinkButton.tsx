// "Text her the link" — the whole parent onboarding, for a mother who
// will never make an account.
//
// One tap makes (or re-uses) a link for this family and opens her texting
// app with the message written. The parent taps it and her page opens.
// That is the entire flow: no invite to accept, no email, no password,
// nothing installed.
//
// The link is the credential, so the two things that matter here are that
// there is only ever ONE live link per family, and that the sitter can
// take it back. Both live in supabase/48_family_link_no_account.sql.

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import { B, readParent } from '../theme';
import { familySummary, smsLink } from '../lib/messages';
import { useDemo } from '../demo/flag';
import { useViewAs } from '../lib/viewAs';

const CANONICAL_ORIGIN = 'https://www.trainerpro.coach';
function linkOrigin(): string {
  return import.meta.env.PROD ? CANONICAL_ORIGIN : window.location.origin;
}

const chip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: `1px solid ${B.rule}`,
  background: B.card,
  color: B.inkSoft,
  borderRadius: 999,
  padding: '7px 13px',
  fontSize: '0.79rem',
  fontWeight: 800,
  cursor: 'pointer',
  textDecoration: 'none',
  minHeight: 38,
};

export function FamilyLinkButton({ kids }: { kids: Client[] }) {
  const demo = useDemo();
  const viewing = useViewAs();
  const [state, setState] = useState<'idle' | 'busy' | 'ready' | 'copied' | 'error'>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const fam = familySummary(kids);
  const firstKid = kids[0];
  const parent = fam.parentName || (firstKid ? readParent(firstKid) : '') || 'there';

  async function make() {
    if (!firstKid || viewing) return;
    setState('busy');
    setErr('');
    try {
      if (demo) {
        // The demo has no database. The link is built exactly as it is for
        // a real sitter so the flow is honest; it just doesn't resolve.
        setUrl(`${CANONICAL_ORIGIN}/f/demo-link-not-real`);
        setState('ready');
        return;
      }
      const { data, error } = await supabase.rpc('family_link_create', {
        p_client_id: firstKid.id,
      });
      if (error) throw new Error(error.message);
      const token = (data as { token?: string } | null)?.token;
      if (!token) throw new Error('No link came back.');
      setUrl(`${linkOrigin()}/f/${token}`);
      setState('ready');
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Could not make a link.';
      setErr(
        /does not exist|schema cache|find the function/i.test(m)
          ? 'Run supabase/48_family_link_no_account.sql first.'
          : m,
      );
      setState('error');
      window.setTimeout(() => setState('idle'), 5000);
    }
  }

  const message = url
    ? `Hi ${parent}! Here's your page — it shows what's owed, and you can message me right from it. ` +
      `Nothing to install: ${url}`
    : '';

  if (state === 'ready' && url) {
    return (
      <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {fam.phone && (
          <a
            href={smsLink(fam.phone, message)}
            style={{ ...chip, background: B.primary, color: '#fff', border: 'none' }}
          >
            📱 Text it to {parent}
          </a>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setState('copied');
              window.setTimeout(() => setState('ready'), 1800);
            } catch {
              /* a phone without clipboard permission — the link is on screen */
            }
          }}
          style={chip}
        >
          📋 Copy link
        </button>
        <button
          type="button"
          onClick={() => {
            setState('idle');
            setUrl(null);
          }}
          title="Done"
          style={{ ...chip, border: 'none', background: 'transparent', color: B.mute, padding: '6px 4px' }}
        >
          ✕
        </button>
        <span style={{ fontSize: '0.72rem', color: B.mute, flexBasis: '100%' }}>
          Same link every time you tap this. Anyone she forwards it to can see the page too.
        </span>
      </span>
    );
  }

  if (state === 'copied') {
    return <span style={{ ...chip, color: B.green, borderColor: B.green }}>✓ Copied</span>;
  }

  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => void make()}
        disabled={state === 'busy' || !firstKid || !!viewing}
        style={{ ...chip, background: B.accent, color: '#fff', border: 'none' }}
      >
        {state === 'busy' ? 'Making it…' : '🔗 Text her the link'}
      </button>
      {state === 'error' && (
        <span style={{ fontSize: '0.74rem', color: B.red, fontWeight: 700 }}>{err}</span>
      )}
    </span>
  );
}
