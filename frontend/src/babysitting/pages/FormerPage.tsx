// Former — kids who have left. Nothing is deleted: their whole history
// (payments, charges, notes) stays put, and they can come back any time.

import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { Client } from '../../lib/database.types';
import { B, readFamilySlug, familyLabel, readBalance, readStartDate, shortDate } from '../theme';
import { useKids, useSetKidStatus } from '../lib/data';
import { useBabysittingConfig, appendLog } from '../lib/config';
import {
  Card,
  SectionTitle,
  EmptyState,
  Btn,
  BalancePill,
  Avatar,
  TableWrap,
  Th,
  Td,
} from '../components/ui';

export function FormerPage() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const { data: kids, isLoading } = useKids();
  const cfg = useBabysittingConfig();
  const setStatus = useSetKidStatus();

  const former = useMemo(
    () => (kids ?? []).filter((k) => k.status === 'archived'),
    [kids],
  );

  async function bringBack(kid: Client) {
    const ok = window.confirm(
      `Bring ${kid.full_name} back? They'll show up as an active kid again, with all their history intact.`,
    );
    if (!ok) return;
    try {
      await setStatus.mutateAsync({ id: kid.id, status: 'active' });
      if (cfg.data) {
        cfg.save.mutate(appendLog(cfg.data, 'kid', `${kid.full_name} is back in care`));
      }
    } catch {
      window.alert('Could not bring them back — please try again.');
    }
  }

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Loading…</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <SectionTitle style={{ marginBottom: 0 }}>👋 Former kids</SectionTitle>
      <div style={{ color: B.mute, fontSize: '0.85rem', margin: '-4px 2px 4px' }}>
        Kids who have left keep their whole history — payments, notes, everything — in case they ever come back.
      </div>

      {former.length ? (
        <TableWrap>
          <thead>
            <tr>
              <Th>Kid</Th>
              <Th>Family</Th>
              <Th>Parting balance</Th>
              <Th>Started</Th>
              {editMode && <Th style={{ textAlign: 'right' }} />}
            </tr>
          </thead>
          <tbody>
            {former.map((k) => {
              const fam = readFamilySlug(k);
              return (
                <tr key={k.id}>
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={k.full_name} size={32} />
                      <Link
                        to={`/kids/${k.id}`}
                        style={{ fontWeight: 800, color: B.ink, textDecoration: 'none' }}
                      >
                        {k.full_name}
                      </Link>
                    </div>
                  </Td>
                  <Td style={{ color: B.inkSoft }}>{fam ? familyLabel(fam) : '—'}</Td>
                  <Td>
                    <BalancePill balance={readBalance(k)} />
                  </Td>
                  <Td style={{ color: B.inkSoft }}>{shortDate(readStartDate(k))}</Td>
                  {editMode && (
                    <Td style={{ textAlign: 'right' }}>
                      <Btn size="sm" kind="soft" onClick={() => bringBack(k)} disabled={setStatus.isPending}>
                        ↩ Bring back
                      </Btn>
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      ) : (
        <Card pad={0}>
          <EmptyState
            emoji="💛"
            title="Nobody has left — everyone's still with you 💛"
            body="If a family ever moves on, they'll appear here with their history kept safe."
          />
        </Card>
      )}
    </div>
  );
}
