// One conversation, rendered the same way on both sides — the sitter's
// Chat page and the parent's portal. `me` decides which bubbles sit on
// the right, so the component itself has no idea who is who.

import { useEffect, useRef, useState } from 'react';
import { B } from '../theme';
import { chatTime, useChatPhotoUrls, type ChatMessage } from '../lib/chat';
import { Btn, Chip, EmptyState, inputStyle } from './ui';

export function ChatThread({
  messages,
  me,
  otherName,
  onSend,
  onSendPhoto,
  sending,
  height = 420,
}: {
  messages: ChatMessage[];
  me: 'trainer' | 'client';
  otherName: string;
  onSend: (body: string) => void;
  /** Given a picked file, upload it and post it. Omit to hide the button. */
  onSendPhoto?: (file: File, caption: string) => Promise<void>;
  sending?: boolean;
  height?: number;
}) {
  const [draft, setDraft] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const photos = useChatPhotoUrls(messages);

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
                  {(m.attachments ?? []).map((a) => {
                    const url = photos.data?.[a.path];
                    return (
                      <div key={a.path} style={{ marginBottom: m.body ? 6 : 0 }}>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            <img
                              src={url}
                              alt={a.name || 'photo'}
                              style={{
                                maxWidth: '100%',
                                borderRadius: 12,
                                display: 'block',
                                maxHeight: 260,
                                objectFit: 'cover',
                              }}
                            />
                          </a>
                        ) : (
                          <div
                            style={{
                              width: 180,
                              height: 120,
                              borderRadius: 12,
                              background: mine ? 'rgba(255,255,255,0.18)' : '#e8e0d4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              opacity: 0.8,
                            }}
                          >
                            📷 loading…
                          </div>
                        )}
                      </div>
                    );
                  })}
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

      {photoErr && <Chip tone="red">{photoErr}</Chip>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        {onSendPhoto && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setPhotoBusy(true);
                setPhotoErr('');
                try {
                  await onSendPhoto(file, draft.trim());
                  setDraft('');
                } catch (err) {
                  setPhotoErr(err instanceof Error ? err.message : 'Could not send that picture.');
                } finally {
                  setPhotoBusy(false);
                }
              }}
            />
            <Btn
              kind="ghost"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy || sending}
              title="Send a picture"
            >
              {photoBusy ? '…' : '📷'}
            </Btn>
          </>
        )}
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
