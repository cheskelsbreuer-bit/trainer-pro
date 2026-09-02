// The admin's window onto a client's babysitting app.
//
// It mounts the REAL app — same pages, same components, same layout the
// client sees — with one substitution: every read comes from a snapshot
// fetched through the admin RPC instead of from this browser's session,
// and every write is refused before it can reach the database.
//
// It takes over the whole tree while the per-tab flag is set, for the same
// reason the demo does: BabysittingApp brings its own <Routes> and its nav
// links are absolute, so /kids and /billing have to resolve at the root.

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminRpc } from '../lib/adminRpc';
import type { Trainer } from '../lib/database.types';
import { BabysittingApp } from './BabysittingApp';
import { ViewAsProvider, setViewAsTarget } from './lib/viewAs';
import { SetupReport, buildReport } from './SetupReport';

function leave() {
  setViewAsTarget(null);
  window.location.replace('/hq');
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#faf7f2',
        color: '#2b2620',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 460, display: 'grid', gap: 14, justifyItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

function LeaveButton({ label = 'Back to admin' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={leave}
      style={{
        border: 'none',
        borderRadius: 999,
        padding: '10px 18px',
        background: '#2b2620',
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.9rem',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export function LookingInside({ trainerId }: { trainerId: string }) {
  const snap = useQuery({
    queryKey: ['view-as', trainerId],
    queryFn: () => adminRpc.viewAs(trainerId),
    // One read, held for the visit. Refetching behind the admin's back
    // would make the screen change while they are reading it, and there
    // is nothing live to keep up with — they are not the one editing.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Escape always gets you out, even if a page inside has swallowed the
  // banner (a modal, a full-screen photo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && e.shiftKey) leave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (snap.isLoading) {
    return (
      <Centered>
        <div style={{ fontSize: '2rem' }}>👀</div>
        <div style={{ fontWeight: 700 }}>Opening their app…</div>
      </Centered>
    );
  }

  if (snap.isError || !snap.data) {
    const msg = snap.error instanceof Error ? snap.error.message : 'Could not open that account.';
    const missing = /function .*ck_q12|does not exist|schema cache/i.test(msg);
    return (
      <Centered>
        <div style={{ fontSize: '2rem' }}>🚧</div>
        <div style={{ fontWeight: 700 }}>Could not open that account</div>
        <p style={{ fontSize: '0.9rem', color: '#6b6156', margin: 0 }}>
          {missing
            ? 'The database does not have this feature yet. Run supabase/43_admin_view_as.sql in the Supabase SQL editor, then try again.'
            : msg}
        </p>
        <LeaveButton />
      </Centered>
    );
  }

  return <Inside snapshot={snap.data} />;
}

function Inside({ snapshot: s }: { snapshot: import('./lib/viewAs').ViewAsSnapshot }) {
  const [showReport, setShowReport] = useState(false);
  const who = s.trainer.business_name || s.trainer.full_name || s.trainer.email || 'this account';
  const report = buildReport(s);
  const done = report.filter((c) => c.verdict === 'done').length;

  return (
    <ViewAsProvider snapshot={s}>
      <div style={{ paddingBottom: 54 }}>
        <BabysittingApp trainer={s.trainer as unknown as Trainer} />
      </div>
      {/* Bottom, not top: the app's own header is sticky, and a banner
          that pushes it down changes the layout the client actually has. */}
      {showReport && (
        <div
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 56,
            zIndex: 201,
            maxWidth: 560,
            margin: '0 auto',
          }}
        >
          <SetupReport snapshot={s} />
        </div>
      )}
      <div
        role="status"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 202,
          background: '#2b2620',
          color: '#fff',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '0.85rem',
        }}
      >
        <span style={{ marginRight: 'auto' }}>
          👀 Looking inside <strong>{who}</strong> — read only. Nothing you do here
          changes their account, and they are not told you looked.
        </span>
        <button
          type="button"
          onClick={() => setShowReport((v) => !v)}
          style={{
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 999,
            padding: '6px 14px',
            background: 'transparent',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {showReport ? 'Hide' : `What they've set up — ${done}/${report.length}`}
        </button>
        <button
          type="button"
          onClick={leave}
          style={{
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 999,
            padding: '6px 14px',
            background: 'transparent',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Leave
        </button>
      </div>
    </ViewAsProvider>
  );
}
