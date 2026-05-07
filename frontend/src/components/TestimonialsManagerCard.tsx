import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareQuote, Plus, Star, Trash2, Edit2, Save, X, ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Testimonial, Trainer } from '../lib/database.types';

export function TestimonialsManagerCard({ trainer }: { trainer: Trainer }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['testimonials', trainer.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('trainer_id', trainer.id)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Testimonial[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testimonials', trainer.id] }),
  });

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquareQuote size={18} className="text-blue-600" />
        <h3 className="font-semibold text-slate-900">Testimonials</h3>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="ml-auto flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Quotes from real clients shown on your public site. Up to 4 display by default.
      </p>

      {isLoading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-sm text-slate-500 mb-2">No testimonials yet.</p>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Add your first
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((t) => (
            <li
              key={t.id}
              className="bg-slate-50 rounded-lg p-3 flex items-start gap-3"
            >
              {t.client_photo_url ? (
                <img
                  src={t.client_photo_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {t.client_name
                    .split(' ')
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{t.client_name}</span>
                  <span className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                    ))}
                  </span>
                  {!t.is_published && (
                    <span className="text-[10px] uppercase tracking-wide bg-slate-200 text-slate-700 px-1 py-0.5 rounded">
                      Draft
                    </span>
                  )}
                </div>
                {t.client_role && <p className="text-xs text-slate-500">{t.client_role}</p>}
                <p className="text-sm text-slate-700 line-clamp-2 mt-0.5">"{t.body}"</p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    setEditing(t);
                    setShowForm(true);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded"
                  title="Edit"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete testimonial from ${t.client_name}?`)) remove.mutate(t.id);
                  }}
                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <TestimonialEditor
          trainerId={trainer.id}
          studioId={trainer.studio_id}
          editing={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

function TestimonialEditor({
  trainerId,
  studioId,
  editing,
  onClose,
}: {
  trainerId: string;
  studioId: string | null;
  editing: Testimonial | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    client_name: editing?.client_name ?? '',
    client_role: editing?.client_role ?? '',
    body: editing?.body ?? '',
    rating: editing?.rating ?? 5,
    client_photo_url: editing?.client_photo_url ?? null as string | null,
    is_published: editing?.is_published ?? true,
  });
  const [uploading, setUploading] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const ext = f.name.split('.').pop() || 'jpg';
    const path = `${trainerId}/testimonial_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('public-gallery')
      .upload(path, f, { cacheControl: '3600', upsert: false });
    if (error) {
      alert(`Upload failed: ${error.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('public-gallery').getPublicUrl(path);
    setForm((p) => ({ ...p, client_photo_url: data?.publicUrl ?? null }));
    setUploading(false);
  }

  const save = useMutation({
    mutationFn: async () => {
      const row = {
        trainer_id: trainerId,
        studio_id: studioId,
        client_name: form.client_name.trim(),
        client_role: form.client_role.trim() || null,
        body: form.body.trim(),
        rating: form.rating,
        client_photo_url: form.client_photo_url,
        is_published: form.is_published,
      };
      if (!row.client_name || !row.body) throw new Error('Client name and body required');
      if (editing) {
        const { error } = await supabase.from('testimonials').update(row).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('testimonials').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['testimonials', trainerId] });
      onClose();
    },
  });

  const inputCls =
    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

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
          <h3 className="font-semibold text-slate-900">
            {editing ? 'Edit testimonial' : 'New testimonial'}
          </h3>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Client name</label>
              <input
                className={inputCls}
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                placeholder="Sarah M."
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role / context</label>
              <input
                className={inputCls}
                value={form.client_role}
                onChange={(e) => setForm({ ...form, client_role: e.target.value })}
                placeholder="Marathon runner"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Quote</label>
            <textarea
              rows={4}
              className={inputCls}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="What they said about working with you."
            />
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setForm({ ...form, rating: n })}
                    className="p-0.5"
                  >
                    <Star
                      size={20}
                      className={
                        n <= form.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
            <label className="ml-auto text-xs text-slate-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="rounded"
              />
              Published
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Photo (optional)</label>
            {form.client_photo_url ? (
              <div className="flex items-start gap-3">
                <img
                  src={form.client_photo_url}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover border border-slate-200"
                />
                <button
                  onClick={() => setForm({ ...form, client_photo_url: null })}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 size={11} /> Remove
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-1.5 w-full bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg py-3 cursor-pointer text-xs text-slate-600">
                {uploading ? 'Uploading…' : (
                  <>
                    <ImageIcon size={12} /> Add photo
                  </>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            )}
          </div>

          {save.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-800">
              {(save.error as Error).message}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium"
          >
            <Save size={14} />
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
