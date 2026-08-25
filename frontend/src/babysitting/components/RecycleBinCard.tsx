// ♻ Recycle Bin — deleted payments wait here (newest 50). "Put back"
// re-records the payment exactly as it was and fixes the balance.

import { useOutletContext } from 'react-router-dom';
import { B, shortDate } from '../theme';
import { useKids, useRecordPayment } from '../lib/data';
import { useBabysittingConfig, appendLog, type BinEntry } from '../lib/config';
import { Card, SectionTitle, Btn, Chip } from './ui';

export function RecycleBinCard() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const cfg = useBabysittingConfig();
  const { data: kids } = useKids();
  const record = useRecordPayment();

  const bin = cfg.data?.bin ?? [];
  if (!bin.length) return null;

  async function putBack(entry: BinEntry) {
    if (!cfg.data) return;
    const kid = (kids ?? []).find((k) => k.id === entry.payment.client_id);
    if (!kid) {
      window.alert('That kid is no longer in the app, so this payment cannot go back automatically.');
      return;
    }
    try {
      await record.mutateAsync({
        client_id: entry.payment.client_id,
        amount: entry.payment.amount,
        paid_at: entry.payment.paid_at,
        method: entry.payment.method,
        description: entry.payment.description,
        currentTags: kid.tags ?? [],
      });
      cfg.save.mutate(
        appendLog(
          { ...cfg.data, bin: cfg.data.bin.filter((b) => b.id !== entry.id) },
          'payment',
          `Put back from bin: ${entry.label}`,
        ),
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not put it back.');
    }
  }

  function emptyBin() {
    if (!cfg.data) return;
    if (!window.confirm(`Empty the Recycle Bin? ${bin.length} item${bin.length === 1 ? '' : 's'} will be gone for good.`)) return;
    cfg.save.mutate(appendLog({ ...cfg.data, bin: [] }, 'settings', 'Emptied the Recycle Bin'));
  }

  return (
    <Card style={{ borderLeft: `4px solid ${B.plum}` }}>
      <SectionTitle
        right={
          editMode ? (
            <Btn size="sm" kind="danger" onClick={emptyBin}>Empty bin</Btn>
          ) : undefined
        }
      >
        ♻ Recycle Bin · {bin.length}
      </SectionTitle>
      <div style={{ color: B.inkSoft, fontSize: '0.84rem', marginBottom: 10 }}>
        Deleted payments wait here in case you change your mind. "Put back" restores the payment and the balance.
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {bin.map((entry) => (
          <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.87rem' }}>
            <span style={{ flex: 1, fontWeight: 700 }}>{entry.label}</span>
            <Chip tone="neutral">deleted {shortDate(entry.ts)}</Chip>
            {editMode && (
              <Btn size="sm" kind="soft" onClick={() => void putBack(entry)} disabled={record.isPending}>
                ↩ Put back
              </Btn>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
