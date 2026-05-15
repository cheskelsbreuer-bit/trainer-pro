// Settings — full panel with exercise-specific settings (branding,
// default rate, currency, family discount, payment methods, SMS
// template, categories, safety) AND the standard Trainer Pro panels
// (profile, Stripe, Calendar sync, public profile, directory, help).
//
// All exercise settings live under trainers.public_profile.exercise.settings;
// the standard panels reuse the existing shared cards.

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';
import {
  useExerciseConfig,
  appendLog,
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
  type ExerciseSettings,
  type Category,
  type Holiday,
  type Tag,
  type CustomField,
} from '../lib/exerciseConfig';
import { useExerciseClients, useExercisePayments } from '../lib/exerciseData';
import { membersCsv, paymentsCsv, downloadCsv } from '../lib/csvExport';
import { StripeStatusCard } from '../../components/StripeStatusCard';
import { GoogleCalendarCard } from '../../components/GoogleCalendarCard';
import { BookingSettingsCard } from '../../components/BookingSettingsCard';
import { PublicProfileSettingsCard } from '../../components/PublicProfileSettingsCard';
import { DirectorySettingsCard } from '../../components/DirectorySettingsCard';
import { FeedbackCard } from '../../components/FeedbackCard';
import { E } from '../theme';

const COMMON_TZ = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Jerusalem',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

