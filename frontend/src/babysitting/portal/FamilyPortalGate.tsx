// Decides which portal a signed-in non-trainer sees. If the account is
// linked to kids of a babysitting business → the warm FamilyPortal.
// If their trainer runs the 1-on-1 Coach app → the Coach client app.
// Anything else falls through to the original generic ClientPortal, so
// no other vertical's behavior changes.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client } from '../../lib/database.types';
import { COACH_TEMPLATE_SLUGS } from '../../lib/workspaces';
import { ClientPortal } from '../../pages/ClientPortal';
import { CoachClientApp } from '../../coach/client/CoachClientApp';
import { FamilyPortal, type PortalTrainer } from './FamilyPortal';

type PortalRow = Client & { trainers: PortalTrainer | null };

export function FamilyPortalGate() {
  const { user } = useAuth();
  const rows = useQuery({
    queryKey: ['portal-kids', user?.id],
    queryFn: async (): Promise<PortalRow[]> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*, trainers(full_name, business_name, primary_color, logo_url, template_slugs)')
        .eq('auth_user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as PortalRow[];
    },
    enabled: !!user,
  });

  if (rows.isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a8f85' }}>
        Opening your portal…
      </div>
    );
  }

  const kids = rows.data ?? [];
  const trainer = kids.find((k) => k.trainers)?.trainers ?? null;
  const isBabysitting = (trainer?.template_slugs ?? []).includes('babysitting');

  if (kids.length > 0 && isBabysitting) {
    return <FamilyPortal kids={kids} trainer={trainer} refetchKids={() => void rows.refetch()} />;
  }

  // 1-on-1 Coach clients get the new client app (shared logger, warm
  // design). Slug-scoped for the same reason the trainer side is.
  const coachRow = kids.find((k) =>
    (k.trainers?.template_slugs ?? []).some((s) => COACH_TEMPLATE_SLUGS.includes(s)),
  );
  if (coachRow) {
    return <CoachClientApp client={coachRow} trainer={coachRow.trainers} />;
  }

  return <ClientPortal />;
}
