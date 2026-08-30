// One conversation, rendered the same way on both sides — the sitter's
// Chat page and the parent's portal. `me` decides which bubbles sit on
// the right, so the component itself has no idea who is who.

import { useEffect, useRef, useState } from 'react';
import { B } from '../theme';
import { chatTime, type ChatMessage } from '../lib/chat';
import { Btn, EmptyState, inputStyle } from './ui';

export function ChatThread({
  messages,
  me,
  otherName,
  onSend,
  sending,
  height = 420,
}: {
  messages: ChatMessage[];
  me: 'trainer' | 'client';
  otherName: string;
  onSend: (body: string) => void;
  sending?: boolean;
  height?: number;
}) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  // Land on the newest message, the way every messaging app does.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  function send() {
    const body = draft.trim();
    if (!body || sending) return;
    onSend(body);
    setDraft('');
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        style={{
          maxHeight: height,
          overflowY: 'auto',
          display: 'grid',
          gap: 8,
          alignContent: 'start',
          padding: '4px 2px',
        }}
      >
        {messages.length === 0 ? (
          <EmptyState
            emoji="💬"
            title="No messages yet"
            body={`Say hello to ${otherName} — anything you write here stays in the app.`}
          />
        ) : (
          messages.map((m) => {
            const mine = m.sender === me;
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: mine ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '78%',
                    background: mine ? B.primary : '#f2ede4',
                    color: mine ? '#fff' : B.ink,
                    borderRadius: 18,
                    borderBottomRightRadius: mine ? 5 : 18,
                    borderBottomLeftRadius: mine ? 18 : 5,
                    padding: '9px 14px',
                    fontSize: '0.88rem',
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.body}
                  <div
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      marginTop: 4,
                      opacity: 0.7,
                      textAlign: 'right',
                    }}
                  >
                    {chatTime(m.created_at)}
                    {mine && m.read_at ? ' · read' : ''}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          style={{ ...inputStyle, flex: 1, minHeight: 44, maxHeight: 130, resize: 'vertical' }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter makes a new line.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Message ${otherName}…`}
        />
        <Btn onClick={send} disabled={sending || !draft.trim()}>
          {sending ? 'Sending…' : 'Send'}
        </Btn>
      </div>
    </div>
  );
}
