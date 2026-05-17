// Members — the studio's clients with their active passes shown
// alongside. Pulls from the same public.clients table as every other
// template; pass / membership records live on the studio config.

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import { useStudioConfig, type Pass } from '../lib/studioConfig';
import { S, HEADING_FONT, shortDate, fmtMoney } from '../theme';

export function MembersPage() {
  const { user } = useAuth();
  const { data: cfg, save } = useStudioConfig();
  const [q, setQ] = useState('');
  const [issuing, setIssuing] = useState<Client | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['studio-clients', user?.id],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', user!.id)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((c) => c.full_name.toLowerCase().includes(needle));
  }, [clients, q]);

  const passByClient = useMemo(() => {
    const m = new Map<string, Pass[]>();
    for (const p of cfg?.passes ?? []) {
      if (!m.has(p.clientId)) m.set(p.clientId, []);
      m.get(p.clientId)!.push(p);
    }
    return m;
  }, [cfg]);

  function activePass(clientId: string): Pass | null {
    const today = new Date().toISOString().slice(0, 10);
    const list = passByClient.get(clientId) ?? [];
    return (
      list
        .filter((p) => !p.expiresOn || p.expiresOn >= today)
        .filter((p) => p.type === 'unlimited' || (p.classesRemaining ?? 0) > 0)
        .sort((a, b) => b.purchasedOn.localeCompare(a.purchasedOn))[0] ?? null
    );
  }

  function issuePass(client: Client, draft: Partial<Pass>) {
    if (!cfg) return;
    const pass: Pass = {
      id: `pa-${Date.now()}`,
      clientId: client.id,
      type: draft.type ?? 'pack',
      label: draft.label ?? '10-class pack',
      classesRemaining: draft.classesRemaining,
      originalSize: draft.classesRemaining,
      expiresOn: draft.expiresOn,
      purchasedOn: new Date().toISOString().slice(0, 10),
    };
    save.mutate({ ...cfg, passes: [...cfg.passes, pass] });
    setIssuing(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <p style={lbl}>Roster</p>
          <h1 style={h1}>Members</h1>
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 14 }}>
        <Search
          size={14}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: S.mute }}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search members…"
          style={{ width: '100%', padding: '9px 12px 9px 34px', border: `1px solid ${S.rule}`, borderRadius: 8, fontSize: '0.88rem', outline: 'none', fontFamily: HEADING_FONT }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={emptyCard}>
          <p style={{ color: S.mute, margin: 0 }}>No members match.</p>
        </div>
      ) : (
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.rule}`, overflow: 'hidden' }}>
          {filtered.map((c, idx) => {
            const pass = activePass(c.id);
            return (
              <div
                key={c.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 220px 100px',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 18px',
                  borderTop: idx > 0 ? `1px solid ${S.ruleSoft}` : 'none',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: S.ink, fontSize: '0.94rem' }}>{c.full_name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: S.mute }}>
                    {c.phone || c.email || `Member since ${shortDate(c.created_at)}`}
                  </p>
                </div>
                <div>
                  {pass ? (
                    <span
                      style={{
                        background: S.okSoft,
                        color: S.ok,
                        padding: '3px 9px',
                        borderRadius: 12,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      {pass.type === 'unlimited'
                        ? `Unlimited · until ${pass.expiresOn ?? '∞'}`
                        : `${pass.classesRemaining}/${pass.originalSize} left`}
                    </span>
                  ) : (
                    <span
                      style={{
                        background: S.warnSoft,
                        color: S.warn,
                        padding: '3px 9px',
                        borderRadius: 12,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      No active pass
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => setIssuing(c)} style={smallBtn}>
                    <Plus size={12} /> Pass
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {issuing && (
        <PassIssueModal client={issuing} onIssue={issuePass} onClose={() => setIssuing(null)} />
      )}
    </div>
  );
}

function PassIssueModal({
  client,
  onIssue,
  onClose,
}: {
  client: Client;
  onIssue: (c: Client, p: Partial<Pass>) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<Pass['type']>('pack');
  const [size, setSize] = useState(10);
  const [expires, setExpires] = useState('');

  function makeLabel(): string {
    if (type === 'unlimited') return 'Unlimited monthly';
    if (type === 'drop-in') return 'Drop-in';
    return `${size}-class pack`;
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: S.ink }}>
            Issue pass to {client.full_name}
          </h2>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <F label="Pass type">
            <select value={type} onChange={(e) => setType(e.target.value as Pass['type'])} style={inp}>
              <option value="pack">Class pack</option>
              <option value="unlimited">Unlimited monthly</option>
              <option value="drop-in">Single drop-in</option>
            </select>
          </F>
          {type === 'pack' && (
            <F label="Number of classes">
              <input
                type="number"
                min="1"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value) || 1)}
                style={inp}
              />
            </F>
          )}
          <F label="Expires on (optional)">
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} style={inp} />
          </F>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() =>
                onIssue(client, {
                  type,
                  label: makeLabel(),
                  classesRemaining: type === 'pack' ? size : type === 'drop-in' ? 1 : undefined,
                  expiresOn: expires || undefined,
                })
              }
              style={primaryBtn}
            >
              ✓ Issue pass
            </button>
            <button onClick={onClose} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: '0.72rem', color: S.mute, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, margin: 0 };
const h1: React.CSSProperties = { fontSize: '1.6rem', fontWeight: 800, color: S.ink, margin: '4px 0 0', lineHeight: 1.1 };
const emptyCard: React.CSSProperties = { background: S.card, border: `1px dashed ${S.rule}`, borderRadius: 12, padding: 28, textAlign: 'center' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 };
const modal: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: 22, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', fontFamily: HEADING_FONT };
const iconBtn: React.CSSProperties = { background: 'transparent', border: 'none', color: S.mute, cursor: 'pointer' };
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: `1px solid ${S.rule}`, borderRadius: 8, fontSize: '0.88rem', fontFamily: HEADING_FONT, outline: 'none' };
const smallBtn: React.CSSProperties = { background: S.primarySoft, color: S.primary, border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: HEADING_FONT };
const primaryBtn: React.CSSProperties = { background: S.primary, color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: 5 };
const ghostBtn: React.CSSProperties = { background: 'transparent', color: S.mute, border: `1px solid ${S.rule}`, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem' };

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: S.inkSoft, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

// suppress unused
void fmtMoney;
