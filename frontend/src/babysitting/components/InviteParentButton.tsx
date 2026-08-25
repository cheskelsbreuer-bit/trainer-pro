// "Invite parent" — creates a portal invite for the family and puts the
// link on the clipboard. The parent opens it, makes a login, and the
// server links every sibling to their account on first portal visit.

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client } from '../../lib/database.types';
import { Btn } from './ui';

function makeToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function InviteParentButton({ firstKid }: { firstKid: Client }) {
  const { user } = useAuth();
  const [state, setState] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle');

  async function invite() {
    if (!user) return;
    setState('busy');
    try {
      const token = makeToken();
      const { error } = await supabase.from('client_portal_invites').insert({
        trainer_id: user.id,
        client_id: firstKid.id,
        token,
      });
      if (error) throw error;
      const link = `${window.location.origin}/portal-join/${token}`;
      try {
        await navigator.clipboard.writeText(link);
        setState('copied');
      } catch {
        window.prompt('Send this link to the parent:', link);
        setState('idle');
        return;
      }
      setTimeout(() => setState('idle'), 2600);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2600);
    }
  }

  return (
    <Btn size="sm" kind="accent" onClick={() => void invite()} disabled={state === 'busy'} title="Create a login link for the parent">
      {state === 'copied' ? '✓ Link copied — send it!' : state === 'error' ? 'Try again' : state === 'busy' ? '…' : '🔗 Invite parent'}
    </Btn>
  );
}
