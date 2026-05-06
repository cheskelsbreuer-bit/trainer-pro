import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, Repeat, AlertTriangle, Calendar as CalIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Client, Session, SessionStatus } from '../../lib/database.types';
import {
  addMinutes,
  diffMinutes,
  expandRecurring,
  findConflicts,
} from '../../lib/calendar';

type Mode = 'create' | 'edit';

export interface SessionModalProps {
  open: boolean;
  mode: Mode;
  // For create mode: pre-filled start/end and optional clientId
  initialStart?: Date;
  initialEnd?: Date;
  initialClientId?: string;
  // For edit mode: the session to edit
  session?: Session & { clients?: { full_name: string } | null };
  // All sessions in the visible range — used for conflict detection
  allSessions: Session[];
  // Trainer's default rate fallback
  trainerDefaultRate?: number | null;
  onClose: () => void;
}

interface FormState {
  client_id: string;
  starts_at: string; // local datetime-local value: "YYYY-MM-DDTHH:mm"
  duration_min: number;
  session_type: string;
  location: string;
  status: SessionStatus;
  price: string; // string for input control
  notes: string;
  client_notes: string;
  paid: boolean;
  recurring: boolean;
  recur_weeks: number;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): Date {
  // datetime-local has no TZ; treat as local time
  return new Date(s);
}

