// Notes — a simple sticky-pad. Saved per-trainer in localStorage.
// Quick spot for mom to jot down reminders ("Trany owes for last week",
// "Buy more mats", "Class canceled Aug 8").

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { E } from '../theme';

export function NotesPage() {
  const { user } = useAuth();
  const key = `exercise-notes-${user?.id ?? 'guest'}`;
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setText(window.localStorage.getItem(key) ?? '');
  }, [key]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, text);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(t);
  }, [text, key]);

  return (
    <div>
      <div
        style={{
          background: '#fff9e6',
          border: `1px solid #f0c878`,
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: '0.86rem',
          color: '#6b4d00',
          marginBottom: 14,
        }}
      >
        📝 Quick notes. Saves automatically as you type.
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jot anything down…"
        rows={18}
        style={{
          width: '100%',
          padding: '14px 16px',
          fontSize: '1rem',
          lineHeight: 1.5,
          fontFamily: 'Georgia, serif',
          background: '#fffef4',
          border: `1px solid ${E.rule}`,
          borderRadius: 10,
          outline: 'none',
          resize: 'vertical',
          color: E.ink,
        }}
      />

      <p
        style={{
          fontSize: '0.78rem',
          color: saved ? E.greenDeep : E.muteFaint,
          marginTop: 8,
          height: 16,
        }}
      >
        {saved ? '✓ Saved' : ''}
      </p>
    </div>
  );
}
