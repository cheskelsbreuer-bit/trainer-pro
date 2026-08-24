// Away — kids on a pause (vacation, summer at grandma's, a broken arm).
// Their record and balance stay put; they just don't count as "in care"
// until they're marked returned. Past time away stays as a quiet history.

import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { Client } from '../../lib/database.types';
import { B, readFamilySlug, familyLabel, readBalance, shortDate } from '../theme';
import { useKids, useSetKidStatus } from '../lib/data';
import { useBabysittingConfig, appendLog, type AwayRecord } from '../lib/config';
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
  Modal,
  Field,
  inputStyle,
  Chip,
} from '../components/ui';

export function AwayPage() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const { data: kids, isLoading } = useKids();
  const cfg = useBabysittingConfig();
  const setStatus = useSetKidStatus();

  const [showMarkAway, setShowMarkAway] = useState(false);
  const [awayKidId, setAwayKidId] = useState('');
  const [awayReason, setAwayReason] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const paused = useMemo(
    () => (kids ?? []).filter((k) => k.status === 'paused'),
    [kids],
  );
  const activeKids = useMemo(
    () => (kids ?? []).filter((k) => k.status === 'active'),
    [kids],
  );

  /** The open away record (no endedAt yet) for one kid, if any. */
  const openRecordFor = (clientId: string): AwayRecord | undefined =>
    cfg.data?.away.find((a) => a.clientId === clientId && !a.endedAt);

  const pastAway = useMemo<AwayRecord[]>(() => {
    return (cfg.data?.away ?? [])
      .filter((a) => !!a.endedAt)
      .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))
      .slice(0, 30);
  }, [cfg.data]);

  async function markReturned(kid: Client) {
    try {
      await setStatus.mutateAsync({ id: kid.id, status: 'active' });
      if (cfg.data) {
        const now = new Date().toISOString();
        const nextAway = cfg.data.away.map((a) =>
          a.clientId === kid.id && !a.endedAt ? { ...a, endedAt: now } : a,
        );
        cfg.save.mutate(
          appendLog({ ...cfg.data, away: nextAway }, 'away', `${kid.full_name} is back`),
        );
      }
    } catch {
      window.alert('Could not mark them returned — please try again.');
    }
  }

  async function markAway() {
    const kid = activeKids.find((k) => k.id === awayKidId);
    if (!kid) {
      setErr('Pick a kid.');
      return;
    }
    setErr('');
    setSaving(true);
    try {
      await setStatus.mutateAsync({ id: kid.id, status: 'paused' });
      if (cfg.data) {
        const record: AwayRecord = {
          id: 'aw-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          clientId: kid.id,
          kidName: kid.full_name,
          startedAt: new Date().toISOString(),
          reason: awayReason.trim() || undefined,
        };
        const next = appendLog(
          { ...cfg.data, away: [record, ...cfg.data.away] },
          'away',
          `${kid.full_name} marked away`,
          awayReason.trim() || undefined,
        );
        cfg.save.mutate(next);
      }
      setShowMarkAway(false);
      setAwayKidId('');
      setAwayReason('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not mark them away.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Loading…</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <SectionTitle
        right={
          editMode ? (
            <Btn size="sm" kind="soft" onClick={() => { setErr(''); setShowMarkAway(true); }}>
              ⏸ Mark someone away
            </Btn>
          ) : undefined
        }
      >
        ⏸ Away right now
      </SectionTitle>

      {paused.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {paused.map((k) => {
            const fam = readFamilySlug(k);
            const rec = openRecordFor(k.id);
            return (
              <Card key={k.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={k.full_name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      to={`/kids/${k.id}`}
                      style={{
                        fontFamily: B.fontDisplay,
                        fontWeight: 800,
                        fontSize: '0.98rem',
                        color: B.ink,
                        textDecoration: 'none',
                      }}
                    >
                      {k.full_name}
                    </Link>
                    <div style={{ fontSize: '0.76rem', color: B.mute, fontWeight: 700 }}>
                      {fam ? familyLabel(fam) : 'No family set'}
                    </div>
                  </div>
                  <BalancePill balance={readBalance(k)} />
                </div>
                <div style={{ marginTop: 12, fontSize: '0.82rem', color: B.inkSoft }}>
                  <span style={{ fontWeight: 800 }}>Away since:</span>{' '}
                  {rec ? shortDate(rec.startedAt) : '—'}
                  {rec?.reason && (
                    <div style={{ marginTop: 4, color: B.mute }}>“{rec.reason}”</div>
                  )}
                </div>
                {editMode && (
                  <div style={{ marginTop: 12 }}>
                    <Btn size="sm" kind="accent" onClick={() => markReturned(k)} disabled={setStatus.isPending}>
                      ▶ Mark returned
                    </Btn>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card pad={0}>
          <EmptyState
            emoji="🏡"
            title="Nobody is away"
            body="Everyone's here right now. When a kid goes on vacation or takes a break, mark them away and they'll wait here until they're back."
          />
        </Card>
      )}

      <div>
        <SectionTitle>Past time away</SectionTitle>
        {pastAway.length ? (
          <TableWrap>
            <thead>
              <tr>
                <Th>Kid</Th>
                <Th>From</Th>
                <Th>To</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {pastAway.map((a) => (
                <tr key={a.id}>
                  <Td style={{ fontWeight: 800 }}>{a.kidName}</Td>
                  <Td style={{ color: B.inkSoft }}>{shortDate(a.startedAt)}</Td>
                  <Td style={{ color: B.inkSoft }}>{shortDate(a.endedAt)}</Td>
                  <Td style={{ color: B.mute }}>{a.reason || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <div style={{ color: B.mute, fontSize: '0.85rem', padding: '4px 2px' }}>
            No past breaks recorded yet.
          </div>
        )}
      </div>

      {showMarkAway && (
        <Modal title="⏸ Mark someone away" onClose={() => setShowMarkAway(false)}>
          <Field label="Kid" hint="They'll stop counting as in care until they're back.">
            <select style={inputStyle} value={awayKidId} onChange={(e) => setAwayKidId(e.target.value)} autoFocus>
              <option value="">Pick a kid…</option>
              {activeKids.map((k) => {
                const fam = readFamilySlug(k);
                return (
                  <option key={k.id} value={k.id}>
                    {k.full_name}
                    {fam ? ` — ${familyLabel(fam)}` : ''}
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label="Reason (optional)">
            <input
              style={inputStyle}
              value={awayReason}
              onChange={(e) => setAwayReason(e.target.value)}
              placeholder="e.g. summer at Bubby's"
            />
          </Field>
          {err && <Chip tone="red" style={{ marginBottom: 12 }}>{err}</Chip>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn kind="ghost" onClick={() => setShowMarkAway(false)}>Cancel</Btn>
            <Btn onClick={markAway} disabled={saving}>
              {saving ? 'Saving…' : '⏸ Mark away'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
