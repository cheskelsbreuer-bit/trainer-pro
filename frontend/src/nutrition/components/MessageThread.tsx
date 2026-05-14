// Coach ↔ client messaging thread — embedded into the client detail
// page. Shows the full conversation grouped by day, with the coach's
// composer at the bottom. Modeled on Healthie + Practice Better's
// in-line chat panel.
//
// V1 is coach-side only — the coach can send and read both sides of
// the conversation, but clients can't reply until the client portal
// lands. Once the portal exists, the same nutrition_messages table
// will power the client side too.

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { N, SERIF_FONT, type MessageRow } from '../theme';

interface MessageThreadProps {
  clientId: string;
  trainerId: string;
  clientName: string;
}

export function MessageThread({ clientId, trainerId, clientName }: MessageThreadProps) {
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages, error: loadError } = useQuery({
    queryKey: ['nutrition-messages', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  const tableMissing =
    loadError &&
    (loadError as Error).message?.toLowerCase().includes('nutrition_messages');

  // Group messages by day for the date dividers
  const grouped = groupByDay(messages ?? []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages?.length]);

  const send = useMutation({
    mutationFn: async () => {
      const text = input.trim();
      if (!text) return;
      const { error } = await supabase.from('nutrition_messages').insert({
        trainer_id: trainerId,
        client_id: clientId,
        sender: 'coach',
        body: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setInput('');
      qc.invalidateQueries({ queryKey: ['nutrition-messages', clientId] });
    },
  });

  if (tableMissing) {
    return (
      <div
        className="rounded-xl p-4"
        style={{ background: N.honeySoft, border: `1px solid ${N.honey}55` }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: N.ink }}>
          One-time setup
        </p>
        <p className="text-sm" style={{ color: N.inkSoft }}>
          Run migration <code>33_nutrition_messages.sql</code> in Supabase, then
          reload to enable messaging with {clientName.split(' ')[0]}.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
        maxHeight: 480,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: N.rule }}
      >
        <h3 className="text-sm font-semibold" style={{ color: N.ink }}>
          Messages
        </h3>
        <span className="text-xs" style={{ color: N.mute }}>
          {messages?.length ?? 0} total
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {(messages ?? []).length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: N.mute }}>
            No messages yet. Send the first one to break the ice.
          </p>
        ) : (
          <ul className="space-y-4">
            {grouped.map(({ day, items }) => (
              <li key={day}>
                <div
                  className="text-center text-xs font-medium mb-3"
                  style={{ color: N.mute }}
                >
                  {day}
                </div>
                <ul className="space-y-2">
                  {items.map((m) => (
                    <Bubble key={m.id} msg={m} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div
        className="border-t p-2.5 flex items-end gap-2"
        style={{ borderColor: N.rule }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (input.trim()) send.mutate();
            }
          }}
          placeholder={`Write to ${clientName.split(' ')[0]}…`}
          rows={1}
          className="flex-1 px-3 py-2 text-sm focus:outline-none resize-none rounded-lg"
          style={{
            background: N.inset,
            color: N.ink,
            border: `1px solid ${N.rule}`,
            minHeight: 38,
            maxHeight: 120,
          }}
        />
        <button
          onClick={() => send.mutate()}
          disabled={send.isPending || !input.trim()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-95"
          style={{ background: N.coral, color: '#FFF' }}
        >
          <Send size={14} /> {send.isPending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {send.error && (
        <p
          className="px-4 pb-2 text-xs"
          style={{ color: N.danger }}
        >
          {(send.error as Error).message}
        </p>
      )}
    </div>
  );
}

function Bubble({ msg }: { msg: MessageRow }) {
  const isCoach = msg.sender === 'coach';
  const time = new Date(msg.created_at).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (isCoach) {
    return (
      <li className="flex justify-end">
        <div className="max-w-[80%]">
          <div
            className="rounded-2xl rounded-tr-md px-3.5 py-2.5"
            style={{ background: N.coral, color: '#FFF' }}
          >
            <p
              className="leading-relaxed whitespace-pre-wrap"
              style={{ fontSize: '0.9375rem' }}
            >
              {msg.body}
            </p>
          </div>
          <p className="text-[10px] text-right mt-1 mr-1" style={{ color: N.mute }}>
            {time}
          </p>
        </div>
      </li>
    );
  }
  return (
    <li className="flex justify-start">
      <div className="max-w-[80%]">
        <div
          className="rounded-2xl rounded-tl-md px-3.5 py-2.5"
          style={{ background: N.inset, color: N.ink }}
        >
          <p
            className="leading-relaxed whitespace-pre-wrap"
            style={{ fontSize: '0.9375rem' }}
          >
            {msg.body}
          </p>
        </div>
        <p className="text-[10px] mt-1 ml-1" style={{ color: N.mute }}>
          {time}
        </p>
      </div>
    </li>
  );
}

function groupByDay(messages: MessageRow[]): { day: string; items: MessageRow[] }[] {
  const map = new Map<string, MessageRow[]>();
  messages.forEach((m) => {
    const day = new Date(m.created_at).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    });
    const list = map.get(day) ?? [];
    list.push(m);
    map.set(day, list);
  });
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

// keep SERIF_FONT referenced so it doesn't get tree-shaken if a future
// edit wants to use it (TS would warn about unused import otherwise).
void SERIF_FONT;
