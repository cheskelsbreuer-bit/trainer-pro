// 💬 Chat — the sitter's side. Families down the left (newest reply on
// top, unread in bold), the open conversation on the right. One thread
// per family, so a mother with three kids is one conversation.

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { B, familyLabel, readParent } from '../theme';
import { useKids } from '../lib/data';
import {
  useChatMessages,
  useSendChat,
  useMarkThreadRead,
  familyThreads,
  unreadByClient,
  chatTime,
} from '../lib/chat';
import { Card, SectionTitle, EmptyState, Avatar, Chip } from '../components/ui';
import { ChatThread } from '../components/ChatThread';

// Two columns on a laptop, one on a phone. Scoped to this page.
const RESPONSIVE_CSS = `
@media (max-width: 760px) {
  .bs-chat-grid { grid-template-columns: 1fr !important; }
  .bs-chat-list { max-height: 230px; overflow-y: auto; }
}`;

export function ChatPage() {
  const { user } = useAuth();
  const { data: kids, isLoading } = useKids();
  const chat = useChatMessages();
  const send = useSendChat();
  const markRead = useMarkThreadRead();
  const [params, setParams] = useSearchParams();
  const openSlug = params.get('family');

  const roster = useMemo(() => (kids ?? []).filter((k) => k.status !== 'archived'), [kids]);
  const unread = useMemo(() => unreadByClient(chat.data, 'client'), [chat.data]);

  const threads = useMemo(() => {
    return familyThreads(roster)
      .map((t) => {
        const ids = new Set(t.members.map((m) => m.id));
        const msgs = (chat.data ?? []).filter((m) => ids.has(m.client_id));
        const last = msgs[msgs.length - 1];
        const unreadCount = t.members.reduce((s, m) => s + (unread.get(m.id) ?? 0), 0);
        return {
          ...t,
          msgs,
          last,
          unreadCount,
          label: t.slug.startsWith('solo-') ? t.members[0].full_name : familyLabel(t.slug),
          parent: readParent(t.anchor),
        };
      })
      .sort((a, b) => {
        // Unread first, then most recent conversation, then alphabetical.
        if (!!b.unreadCount !== !!a.unreadCount) return b.unreadCount - a.unreadCount;
        const at = a.last?.created_at ?? '';
        const bt = b.last?.created_at ?? '';
        if (at !== bt) return bt.localeCompare(at);
        return a.label.localeCompare(b.label);
      });
  }, [roster, chat.data, unread]);

  const open = threads.find((t) => t.slug === openSlug) ?? threads[0] ?? null;

  // Opening a thread clears its unread badge.
  useEffect(() => {
    if (!open || !open.unreadCount) return;
    markRead.mutate({ clientIds: open.members.map((m) => m.id), from: 'client' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.slug, open?.unreadCount]);

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Opening your chats…</div>;
  }

  if (!threads.length) {
    return (
      <Card pad={0}>
        <EmptyState
          emoji="💬"
          title="No families to chat with yet"
          body="Add a kid and invite their parent — your conversations show up here."
        />
      </Card>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 300px) 1fr',
        gap: 18,
        alignItems: 'start',
      }}
      className="bs-chat-grid"
    >
      <style>{RESPONSIVE_CSS}</style>
      {/* Family list */}
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px 10px' }}>
          <SectionTitle style={{ margin: 0 }}>Families</SectionTitle>
        </div>
        <div style={{ display: 'grid' }} className="bs-chat-list">
          {threads.map((t) => {
            const active = open?.slug === t.slug;
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => setParams({ family: t.slug })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: 'none',
                  borderTop: `1px solid ${B.rule}`,
                  background: active ? B.primarySoft : 'transparent',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <Avatar name={t.label} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: t.unreadCount ? 900 : 800,
                      fontSize: '0.86rem',
                      color: active ? B.primaryDeep : B.ink,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: t.unreadCount ? B.ink : B.mute,
                      fontWeight: t.unreadCount ? 700 : 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.last ? t.last.body : 'No messages yet'}
                  </div>
                </div>
                {t.unreadCount > 0 && <Chip tone="red">{t.unreadCount}</Chip>}
                {!t.unreadCount && t.last && (
                  <span style={{ fontSize: '0.68rem', color: B.mute, fontWeight: 700 }}>
                    {chatTime(t.last.created_at)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Open conversation */}
      {open && (
        <Card>
          <SectionTitle
            right={
              <span style={{ fontSize: '0.76rem', color: B.mute, fontWeight: 700 }}>
                {open.members.map((m) => m.full_name.split(' ')[0]).join(', ')}
              </span>
            }
          >
            {open.parent ? `${open.parent} · ${open.label}` : open.label}
          </SectionTitle>
          <ChatThread
            messages={open.msgs}
            me="trainer"
            otherName={open.parent || open.label}
            sending={send.isPending}
            onSend={(body) =>
              user &&
              send.mutate({
                clientId: open.anchor.id,
                trainerId: user.id,
                sender: 'trainer',
                body,
              })
            }
          />
          {send.isError && (
            <Chip tone="red" style={{ marginTop: 10 }}>
              Could not send — check your connection and try again.
            </Chip>
          )}
        </Card>
      )}
    </div>
  );
}
