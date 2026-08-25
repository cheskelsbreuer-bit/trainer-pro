// "Invite parent" — creates a portal invite for the family, then offers
// to send it the way she actually talks to parents: text, email, or a
// plain copied link. The parent opens it, makes a login, and the server
// links every sibling to their account on first portal visit.

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client } from '../../lib/database.types';
import { B, readParent } from '../theme';
import { smsLink, mailtoLink, familySummary } from '../lib/messages';
import { useDemo } from '../demo/flag';
import { Btn } from './ui';

function makeToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Invite links always use the canonical public address — never the URL
// the sitter happens to be browsing on (a preview URL would show parents
// an access-denied wall, and bare hosts can route differently).
const CANONICAL_ORIGIN = 'https://www.trainerpro.coach';
function inviteOrigin(): string {
  return import.meta.env.PROD ? CANONICAL_ORIGIN : window.location.origin;
}

export function InviteParentButton({ kids }: { kids: Client[] }) {
  const { user } = useAuth();
  const demo = useDemo();
  const [state, setState] = useState<'idle' | 'busy' | 'ready' | 'copied' | 'error'>('idle');
  const [link, setLink] = useState<string | null>(null);

  const fam = familySummary(kids);
  const firstKid = kids[0];
  const parent = fam.parentName || (firstKid ? readParent(firstKid) : '') || 'there';

  async function createInvite() {
    if (!firstKid) return;
    setState('busy');
    try {
      const token = makeToken();
      if (demo) {
        // No database in the demo — but the link, the text, and the email
        // are built exactly as they are for a real sitter.
        setLink(`${CANONICAL_ORIGIN}/portal-join/${token}`);
        setState('ready');
        return;
      }
      if (!user) return;
      const { error } = await supabase.from('client_portal_invites').insert({
        trainer_id: user.id,
        client_id: firstKid.id,
        token,
      });
      if (error) throw error;
      setLink(`${inviteOrigin()}/portal-join/${token}`);
      setState('ready');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2600);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setState('copied');
      setTimeout(() => setState('ready'), 2000);
    } catch {
      window.prompt('Send this link to the parent:', link);
    }
  }

  if ((state === 'ready' || state === 'copied') && link) {
    const msg = `Hi ${parent}! Here's your personal link to our family portal — you can see your kids' schedule and balance anytime. Tap to set it up: ${link}`;
    const emailBody = `Hi ${parent},\n\nHere's your personal link to our family portal — you can see your kids' schedule and balance anytime:\n\n${link}\n\nIt takes a minute to set up. See you soon!`;
    const chip: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '6px 11px',
      borderRadius: B.pill,
      fontSize: '0.76rem',
      fontWeight: 800,
      textDecoration: 'none',
      cursor: 'pointer',
      border: `1.5px solid ${B.rule}`,
      background: '#fff',
      color: B.inkSoft,
      fontFamily: B.fontDisplay,
    };
    return (
      <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {fam.phone && (
          <a href={smsLink(fam.phone, msg)} style={{ ...chip, background: B.primary, color: '#fff', border: 'none' }}>
            📱 Text invite
          </a>
        )}
        {fam.email && (
          <a href={mailtoLink(fam.email, 'Your family portal login', emailBody)} style={{ ...chip, background: B.accent, color: '#fff', border: 'none' }}>
            ✉️ Email invite
          </a>
        )}
        <button onClick={() => void copy()} style={chip}>
          {state === 'copied' ? '✓ Copied!' : '📋 Copy link'}
        </button>
        <button
          onClick={() => {
            setState('idle');
            setLink(null);
          }}
          title="Done"
          style={{ ...chip, border: 'none', background: 'transparent', color: B.mute, padding: '6px 4px' }}
        >
          ×
        </button>
      </span>
    );
  }

  return (
    <Btn
      size="sm"
      kind="accent"
      onClick={() => void createInvite()}
      disabled={state === 'busy'}
      title="Create a login link for the parent"
    >
      {state === 'error' ? 'Try again' : state === 'busy' ? '…' : '🔗 Invite parent'}
    </Btn>
  );
}
