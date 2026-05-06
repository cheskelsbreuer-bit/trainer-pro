import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

const DEFAULT_BRAND = '#2d6a9f';

// Sync the trainer's primary_color to a CSS variable on documentElement.
// Components can then style themselves with style={{ color: 'var(--brand)' }}
// or inline style with brandColor.
export function useBrandTheme() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['brand-color', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('primary_color')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return (data?.primary_color as string) || DEFAULT_BRAND;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const brand = data || DEFAULT_BRAND;

  useEffect(() => {
    document.documentElement.style.setProperty('--brand', brand);
    document.documentElement.style.setProperty('--brand-tint', hexToRgba(brand, 0.12));
    document.documentElement.style.setProperty('--brand-tint-strong', hexToRgba(brand, 0.18));
    return () => {
      // Don't unset — keep last value so flicker on route changes is minimal
    };
  }, [brand]);

  return brand;
}

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return `rgba(45, 106, 159, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
