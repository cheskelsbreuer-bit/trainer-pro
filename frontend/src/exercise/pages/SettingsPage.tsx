// Settings — practice name, default per-class rate, currency.

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';
import { E } from '../theme';

export function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: trainer } = useQuery({
    queryKey: ['trainer', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as Trainer;
    },
    enabled: !!user,
  });

  const [name, setName] = useState('');
  const [defaultRate, setDefaultRate] = useState(15);

  useEffect(() => {
    if (trainer?.business_name) setName(trainer.business_name);
    if (typeof window !== 'undefined') {
      const r = window.localStorage.getItem(`exercise-default-rate-${user?.id}`);
      if (r) setDefaultRate(parseFloat(r) || 15);
    }
  }, [trainer, user]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('trainers')
        .update({ business_name: name.trim() || null })
        .eq('id', user.id);
      if (error) throw error;
      window.localStorage.setItem(`exercise-default-rate-${user.id}`, String(defaultRate));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer'] }),
  });

  return (
    <div>
      <h2
        style={{
          fontSize: '1.4rem',
          color: E.primaryDeep,
          margin: 0,
          marginBottom: 14,
        }}
      >
        ⚙ Settings
      </h2>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '24px 28px',
          maxWidth: 540,
          boxShadow: '0 1px 5px rgba(0,0,0,0.08)',
        }}
      >
        <Field label="Group name (shown at the top)">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chaya's Exercise Group"
            style={inp}
          />
        </Field>
        <Field label="Default rate per class ($)">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={defaultRate}
            onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)}
            style={inp}
          />
          <p style={{ fontSize: '0.78rem', color: E.muteFaint, marginTop: 4 }}>
            Used when you add new members. Each member can still have their own rate.
          </p>
        </Field>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          style={{
            background: E.primary,
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 10,
            opacity: save.isPending ? 0.6 : 1,
          }}
        >
          {save.isPending ? 'Saving…' : '✓ Save settings'}
        </button>
        {save.isSuccess && (
          <span style={{ color: E.greenDeep, marginLeft: 12, fontSize: '0.85rem' }}>Saved!</span>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #ccc',
  borderRadius: 8,
  fontSize: '0.92rem',
  fontFamily: 'Arial, sans-serif',
  outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
      <span
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#444',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
