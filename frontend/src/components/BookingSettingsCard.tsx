import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, Check, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Trainer, BookingSettings } from '../lib/database.types';

const DEFAULT_SETTINGS: BookingSettings = {
  lead_hours: 24,
  max_days_ahead: 30,
  default_duration_min: 60,
  buffer_min: 15,
  intro_text: 'Book a session with me. Pick a time that works.',
  windows: [
    { weekday: 1, start: '06:00', end: '20:00' },
    { weekday: 2, start: '06:00', end: '20:00' },
    { weekday: 3, start: '06:00', end: '20:00' },
    { weekday: 4, start: '06:00', end: '20:00' },
    { weekday: 5, start: '06:00', end: '20:00' },
  ],
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function BookingSettingsCard({ trainer }: { trainer: Trainer }) {
  const qc = useQueryClient();
  const [slug, setSlug] = useState<string>(trainer.slug ?? '');
  const [enabled, setEnabled] = useState<boolean>(trainer.booking_enabled ?? false);
  const [settings, setSettings] = useState<BookingSettings>(
    trainer.booking_settings ?? DEFAULT_SETTINGS,
  );
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Re-sync if trainer prop changes
  useEffect(() => {
    setSlug(trainer.slug ?? '');
    setEnabled(trainer.booking_enabled ?? false);
    setSettings(trainer.booking_settings ?? DEFAULT_SETTINGS);
  }, [trainer]);

  const url = useMemo(() => {
    if (!slug) return '';
    return `${window.location.origin}/book/${slug}`;
  }, [slug]);

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('trainers')
        .update({
          slug: slug.trim() || null,
          booking_enabled: enabled,
          booking_settings: settings,
        })
        .eq('id', trainer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', trainer.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function setWindow(weekday: number, patch: Partial<{ start: string; end: string; enabled: boolean }>) {
    const existing = settings.windows.find((w) => w.weekday === weekday);
    let next = [...settings.windows];
    if (patch.enabled === false) {
      next = next.filter((w) => w.weekday !== weekday);
    } else if (patch.enabled === true && !existing) {
      next.push({ weekday, start: '06:00', end: '20:00' });
    } else if (existing) {
      next = next.map((w) =>
        w.weekday === weekday
          ? { ...w, start: patch.start ?? w.start, end: patch.end ?? w.end }
          : w,
      );
    }
    next.sort((a, b) => a.weekday - b.weekday);
    setSettings({ ...settings, windows: next });
  }

  function copyUrl() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start gap-2 mb-4">
        <Globe size={18} className="text-blue-600 mt-0.5" />
        <div>
          <h2 className="font-semibold text-slate-900">Public booking page</h2>
          <p className="text-xs text-slate-500">Let new clients self-book a session at a public URL.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* enable toggle */}
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <div>
            <p className="text-sm font-medium text-slate-900">Booking page is live</p>
            <p className="text-xs text-slate-500">Toggle off to take it down without losing your settings.</p>
          </div>
        </label>

        {/* slug + URL */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">URL slug</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 whitespace-nowrap">/book/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
              placeholder="alex-trainer"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {url && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-slate-500">Public URL:</span>
              <code className="px-2 py-1 bg-slate-100 rounded text-slate-700">{url}</code>
              <button
                type="button"
                onClick={copyUrl}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                title="Copy URL"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
              >
                <ExternalLink size={12} />
                Open
              </a>
            </div>
          )}
        </div>

        {/* intro text */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Welcome message</label>
          <textarea
            rows={2}
            value={settings.intro_text ?? ''}
            onChange={(e) => setSettings({ ...settings, intro_text: e.target.value })}
            placeholder="Visible at the top of your booking page."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* numeric settings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumField label="Lead time (hours)" value={settings.lead_hours} onChange={(v) => setSettings({ ...settings, lead_hours: v })} min={0} max={168} />
          <NumField label="Max days ahead" value={settings.max_days_ahead} onChange={(v) => setSettings({ ...settings, max_days_ahead: v })} min={1} max={120} />
          <NumField label="Slot length (min)" value={settings.default_duration_min} onChange={(v) => setSettings({ ...settings, default_duration_min: v })} min={15} max={240} />
          <NumField label="Buffer (min)" value={settings.buffer_min} onChange={(v) => setSettings({ ...settings, buffer_min: v })} min={0} max={120} />
        </div>

        {/* windows per weekday */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Available hours</label>
          <div className="space-y-2">
            {WEEKDAYS.map((wname, idx) => {
              const win = settings.windows.find((w) => w.weekday === idx);
              return (
                <div key={idx} className="flex items-center gap-3 px-3 py-2 border border-slate-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={!!win}
                    onChange={(e) => setWindow(idx, { enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="w-12 text-sm font-medium text-slate-700">{wname}</span>
                  {win ? (
                    <>
                      <input
                        type="time"
                        value={win.start}
                        onChange={(e) => setWindow(idx, { start: e.target.value })}
                        className="px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="time"
                        value={win.end}
                        onChange={(e) => setWindow(idx, { end: e.target.value })}
                        className="px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </>
                  ) : (
                    <span className="text-sm text-slate-400">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {update.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {(update.error as Error).message}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {update.isPending ? 'Saving…' : 'Save booking settings'}
          </button>
          {saved && <span className="text-sm text-emerald-600">✓ Saved</span>}
        </div>
      </div>
    </section>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
