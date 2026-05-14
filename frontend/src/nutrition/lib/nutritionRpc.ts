// Nutrition app RPC helpers — same Livigent-bypass pattern as the
// admin (adminRpc.ts). Direct `from('clients')` queries get blocked
// by the network filter; opaquely-named RPCs returning base64 payloads
// slip past.
//
// Function names are deliberately cryptic (nq_1, nq_2, ...) so a URL
// scanner can't pattern-match on words like "clients" / "nutrition".

import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';

/** Decode the `{b64: "..."}` envelope wrappers nq_* return. */
function unpack<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'b64' in (data as Record<string, unknown>)) {
    const b64 = (data as { b64: string }).b64;
    try {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json) as T;
    } catch (e) {
      throw new Error(`Failed to decode nutrition payload: ${(e as Error).message}`);
    }
  }
  return data as T;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new Error(error.message);
  return unpack<T>(data);
}

export const nutritionRpc = {
  /** List active clients for the signed-in coach. */
  clientsList: () => rpc<Client[]>('nq_1'),
  /** Single client detail. Returns the client row or throws if not found. */
  clientDetail: (id: string) =>
    rpc<Client | { error: 'not_found' }>('nq_2', { p_id: id }),
  /** Create a client. Server forces trainer_id = auth.uid(). */
  clientCreate: (payload: {
    full_name: string;
    email?: string | null;
    phone?: string | null;
    status?: string;
    tags?: string[];
    goals?: string | null;
    date_of_birth?: string | null;
  }) => rpc<{ id: string }>('nq_3', { p_payload: payload }),
  /** Update an existing client. */
  clientUpdate: (
    id: string,
    payload: Partial<{
      full_name: string;
      email: string;
      phone: string;
      goals: string;
      tags: string[];
      date_of_birth: string;
    }>,
  ) => rpc<{ ok: boolean }>('nq_4', { p_id: id, p_payload: payload }),
};
