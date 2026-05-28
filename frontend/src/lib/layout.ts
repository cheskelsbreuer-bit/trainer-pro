// Layout config — the coach's chosen ARRANGEMENT. v1 covers menu order
// (drag the tabs into the order you want). Stored per-trainer in
// trainers.public_profile.layout. Designed to grow into full
// drag-to-place dashboard widgets.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from '../hooks/useAuth';

export interface LayoutConfig {
  /** Ordered list of nav route ids ('/', '/clients', …). Items not in
   *  the list fall back to their natural order, appended after. */
  navOrder: string[];
}

export const EMPTY_LAYOUT: LayoutConfig = { navOrder: [] };

interface ProfileRow {
  public_profile: Record<string, unknown> | null;
}

function hydrate(raw: unknown): LayoutConfig {
  const r = (raw ?? {}) as Partial<LayoutConfig>;
  return { navOrder: Array.isArray(r.navOrder) ? r.navOrder : [] };
}

export function useLayout() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['layout', user?.id],
    queryFn: async (): Promise<LayoutConfig> => {
      const { data, error } = await supabase
        .from('trainers')
        .select('public_profile')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      const profile = (data as ProfileRow).public_profile ?? {};
      return hydrate((profile as Record<string, unknown>).layout);
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async (next: LayoutConfig) => {
      if (!user) throw new Error('Not signed in');
      const { data: cur, error: e1 } = await supabase
        .from('trainers')
        .select('public_profile')
        .eq('id', user.id)
        .single();
      if (e1) throw e1;
      const profile = ((cur as ProfileRow | null)?.public_profile ?? {}) as Record<string, unknown>;
      const { error } = await supabase
        .from('trainers')
        .update({ public_profile: { ...profile, layout: next } })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['layout'] }),
  });

  return { layout: query.data ?? EMPTY_LAYOUT, isLoading: query.isLoading, save };
}

/** Sort a list of items by the saved order. Items absent from the order
 *  keep their original relative position, appended after the ordered ones. */
export function applyNavOrder<T extends { to: string }>(items: T[], order: string[]): T[] {
  if (!order || order.length === 0) return items;
  const rank = new Map(order.map((to, i) => [to, i]));
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const ra = rank.has(a.item.to) ? rank.get(a.item.to)! : 1000 + a.i;
      const rb = rank.has(b.item.to) ? rank.get(b.item.to)! : 1000 + b.i;
      return ra - rb;
    })
    .map((x) => x.item);
}
