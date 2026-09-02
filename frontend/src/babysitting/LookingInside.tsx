// The bar along the bottom while an admin is reading someone's account.
//
// It does not mount an app. It doesn't have to: useAuth hands every page
// the other account's id, so the normal tree renders WHICHEVER app that
// account opens — babysitting, the 1-on-1 Coach app, the classic one —
// with that account's rows in it. This is the part that says whose account
// you are in, gets you out again, and answers the question you came for:
// what have they actually set up.
//
// (The first version of this did take over the tree, and could only ever
// show the babysitting app. That is why an account signed up as a solo
// trainer opened to empty screens.)

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminRpc } from '../lib/adminRpc';
import { setViewAsTarget } from './lib/viewAs';
import { SetupReport, buildReport } from './SetupReport';

/** Close the window: tell the database to forget the target, drop the tab
 *  flag, and go back to admin. The database call comes first — if it fails
 *  we still clear the flag, because being stuck inside somebody's account
 *  would be far worse than a stale row that grants a read nobody is using. */
export async function leaveAccount(): Promise<void> {
  try {
    await adminRpc.viewStop();
  } catch {
    /* fall through — clearing the flag is what actually gets you out */
  }
  setViewAsTarget(null);
  window.location.replace('/hq');
}

export function LookingInsideBar({ trainerId }: { trainerId: string }) {
  const [showReport, setShowReport] = useState(false);

  const snap = useQuery({
    queryKey: ['view-as-report', trainerId],
    queryFn: () => adminRpc.viewAs(trainerId),
    // One read, held for the visit. There is nothing live to keep up with:
    // you are not the one editing.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Shift+Esc always gets you out, even if a page has covered the bar with
  // a modal or a full-screen photo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && e.shiftKey) void leaveAccount();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // A page whose save was refused prints its own message, and those were
  // written for a broken connection, not for this. Say what really
  // happened, over the top of whatever it said.
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    let timer: number | undefined;
    const onBlocked = () => {
      setBlocked(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setBlocked(false), 6000);
    };
    window.addEventListener('tp-view-as-blocked', onBlocked);
    return () => {
      window.removeEventListener('tp-view-as-blocked', onBlocked);
      window.clearTimeout(timer);
    };
  }, []);

  // Anything but a well-formed snapshot means the report is unavailable —
  // most likely 45 has been run but 43 hasn't. That must never take the
  // page down: this bar is also the way out of the account, so it has to
  // render even when the thing it decorates is missing.
  const s = snap.data && typeof snap.data === 'object' && snap.data.trainer ? snap.data : null;
  const who = s
    ? s.trainer.business_name || s.trainer.full_name || s.trainer.email || 'this account'
    : 'this account';
  let report: ReturnType<typeof buildReport> | null = null;
  try {
    report = s ? buildReport(s) : null;
  } catch {
    report = null;
  }
  const done = report ? report.filter((c) => c.verdict === 'done').length : 0;

  return (
    <>
      {blocked && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 56,
            zIndex: 10000,
            maxWidth: 460,
            margin: '0 auto',
            background: '#7a2e26',
            color: '#fff',
            borderRadius: 10,
            padding: '11px 14px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '0.86rem',
            lineHeight: 1.45,
            boxShadow: '0 -8px 30px rgba(0,0,0,0.35)',
          }}
        >
          Nothing was saved. That would have changed their account, and you are
          only reading it — whatever the page just told you, your connection is
          fine.
        </div>
      )}
      {showReport && s && (
        <div
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 56,
            zIndex: 9998,
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
          zIndex: 9999,
          background: '#2b2620',
          color: '#fff',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '0.85rem',
          lineHeight: 1.45,
        }}
      >
        <span style={{ marginRight: 'auto', minWidth: 0 }}>
          👀 Looking inside <strong>{who}</strong> — read only. Nothing you do here
          changes their account, and they are not told you looked.
        </span>
        {report && (
          <button
            type="button"
            onClick={() => setShowReport((v) => !v)}
            style={ghost}
          >
            {showReport ? 'Hide' : `What they've set up — ${done}/${report.length}`}
          </button>
        )}
        <button type="button" onClick={() => void leaveAccount()} style={ghost}>
          Leave
        </button>
      </div>
    </>
  );
}

const ghost: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.4)',
  borderRadius: 999,
  padding: '6px 14px',
  background: 'transparent',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  flex: 'none',
};