export function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: cfg, save: saveCfg } = useExerciseConfig();

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

  return (
    <div>
      <div
        style={{
          background: '#f5f8fc',
          border: `1px solid ${E.rule}`,
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: '0.86rem',
          color: E.inkSoft,
          marginBottom: 14,
        }}
      >
        ⚙ Configure your app. Most changes save instantly.
      </div>

      <SettingsSection title="Group branding" emoji="🏷" defaultOpen>
        {cfg ? (
          <BrandingPanel
            settings={cfg.settings}
            onChange={(next) =>
              saveCfg.mutate(
                appendLog({ ...cfg, settings: next }, 'settings', 'Updated branding'),
              )
            }
          />
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Payments & money" emoji="💰" defaultOpen>
        {cfg ? (
          <MoneyPanel
            settings={cfg.settings}
            onChange={(next) =>
              saveCfg.mutate(
                appendLog({ ...cfg, settings: next }, 'settings', 'Updated payments settings'),
              )
            }
          />
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Reminder SMS template" emoji="📱">
        {cfg ? (
          <SmsPanel
            settings={cfg.settings}
            onChange={(next) =>
              saveCfg.mutate(
                appendLog({ ...cfg, settings: next }, 'settings', 'Updated SMS template'),
              )
            }
          />
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Note categories" emoji="🗂">
        {cfg ? (
          <CategoriesPanel
            categories={cfg.categories}
            onChange={(next) =>
              saveCfg.mutate({ ...cfg, categories: next })
            }
          />
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Safety & lock" emoji="🔒">
        {cfg ? (
          <SafetyPanel
            settings={cfg.settings}
            onChange={(next) =>
              saveCfg.mutate(
                appendLog({ ...cfg, settings: next }, 'settings', 'Updated safety settings'),
              )
            }
          />
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Class holidays / canceled days" emoji="📅">
        {cfg ? (
          <HolidaysPanel
            holidays={cfg.holidays}
            onChange={(next) =>
              saveCfg.mutate(
                appendLog({ ...cfg, holidays: next }, 'settings', 'Updated holidays'),
              )
            }
          />
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Member tags" emoji="🏷">
        {cfg ? (
          <TagsPanel
            tags={cfg.tags}
            onChange={(next) =>
              saveCfg.mutate(
                appendLog({ ...cfg, tags: next }, 'settings', 'Updated tags'),
              )
            }
          />
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Custom member fields" emoji="✏">
        {cfg ? (
          <CustomFieldsPanel
            fields={cfg.customFields}
            onChange={(next) =>
              saveCfg.mutate(
                appendLog({ ...cfg, customFields: next }, 'settings', 'Updated custom fields'),
              )
            }
          />
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Data & maintenance" emoji="💾">
        <DataMaintenancePanel />
      </SettingsSection>

      {/* ── Standard Trainer Pro panels ────────────────────────────── */}

      <h3 style={mainHeading}>Trainer Pro standard settings</h3>

      <SettingsSection title="Your profile" emoji="👤">
        {trainer ? (
          <ProfilePanel trainer={trainer} userId={user?.id} qc={qc} />
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Online payments (Stripe)" emoji="💳">
        <PanelCard>
          <StripeStatusCard />
        </PanelCard>
      </SettingsSection>

      <SettingsSection title="Consult booking" emoji="📅">
        {trainer ? (
          <PanelCard>
            <BookingSettingsCard trainer={trainer} />
          </PanelCard>
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Calendar sync" emoji="🗓">
        {trainer ? (
          <PanelCard>
            <GoogleCalendarCard trainer={trainer} />
          </PanelCard>
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Public practice page" emoji="🌐">
        {trainer ? (
          <PanelCard>
            <PublicProfileSettingsCard trainer={trainer} />
          </PanelCard>
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Find-a-coach directory" emoji="📒">
        {trainer ? (
          <PanelCard>
            <DirectorySettingsCard trainer={trainer} />
          </PanelCard>
        ) : (
          <p style={dim}>Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Help & feedback" emoji="📨">
        <PanelCard>
          <FeedbackCard />
        </PanelCard>
      </SettingsSection>
    </div>
  );
}

// ── Sub-panels ────────────────────────────────────────────────────────

function BrandingPanel({
  settings,
  onChange,
}: {
  settings: ExerciseSettings;
  onChange: (next: ExerciseSettings) => void;
}) {
  const [groupName, setGroupName] = useState(settings.groupName ?? '');
  const [subtitle, setSubtitle] = useState(settings.groupSubtitle ?? '');
  const [emoji, setEmoji] = useState(settings.groupEmoji ?? '💪');
  useEffect(() => setGroupName(settings.groupName ?? ''), [settings.groupName]);
  useEffect(() => setSubtitle(settings.groupSubtitle ?? ''), [settings.groupSubtitle]);
  useEffect(() => setEmoji(settings.groupEmoji ?? '💪'), [settings.groupEmoji]);

  function commit() {
    onChange({
      ...settings,
      groupName: groupName.trim() || undefined,
      groupSubtitle: subtitle.trim() || undefined,
      groupEmoji: emoji.trim() || '💪',
    });
  }

  return (
    <div style={fieldGrid}>
      <Field label="Group name (header)">
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onBlur={commit}
          placeholder="e.g. Chaya's Exercise Group"
          style={inp}
        />
      </Field>
      <Field label="Tagline (below name)">
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          onBlur={commit}
          placeholder="e.g. Payment manager"
          style={inp}
        />
      </Field>
      <Field label="Header emoji">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          onBlur={commit}
          maxLength={4}
          style={{ ...inp, width: 80 }}
        />
      </Field>
    </div>
  );
}

function MoneyPanel({
  settings,
  onChange,
}: {
  settings: ExerciseSettings;
  onChange: (next: ExerciseSettings) => void;
}) {
  const [methodInput, setMethodInput] = useState('');
  const methods = settings.paymentMethods ?? [];

  function patch<K extends keyof ExerciseSettings>(k: K, v: ExerciseSettings[K]) {
    onChange({ ...settings, [k]: v });
  }
  function addMethod() {
    const name = methodInput.trim();
    if (!name) return;
    if (methods.includes(name)) return;
    patch('paymentMethods', [...methods, name]);
    setMethodInput('');
  }
  function rmMethod(m: string) {
    patch('paymentMethods', methods.filter((x) => x !== m));
  }

  return (
    <div>
      <div style={fieldGrid}>
        <Field label="Default rate per class ($)">
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={settings.defaultPerClass}
            onChange={(e) => patch('defaultPerClass', parseFloat(e.target.value) || 0)}
            style={inp}
          />
        </Field>
        <Field label="Currency symbol">
          <select value={settings.currency} onChange={(e) => patch('currency', e.target.value)} style={inp}>
            <option value="$">$ — Dollar</option>
            <option value="₪">₪ — Shekel</option>
            <option value="€">€ — Euro</option>
            <option value="£">£ — Pound</option>
            <option value="C$">C$ — Canadian</option>
            <option value="A$">A$ — Australian</option>
          </select>
        </Field>
        <Field label="Date format">
          <select
            value={settings.dateFormat}
            onChange={(e) =>
              patch('dateFormat', e.target.value as ExerciseSettings['dateFormat'])
            }
            style={inp}
          >
            <option value="mdy">MM/DD/YYYY (US)</option>
            <option value="dmy">DD/MM/YYYY</option>
            <option value="iso">YYYY-MM-DD</option>
          </select>
        </Field>
      </div>

      <div style={{ marginTop: 16 }}>
        <Lbl>Family discount</Lbl>
        <p style={{ ...help, marginTop: 0 }}>
          Applied automatically when you add additional members from the same family.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={settings.familyDiscount.type}
            onChange={(e) =>
              patch('familyDiscount', {
                ...settings.familyDiscount,
                type: e.target.value as 'percent' | 'dollar',
              })
            }
            style={{ ...inp, width: 130 }}
          >
            <option value="percent">% off</option>
            <option value="dollar">$ off</option>
          </select>
          <input
            type="number"
            min="0"
            value={settings.familyDiscount.value}
            onChange={(e) =>
              patch('familyDiscount', {
                ...settings.familyDiscount,
                value: parseFloat(e.target.value) || 0,
              })
            }
            style={{ ...inp, width: 100 }}
          />
          <span style={{ fontSize: '0.85rem', color: E.mute }}>
            {settings.familyDiscount.type === 'percent' ? '%' : settings.currency} off per class
          </span>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <Lbl>Payment methods (shown in the record-payment modal)</Lbl>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {methods.length === 0 ? (
            <span style={{ color: E.muteFaint, fontSize: '0.85rem' }}>(none — add one below)</span>
          ) : (
            methods.map((m) => (
              <span
                key={m}
                style={{
                  background: '#f5f8fc',
                  border: `1px solid ${E.rule}`,
                  borderRadius: 16,
                  padding: '4px 10px 4px 12px',
                  fontSize: '0.84rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {m}
                <button
                  onClick={() => rmMethod(m)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: E.mute,
                    cursor: 'pointer',
                    padding: 2,
                  }}
                  aria-label={`Remove ${m}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            value={methodInput}
            onChange={(e) => setMethodInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addMethod();
            }}
            placeholder="e.g. PayPal"
            style={{ ...inp, maxWidth: 220 }}
          />
          <button onClick={addMethod} style={btnGreen}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

function SmsPanel({
  settings,
  onChange,
}: {
  settings: ExerciseSettings;
  onChange: (next: ExerciseSettings) => void;
}) {
  const [tpl, setTpl] = useState(settings.smsTemplate);
  useEffect(() => setTpl(settings.smsTemplate), [settings.smsTemplate]);
  function commit() {
    onChange({ ...settings, smsTemplate: tpl });
  }
  return (
    <div>
      <Lbl>Template</Lbl>
      <p style={help}>
        Use <code style={code}>{'{firstName}'}</code>, <code style={code}>{'{currency}'}</code>,{' '}
        <code style={code}>{'{balance}'}</code>. The app will fill in the right values per member.
      </p>
      <textarea
        value={tpl}
        onChange={(e) => setTpl(e.target.value)}
        onBlur={commit}
        rows={4}
        style={{
          ...inp,
          fontFamily: 'inherit',
          resize: 'vertical',
        }}
      />
    </div>
  );
}

function CategoriesPanel({
  categories,
  onChange,
}: {
  categories: Category[];
  onChange: (next: Category[]) => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('⭐');

  function add() {
    if (!name.trim()) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    if (categories.find((c) => c.id === id)) return;
    onChange([...categories, { id, name: name.trim(), icon: icon || '⭐' }]);
    setName('');
    setIcon('⭐');
  }
  function rm(id: string) {
    if (!confirm('Remove this category? Notes already in it will keep the tag.')) return;
    onChange(categories.filter((c) => c.id !== id));
  }
  function reset() {
    if (!confirm('Reset categories to defaults?')) return;
    onChange(DEFAULT_CATEGORIES);
  }

  return (
    <div>
      <p style={help}>Categories are the colored tabs on the Notes page.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {categories.map((c) => (
          <span
            key={c.id}
            style={{
              background: '#f5f8fc',
              border: `1px solid ${E.rule}`,
              borderRadius: 16,
              padding: '5px 10px 5px 12px',
              fontSize: '0.84rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {c.icon} {c.name}
            <button
              onClick={() => rm(c.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: E.mute }}
              aria-label="Remove"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={4}
          placeholder="🎵"
          style={{ ...inp, width: 80 }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          style={{ ...inp, maxWidth: 240 }}
        />
        <button onClick={add} style={btnGreen}>
          <Plus size={14} /> Add
        </button>
        <button onClick={reset} style={btnGray}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

function SafetyPanel({
  settings,
  onChange,
}: {
  settings: ExerciseSettings;
  onChange: (next: ExerciseSettings) => void;
}) {
  function patch<K extends keyof ExerciseSettings>(k: K, v: ExerciseSettings[K]) {
    onChange({ ...settings, [k]: v });
  }
  return (
    <div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
          fontSize: '0.9rem',
          color: E.ink,
        }}
      >
        <input
          type="checkbox"
          checked={settings.readOnlyLock}
          onChange={(e) => patch('readOnlyLock', e.target.checked)}
        />
        <span>
          <strong>Read-only lock</strong>
          <br />
          <small style={{ color: E.mute }}>
            When ON, the Edit toggle is disabled. Useful when handing the device to someone else.
          </small>
        </span>
      </label>

      <Field label="Edit PIN (optional — 4 digits)">
        <input
          value={settings.editPin}
          onChange={(e) => patch('editPin', e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="e.g. 1234 (blank = no PIN)"
          maxLength={4}
          style={{ ...inp, maxWidth: 160, letterSpacing: 6, textAlign: 'center' }}
        />
        <p style={help}>If set, you'll need to enter this PIN to flip into edit mode.</p>
      </Field>
    </div>
  );
}

function ProfilePanel({
  trainer,
  userId,
  qc,
}: {
  trainer: Trainer;
  userId: string | undefined;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [form, setForm] = useState<Partial<Trainer>>(trainer);
  useEffect(() => setForm(trainer), [trainer]);

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase
        .from('trainers')
        .update({
          full_name: (form.full_name as string)?.trim() ?? trainer.full_name,
          phone: (form.phone as string)?.trim() || null,
          timezone: form.timezone ?? trainer.timezone,
          currency: form.currency ?? trainer.currency,
          notify_email: !!form.notify_email,
        })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer'] }),
  });

  return (
    <div>
      <div style={fieldGrid}>
        <Field label="Full name">
          <input
            value={form.full_name ?? ''}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            style={inp}
          />
        </Field>
        <Field label="Phone">
          <input
            value={form.phone ?? ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            style={inp}
          />
        </Field>
        <Field label="Timezone">
          <select
            value={form.timezone ?? 'America/New_York'}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            style={inp}
          >
            {COMMON_TZ.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Currency">
          <select
            value={form.currency ?? 'USD'}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            style={inp}
          >
            <option value="USD">USD</option>
            <option value="ILS">ILS</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
            <option value="AUD">AUD</option>
          </select>
        </Field>
      </div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.88rem',
          marginTop: 12,
          color: E.ink,
        }}
      >
        <input
          type="checkbox"
          checked={!!form.notify_email}
          onChange={(e) => setForm({ ...form, notify_email: e.target.checked })}
        />
        Email me when a member books, cancels, or sends a message
      </label>
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        style={{ ...btnPrimary, marginTop: 12 }}
      >
        {save.isPending ? 'Saving…' : '✓ Save profile'}
      </button>
      {save.isSuccess && (
        <span style={{ color: E.greenDeep, marginLeft: 12, fontSize: '0.85rem' }}>Saved!</span>
      )}
    </div>
  );
}

function HolidaysPanel({
  holidays,
  onChange,
}: {
  holidays: Holiday[];
  onChange: (next: Holiday[]) => void;
}) {
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  function add() {
    if (!date) return;
    onChange([
      ...holidays,
      { id: `hd-${Date.now()}`, date, label: label.trim() },
    ]);
    setDate('');
    setLabel('');
  }
  function rm(id: string) {
    onChange(holidays.filter((h) => h.id !== id));
  }
  const sorted = holidays.slice().sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div>
      <p style={help}>
        Dates when class is canceled (yom tov, illness, vacation). Shown on the dashboard
        so you don't accidentally charge anyone.
      </p>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Reason (optional)"
          style={inp}
        />
        <button onClick={add} style={btnGreen}>+ Add</button>
      </div>
      {sorted.length === 0 ? (
        <p style={dim}>No holidays added yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {sorted.map((h) => (
            <li
              key={h.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderBottom: `1px solid ${E.ruleSoft}`,
              }}
            >
              <span style={{ fontSize: '0.88rem' }}>
                <strong>{new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                {h.label && <span style={{ color: E.mute, marginLeft: 10 }}>{h.label}</span>}
              </span>
              <button
                onClick={() => rm(h.id)}
                style={{ background: 'transparent', border: 'none', color: E.mute, cursor: 'pointer' }}
                aria-label="Remove"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TagsPanel({
  tags,
  onChange,
}: {
  tags: Tag[];
  onChange: (next: Tag[]) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2d6a9f');
  function add() {
    if (!name.trim()) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);
    if (tags.find((t) => t.id === id)) return;
    onChange([...tags, { id, name: name.trim(), color }]);
    setName('');
  }
  function rm(id: string) {
    if (!confirm('Remove this tag? Members already tagged with it will keep the tag value.')) return;
    onChange(tags.filter((t) => t.id !== id));
  }
  return (
    <div>
      <p style={help}>
        Free-form labels — "VIP", "newcomer", "needs spotter", anything. Filter the
        Members tab by tag.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {tags.map((t) => (
          <span
            key={t.id}
            style={{
              background: t.color + '22',
              color: t.color,
              border: `1px solid ${t.color}`,
              borderRadius: 16,
              padding: '4px 11px 4px 13px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {t.name}
            <button
              onClick={() => rm(t.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
              aria-label="Remove"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {tags.length === 0 && <span style={dim}>No tags yet.</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 38, height: 36, border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer' }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tag name"
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{ ...inp, maxWidth: 220 }}
        />
        <button onClick={add} style={btnGreen}>+ Add</button>
      </div>
    </div>
  );
}

function CustomFieldsPanel({
  fields,
  onChange,
}: {
  fields: CustomField[];
  onChange: (next: CustomField[]) => void;
}) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomField['type']>('text');
  function add() {
    if (!label.trim()) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);
    if (fields.find((f) => f.id === id)) return;
    onChange([...fields, { id, label: label.trim(), type }]);
    setLabel('');
  }
  function rm(id: string) {
    if (!confirm('Remove this field? Members keep their existing values for it.')) return;
    onChange(fields.filter((f) => f.id !== id));
  }
  return (
    <div>
      <p style={help}>
        Extra fields shown on the Edit-member modal — emergency contact, allergies,
        spouse's name, anything you want to track per person.
      </p>
      {fields.length === 0 ? (
        <p style={dim}>No custom fields yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
          {fields.map((f) => (
            <li
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderBottom: `1px solid ${E.ruleSoft}`,
                fontSize: '0.88rem',
              }}
            >
              <span>
                <strong>{f.label}</strong>
                <span style={{ color: E.mute, marginLeft: 8, fontSize: '0.78rem' }}>
                  {f.type}
                </span>
              </span>
              <button
                onClick={() => rm(f.id)}
                style={{ background: 'transparent', border: 'none', color: E.mute, cursor: 'pointer' }}
                aria-label="Remove"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Field label (e.g. Allergies)"
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{ ...inp, maxWidth: 260 }}
        />
        <select value={type} onChange={(e) => setType(e.target.value as CustomField['type'])} style={{ ...inp, maxWidth: 110 }}>
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
        </select>
        <button onClick={add} style={btnGreen}>+ Add</button>
      </div>
    </div>
  );
}

function DataMaintenancePanel() {
  const { data: cfg, save: saveCfg } = useExerciseConfig();
  const { data: clients = [] } = useExerciseClients();
  const { data: payments = [] } = useExercisePayments();

  function exportMembers() {
    const csv = membersCsv(clients);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`members-${stamp}.csv`, csv);
  }
  function exportPayments() {
    const csv = paymentsCsv(payments, clients);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`payments-${stamp}.csv`, csv);
  }
  function resetSms() {
    if (!cfg) return;
    if (!confirm('Reset the SMS reminder template to the default text?')) return;
    saveCfg.mutate(
      appendLog(
        { ...cfg, settings: { ...cfg.settings, smsTemplate: DEFAULT_SETTINGS.smsTemplate } },
        'settings',
        'Reset SMS template to default',
      ),
    );
  }
  function clearLog() {
    if (!cfg) return;
    if (!confirm('Clear the entire activity log? This cannot be undone.')) return;
    saveCfg.mutate({ ...cfg, log: [] });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <Lbl>Export data</Lbl>
        <p style={help}>Download a spreadsheet copy. Open in Excel or Google Sheets.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button onClick={exportMembers} style={btnPrimaryLite}>
            📊 Members CSV ({clients.length})
          </button>
          <button onClick={exportPayments} style={btnPrimaryLite}>
            💰 Payments CSV ({payments.length})
          </button>
        </div>
      </div>
      <div>
        <Lbl>SMS template</Lbl>
        <p style={help}>Restore the default reminder wording.</p>
        <button onClick={resetSms} style={btnGray}>
          ↻ Reset SMS template to default
        </button>
      </div>
      <div>
        <Lbl>Activity log</Lbl>
        <p style={help}>
          Wipes all {cfg?.log.length ?? 0} entries. New actions will start logging again
          immediately.
        </p>
        <button onClick={clearLog} style={btnDanger}>
          🗑 Clear activity log
        </button>
      </div>
    </div>
  );
}

const btnPrimaryLite: React.CSSProperties = {
  background: '#fff',
  color: E.primary,
  border: `1px solid ${E.primary}`,
  padding: '8px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.85rem',
};
const btnDanger: React.CSSProperties = {
  background: 'transparent',
  color: E.redDeep,
  border: `1px solid ${E.red}`,
  padding: '8px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.85rem',
};

// ── Layout primitives ────────────────────────────────────────────────

function SettingsSection({
  title,
  emoji,
  children,
  defaultOpen,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section
      style={{
        background: '#fff',
        border: `1px solid ${E.rule}`,
        borderRadius: 10,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          background: open ? '#f5f8fc' : '#fff',
          border: 'none',
          padding: '12px 18px',
          textAlign: 'left',
          fontSize: '0.95rem',
          fontWeight: 700,
          color: E.primaryDeep,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span>
          {emoji} {title}
        </span>
      </button>
      {open && <div style={{ padding: '14px 20px 18px' }}>{children}</div>}
    </section>
  );
}

function PanelCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${E.rule}`,
        borderRadius: 8,
        padding: 14,
        color: '#1E293B',
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Lbl>{label}</Lbl>
      {children}
    </label>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: '0.74rem',
        fontWeight: 700,
        color: E.inkSoft,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
      }}
    >
      {children}
    </span>
  );
}

const fieldGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
};
const mainHeading: React.CSSProperties = {
  marginTop: 28,
  marginBottom: 10,
  fontSize: '1rem',
  color: E.primaryDeep,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};
const inp: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #ccc',
  borderRadius: 8,
  fontSize: '0.92rem',
  fontFamily: 'Arial, sans-serif',
  outline: 'none',
  background: '#fff',
};
const help: React.CSSProperties = {
  fontSize: '0.8rem',
  color: E.muteFaint,
  margin: '4px 0',
};
const dim: React.CSSProperties = { color: E.mute, fontSize: '0.85rem' };
const code: React.CSSProperties = {
  background: '#f0f4f8',
  padding: '1px 6px',
  borderRadius: 4,
  fontFamily: 'monospace',
  fontSize: '0.78rem',
};
const btnGreen: React.CSSProperties = {
  background: E.green,
  color: '#fff',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.85rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};
const btnGray: React.CSSProperties = {
  background: 'transparent',
  color: E.mute,
  border: `1px solid ${E.rule}`,
  padding: '7px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.82rem',
};
const btnPrimary: React.CSSProperties = {
  background: E.primary,
  color: '#fff',
  border: 'none',
  padding: '10px 18px',
  borderRadius: 8,
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.88rem',
};

// silence unused warnings on imports kept for future expansion
void Trash2;
void useMemo;
