import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Camera, ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { ProgressEntry } from '../../lib/database.types';

interface Props {
  open: boolean;
  clientId: string;
  trainerId: string;
  entry?: ProgressEntry;
  onClose: () => void;
}

const METRICS = [
  { value: 'weight', label: 'Weight', unit: 'lbs', kind: 'numeric' as const },
  { value: 'body_fat', label: 'Body fat', unit: '%', kind: 'numeric' as const },
  { value: 'waist', label: 'Waist', unit: 'in', kind: 'numeric' as const },
  { value: 'hips', label: 'Hips', unit: 'in', kind: 'numeric' as const },
  { value: 'chest', label: 'Chest', unit: 'in', kind: 'numeric' as const },
  { value: 'arms', label: 'Arms', unit: 'in', kind: 'numeric' as const },
  { value: 'thighs', label: 'Thighs', unit: 'in', kind: 'numeric' as const },
  { value: 'pr_squat', label: 'Squat PR', unit: 'lbs', kind: 'numeric' as const },
  { value: 'pr_bench', label: 'Bench PR', unit: 'lbs', kind: 'numeric' as const },
  { value: 'pr_deadlift', label: 'Deadlift PR', unit: 'lbs', kind: 'numeric' as const },
  { value: 'pr_overhead', label: 'Overhead Press PR', unit: 'lbs', kind: 'numeric' as const },
  { value: 'photo_front', label: 'Photo (front)', unit: '', kind: 'photo' as const },
  { value: 'photo_side', label: 'Photo (side)', unit: '', kind: 'photo' as const },
  { value: 'photo_back', label: 'Photo (back)', unit: '', kind: 'photo' as const },
  { value: 'other', label: 'Other (custom)', unit: '', kind: 'numeric' as const },
];

export function ProgressEntryModal({ open, clientId, trainerId, entry, onClose }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [metricType, setMetricType] = useState(entry?.metric_type ?? 'weight');
  const [metricValue, setMetricValue] = useState<string>(
    entry?.metric_value != null ? String(entry.metric_value) : '',
  );
  const [metricUnit, setMetricUnit] = useState(entry?.metric_unit ?? 'lbs');
  const [measuredAt, setMeasuredAt] = useState(
    (entry?.measured_at ?? new Date().toISOString()).slice(0, 16),
  );
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(entry?.photo_url ?? null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const meta = METRICS.find((m) => m.value === metricType) ?? METRICS[0];
  const isPhoto = meta.kind === 'photo';

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      let photo_url: string | null = entry?.photo_url ?? null;

      if (isPhoto && photoFile) {
        // Path: {trainer_id}/{client_id}/{timestamp}_{name}
        const ext = photoFile.name.split('.').pop() || 'jpg';
        const path = `${trainerId}/${clientId}/${Date.now()}_${metricType}.${ext}`;
        setUploadProgress(10);
        const { error: upErr } = await supabase.storage
          .from('progress-photos')
          .upload(path, photoFile, {
            cacheControl: '3600',
            upsert: false,
          });
        if (upErr) throw upErr;
        setUploadProgress(80);
        // Use signed URL since the bucket is private — viewers (trainer + client) get
        // RLS-gated access via storage policies.
        const { data: signed } = await supabase.storage
          .from('progress-photos')
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        photo_url = signed?.signedUrl ?? null;
        setUploadProgress(100);
      }

      const row: Partial<ProgressEntry> & { trainer_id: string; client_id: string } = {
        trainer_id: trainerId,
        client_id: clientId,
        metric_type: metricType,
        metric_value: !isPhoto && metricValue ? Number(metricValue) : null,
        metric_unit: !isPhoto ? metricUnit : null,
        photo_url,
        notes: notes || null,
        measured_at: new Date(measuredAt).toISOString(),
      };

      if (entry) {
        const { error } = await supabase.from('progress_entries').update(row).eq('id', entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('progress_entries').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress', clientId] });
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!entry) return;
      const { error } = await supabase.from('progress_entries').delete().eq('id', entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress', clientId] });
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Camera size={18} className="text-blue-600" />
            {entry ? 'Edit measurement' : 'Log measurement'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Metric</label>
            <select
              value={metricType}
              onChange={(e) => {
                const m = METRICS.find((x) => x.value === e.target.value)!;
                setMetricType(m.value);
                setMetricUnit(m.unit);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {!isPhoto && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Value</label>
                <input
                  type="number"
                  step="0.1"
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                <input
                  value={metricUnit}
                  onChange={(e) => setMetricUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {isPhoto && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Photo</label>
              <div className="space-y-2">
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="preview"
                    className="w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-slate-50"
                  />
                )}
                <label className="flex items-center justify-center gap-2 w-full bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg py-3 cursor-pointer text-sm text-slate-600">
                  <ImageIcon size={14} />
                  {photoFile ? `Replace (${photoFile.name})` : 'Choose photo'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={pickFile}
                    className="hidden"
                  />
                </label>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="h-1 rounded bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Measured at</label>
            <input
              type="datetime-local"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything notable about this measurement?"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {save.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {(save.error as Error).message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <div>
            {entry && (
              <button
                onClick={() => {
                  if (confirm('Delete this entry?')) remove.mutate();
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || (isPhoto && !photoFile && !entry?.photo_url) || (!isPhoto && !metricValue)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              <Save size={14} />
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