const STATUS_OPTIONS: { value: SessionStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No-show' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SESSION_TYPES = ['training', 'consultation', 'assessment'];

export function SessionModal(props: SessionModalProps) {
  const { open, mode, session, initialStart, initialEnd, initialClientId, allSessions, trainerDefaultRate, onClose } = props;
  const qc = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ['clients-for-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, status, rate_per_session, package_balance')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Pick<Client, 'id' | 'full_name' | 'status' | 'rate_per_session' | 'package_balance'>[];
    },
    enabled: open,
  });

  const initial: FormState = useMemo(() => {
    if (mode === 'edit' && session) {
      const s = new Date(session.starts_at);
      const e = new Date(session.ends_at);
      return {
        client_id: session.client_id,
        starts_at: toLocalInput(s),
        duration_min: Math.max(15, diffMinutes(s, e)),
        session_type: session.session_type ?? 'training',
        location: session.location ?? '',
        status: session.status,
        price: session.price?.toString() ?? '',
        notes: session.notes ?? '',
        client_notes: session.client_notes ?? '',
        paid: session.paid,
        recurring: false,
        recur_weeks: 1,
      };
    }
    const startD = initialStart ?? new Date();
    const endD = initialEnd ?? addMinutes(startD, 60);
    return {
      client_id: initialClientId ?? '',
      starts_at: toLocalInput(startD),
      duration_min: Math.max(15, diffMinutes(startD, endD)),
      session_type: 'training',
      location: 'Studio',
      status: 'scheduled',
      price: '',
      notes: '',
      client_notes: '',
      paid: false,
      recurring: false,
      recur_weeks: 4,
    };
  }, [mode, session, initialStart, initialEnd, initialClientId]);

  const [form, setForm] = useState<FormState>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Auto-fill price from client's rate when client picked (create mode only)
  useEffect(() => {
    if (mode !== 'create' || !form.client_id || !clients) return;
    if (form.price) return; // user already typed something
    const c = clients.find((x) => x.id === form.client_id);
    if (c?.rate_per_session != null) {
      set('price', c.rate_per_session.toString());
    } else if (trainerDefaultRate != null) {
      set('price', trainerDefaultRate.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.client_id, clients]);

  const startDate = useMemo(() => fromLocalInput(form.starts_at), [form.starts_at]);
  const endDate = useMemo(() => addMinutes(startDate, form.duration_min), [startDate, form.duration_min]);

  // Conflict detection — for recurring, check every occurrence
  const conflictsByOccurrence = useMemo(() => {
    if (!form.recurring) {
      return [{ start: startDate, conflicts: findConflicts(allSessions, startDate, endDate, session?.id) }];
    }
    const occurrences = expandRecurring(startDate, endDate, form.recur_weeks);
    return occurrences.map((occ) => ({
      start: new Date(occ.starts_at),
      conflicts: findConflicts(allSessions, new Date(occ.starts_at), new Date(occ.ends_at), session?.id),
    }));
  }, [form.recurring, form.recur_weeks, startDate, endDate, allSessions, session?.id]);

  const totalConflicts = conflictsByOccurrence.reduce((n, o) => n + o.conflicts.length, 0);

  // ---------- save / delete ----------
  const save = useMutation({
    mutationFn: async () => {
      if (!form.client_id) throw new Error('Pick a client');
      const base = {
        client_id: form.client_id,
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        session_type: form.session_type || 'training',
        location: form.location || null,
        status: form.status,
        price: form.price ? Number(form.price) : null,
        notes: form.notes || null,
        client_notes: form.client_notes || null,
        paid: form.paid,
      };

      if (mode === 'edit' && session) {
        const { error } = await supabase.from('sessions').update(base).eq('id', session.id);
        if (error) throw error;
        return;
      }

      // Insert: trainer_id must be set (server-side default isn't reliable here)
      const { data: auth } = await supabase.auth.getUser();
      const trainerId = auth.user?.id;
      if (!trainerId) throw new Error('Not signed in');

      const occurrences = form.recurring
        ? expandRecurring(startDate, endDate, form.recur_weeks)
        : [{ starts_at: startDate.toISOString(), ends_at: endDate.toISOString() }];

      const rows = occurrences.map((occ) => ({
        ...base,
        trainer_id: trainerId,
        starts_at: occ.starts_at,
        ends_at: occ.ends_at,
      }));

      const { error } = await supabase.from('sessions').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-sessions'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const { error } = await supabase.from('sessions').delete().eq('id', session.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-sessions'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
      onClose();
    },
  });

  if (!open) return null;

  const inputCls =
    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CalIcon className="text-blue-600" size={20} />
            <h2 className="font-semibold text-slate-900">
              {mode === 'edit' ? 'Edit session' : 'New session'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div className="p-6 space-y-4">
          {/* client picker */}
          <div>
            <label className={labelCls}>Client</label>
            <select
              className={inputCls}
              value={form.client_id}
              onChange={(e) => set('client_id', e.target.value)}
            >
              <option value="">— Select a client —</option>
              {clients?.filter((c) => c.status !== 'archived').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                  {c.package_balance > 0 ? ` · ${c.package_balance} sessions left` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Starts</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.starts_at}
                onChange={(e) => set('starts_at', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Duration (min)</label>
              <select
                className={inputCls}
                value={form.duration_min}
                onChange={(e) => set('duration_min', Number(e.target.value))}
              >
                {[30, 45, 60, 75, 90, 120].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>

          {/* type / location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select
                className={inputCls}
                value={form.session_type}
                onChange={(e) => set('session_type', e.target.value)}
              >
                {SESSION_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input
                className={inputCls}
                placeholder="Studio, Park, Zoom…"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
              />
            </div>
          </div>

          {/* status / price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) => set('status', e.target.value as SessionStatus)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Price</label>
              <input
                type="number"
                step="0.01"
                className={inputCls}
                placeholder="—"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
              />
            </div>
          </div>

          {/* paid */}
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={form.paid}
              onChange={(e) => set('paid', e.target.checked)}
            />
            Marked as paid
          </label>

          {/* notes */}
          <div>
            <label className={labelCls}>Trainer notes (private)</label>
            <textarea
              rows={2}
              className={inputCls}
              placeholder="Internal notes — programming ideas, reminders, etc."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Client-visible notes</label>
            <textarea
              rows={2}
              className={inputCls}
              placeholder="Notes the client will see (Phase 4)."
              value={form.client_notes}
              onChange={(e) => set('client_notes', e.target.value)}
            />
          </div>

          {/* recurring (create only) */}
          {mode === 'create' && (
            <div className="bg-slate-50 rounded-xl p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={form.recurring}
                  onChange={(e) => set('recurring', e.target.checked)}
                />
                <Repeat size={14} />
                Repeat weekly
              </label>
              {form.recurring && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                  for
                  <input
                    type="number"
                    min={2}
                    max={26}
                    className="w-16 px-2 py-1 border border-slate-200 rounded-md text-sm"
                    value={form.recur_weeks}
                    onChange={(e) => set('recur_weeks', Math.max(2, Math.min(26, Number(e.target.value) || 2)))}
                  />
                  weeks ({form.recur_weeks} sessions total)
                </div>
              )}
            </div>
          )}

          {/* conflicts */}
          {totalConflicts > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <AlertTriangle size={16} />
                {totalConflicts} conflict{totalConflicts > 1 ? 's' : ''} with other sessions
              </div>
              <ul className="mt-1 text-xs text-amber-800 space-y-0.5">
                {conflictsByOccurrence
                  .filter((o) => o.conflicts.length > 0)
                  .slice(0, 4)
                  .map((o, i) => (
                    <li key={i}>
                      {o.start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                      at {o.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      {' — overlaps '}
                      {o.conflicts.length} other
                    </li>
                  ))}
              </ul>
              <p className="mt-1 text-xs text-amber-700">You can save anyway, but double-check.</p>
            </div>
          )}

          {save.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {(save.error as Error).message}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <div>
            {mode === 'edit' && (
              <button
                onClick={() => {
                  if (confirm('Delete this session? This cannot be undone.')) remove.mutate();
                }}
                disabled={remove.isPending}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.client_id}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : mode === 'edit' ? 'Save changes' : form.recurring ? `Create ${form.recur_weeks} sessions` : 'Create session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
