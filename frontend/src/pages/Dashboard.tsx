// Dashboard router. The dashboard the trainer sees is determined by the
// primary template they picked in onboarding — group-class studios get a
// fundamentally different page from solo private trainers.
//
// Variant-specific files live in src/dashboards/. When we add new variants
// (martial arts dojo, nutrition coach, online coach, etc.) they'll plug
// in here.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Trainer } from '../lib/database.types';
import { pickTemplateUx } from '../lib/templateUx';
import { PrivateDashboard } from '../dashboards/PrivateDashboard';
import { StudioDashboard } from '../dashboards/StudioDashboard';

export function Dashboard() {
  const { user } = useAuth();

  const { data: trainer } = useQuery({
    queryKey: ['trainer', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as Trainer;
    },
    enabled: !!user,
  });

  const variant = pickTemplateUx(trainer?.template_slugs).dashboardVariant;

  if (variant === 'studio') return <StudioDashboard trainer={trainer} />;
  return <PrivateDashboard trainer={trainer} />;
}
