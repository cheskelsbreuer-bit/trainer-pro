// 💡 A comment button that floats on every page of the app. The sitter
// (or anyone playing the demo) writes what they wish were different;
// it stays in the app — reopen it and every past comment is still
// there, with the builder's reply underneath once there is one.
//
// Storage is the existing `feedback` table, which the admin page
// already lists and can reply to (supabase/20_feedback_admin_reply.sql
// gives one optional reply per comment, plus mark-as-seen). The demo
// keeps comments in memory so visitors can try it without a database.

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { B } from '../theme';
import { chatTime } from '../lib/chat';
import { useDemo } from '../demo/flag';
import { Btn, Chip, inputStyle } from './ui';

interface CommentRow {
  id: string;
  message: string;
  created_at: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
  admin_reply_seen_at: string | null;
}

export function CommentWidget() {
  const { user } = useAuth();
  const demo = useDemo();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [demoRows, setDemoRows] = useState<CommentRow[]>([]);

  const rows = useQuery({
    queryKey: ['bs-comments', demo ? 'demo' : user?.id],
    queryFn: async (): Promise<CommentRow[]> => {
      if (demo) return demoRows;
      const { data, error } = await supabase
        .from('feedback')
        .select('id,message,created_at,admin_reply,admin_replied_at,admin_reply_seen_at')
        .eq('trainer_id', user!.id)
        .order('created_at', { ascending: true })
        .limit(80);
      if (error) throw error;
      return (data ?? []) as CommentRow[];
    },
    enabled: demo || !!user,
  });

  const send = useMutation({
    mutationFn: async (message: string) => {
      if (demo) {
        setDemoRows((prev) => [
          ...prev,
          {
            id: `demo-c-${Date.now()}`,
            message,
            created_at: new Date().toISOString(),
            admin_reply: null,
            admin_replied_at: null,
            admin_reply_seen_at: null,
          },
        ]);
        return;
      }
      const { error } = await supabase.from('feedback').insert({
        trainer_id: user!.id,
        trainer_email: user?.email ?? null,
        category: 'feature',
        message,
        user_agent: navigator.userAgent,
        url: window.location.href,
      });
      if (error) throw error;
      // Email it to the builder so it doesn't sit unseen. Fire-and-forget:
      // a notification hiccup must never lose her comment.
      void api('/reminders/comment-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      }).catch(() => undefined);
    },
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['bs-comments'] });
    },
  });

  const unseenReplies = useMemo(
    () => (rows.data ?? []).filter((r) => r.admin_reply && !r.admin_reply_seen_at).length,
    [rows.data],
  );

  // Opening the panel marks replies as seen (best-effort).
  useEffect(() => {
    if (!open || demo || !user || !unseenReplies) return;
    void supabase
      .from('feedback')
      .update({ admin_reply_seen_at: new Date().toISOString() })
      .eq('trainer_id', user.id)
      .not('admin_reply', 'is', null)
      .is('admin_reply_seen_at', null)
      .then(() => qc.invalidateQueries({ queryKey: ['bs-comments'] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unseenReplies]);

  const list = demo ? demoRows : rows.data ?? [];

  return (
    <>
      {/* The floating button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Tell us what you'd change"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 900,
          border: 'none',
          cursor: 'pointer',
          borderRadius: 999,
          padding: '11px 18px',
          fontSize: '0.86rem',
          fontWeight: 800,
          fontFamily: B.fontDisplay,
          background: B.ink,
          color: '#fff',
          boxShadow: B.shadow,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        💡 Comment
        {unseenReplies > 0 && (
          <span
            style={{
              background: B.red,
              borderRadius: 999,
              fontSize: '0.7rem',
              padding: '1px 7px',
            }}
          >
            {unseenReplies}
          </span>
        )}
      </button>

      {/* The panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            right: 18,
            bottom: 72,
            zIndex: 900,
            width: 'min(360px, calc(100vw - 36px))',
            background: B.card,
            borderRadius: B.radiusLg,
            border: `1px solid ${B.rule}`,
            boxShadow: B.shadow,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(480px, 70vh)',
          }}
        >
          <div
            style={{
              padding: '13px 16px 10px',
              borderBottom: `1px solid ${B.rule}`,
              fontFamily: B.fontDisplay,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ flex: 1 }}>💡 Wish something were different?</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                border: 'none',
                background: '#f2ede4',
                color: B.inkSoft,
                width: 26,
                height: 26,
                borderRadius: '50%',
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ overflowY: 'auto', padding: '12px 16px', display: 'grid', gap: 10 }}>
            {list.length === 0 ? (
              <div style={{ color: B.mute, fontSize: '0.84rem', lineHeight: 1.5 }}>
                Anything you'd add, change, or that bugs you — write it here. It goes straight to
                the person who builds the app, and their answer shows up right here.
              </div>
            ) : (
              list.map((r) => (
                <div key={r.id} style={{ display: 'grid', gap: 6 }}>
                  <div
                    style={{
                      background: '#f2ede4',
                      borderRadius: 14,
                      borderBottomRightRadius: 4,
                      padding: '8px 12px',
                      fontSize: '0.84rem',
                      justifySelf: 'end',
                      maxWidth: '88%',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {r.message}
                    <div style={{ fontSize: '0.64rem', color: B.mute, fontWeight: 700, marginTop: 3, textAlign: 'right' }}>
                      {chatTime(r.created_at)}
                    </div>
                  </div>
                  {r.admin_reply && (
                    <div
                      style={{
                        background: B.accentSoft,
                        color: B.ink,
                        borderRadius: 14,
                        borderBottomLeftRadius: 4,
                        padding: '8px 12px',
                        fontSize: '0.84rem',
                        justifySelf: 'start',
                        maxWidth: '88%',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {r.admin_reply}
                      <div style={{ fontSize: '0.64rem', color: B.accentDeep, fontWeight: 700, marginTop: 3 }}>
                        reply · {r.admin_replied_at ? chatTime(r.admin_replied_at) : ''}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {send.isError && <Chip tone="red">Could not send — try again.</Chip>}
          </div>

          <div style={{ padding: '10px 14px 14px', borderTop: `1px solid ${B.rule}`, display: 'flex', gap: 8 }}>
            <textarea
              style={{ ...inputStyle, flex: 1, minHeight: 42, maxHeight: 110, resize: 'vertical' }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (draft.trim()) send.mutate(draft.trim());
                }
              }}
              placeholder="I wish the app could…"
            />
            <Btn size="sm" onClick={() => draft.trim() && send.mutate(draft.trim())} disabled={send.isPending || !draft.trim()}>
              {send.isPending ? '…' : 'Send'}
            </Btn>
          </div>
        </div>
      )}
    </>
  );
}
