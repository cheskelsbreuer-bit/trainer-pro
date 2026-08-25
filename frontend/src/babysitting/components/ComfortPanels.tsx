// Her comforts — the settings that make the app feel like HERS:
// app level (Simple/Standard/Pro), safety locks (PIN + read-only),
// her payment-method list, custom fields on every kid, colored kid
// tags, and closure days the whole app respects.

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { B } from '../theme';
import {
  useBabysittingConfig,
  appendLog,
  type BabysittingConfig,
  type CustomFieldDef,
  type KidTagDef,
  type ClosureDay,
} from '../lib/config';
import { Card, SectionTitle, Btn, Chip, Field, inputStyle } from './ui';

const TAG_COLORS = ['#d96f4e', '#4f9d94', '#b98420', '#7c5e8e', '#4e7e52', '#98455e', '#3a5e85'];

function freshId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function ComfortPanels() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const cfg = useBabysittingConfig();
  const [newField, setNewField] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newClosureDate, setNewClosureDate] = useState('');
  const [newClosureName, setNewClosureName] = useState('');

  if (!cfg.data) return null;
  const c = cfg.data;
  const s = c.settings;

  function save(mutate: (x: BabysittingConfig) => BabysittingConfig, log: string) {
    cfg.save.mutate(appendLog(mutate(cfg.data!), 'settings', log));
  }

  const levelCard = (
    level: 'simple' | 'standard' | 'pro',
    emoji: string,
    title: string,
    blurb: string,
  ) => (
    <button
      key={level}
      disabled={!editMode}
      onClick={() =>
        save((x) => ({ ...x, settings: { ...x.settings, appLevel: level } }), `App level set to ${title}`)
      }
      style={{
        flex: 1,
        minWidth: 150,
        textAlign: 'left',
        border: s.appLevel === level ? `2px solid ${B.primary}` : `1.5px solid ${B.rule}`,
        background: s.appLevel === level ? B.primarySoft : '#fffdf9',
        borderRadius: B.radiusSm,
        padding: '12px 14px',
        cursor: editMode ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{emoji} {title}</div>
      <div style={{ fontSize: '0.74rem', color: B.inkSoft, marginTop: 3 }}>{blurb}</div>
    </button>
  );

  return (
    <>
      {/* App level */}
      <Card>
        <SectionTitle>📐 How much app do you want?</SectionTitle>
        <div style={{ color: B.inkSoft, fontSize: '0.85rem', marginBottom: 12 }}>
          Start simple; unlock more whenever you're ready. Nothing is deleted — tabs just hide.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {levelCard('simple', '🌱', 'Simple', 'Home, Kids, Messages, Settings. The essentials.')}
          {levelCard('standard', '🌿', 'Standard', 'Adds Families and Billing. The everyday setup.')}
          {levelCard('pro', '🌳', 'Pro', 'Everything: Reports, Away, Former, and the Log.')}
        </div>
      </Card>

      {/* Safety locks */}
      <Card>
        <SectionTitle>🔒 Safety locks</SectionTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Btn
            kind={s.readOnlyLock ? 'primary' : 'ghost'}
            size="sm"
            disabled={!editMode}
            onClick={() => {
              const turningOn = !s.readOnlyLock;
              if (turningOn && !window.confirm('Lock editing completely? You will need to come back here (with editing already on) to unlock.')) return;
              save((x) => ({ ...x, settings: { ...x.settings, readOnlyLock: turningOn } }), turningOn ? 'Read-only lock ON' : 'Read-only lock OFF');
            }}
          >
            {s.readOnlyLock ? '🔒 Read-only lock is ON' : 'Turn on read-only lock'}
          </Btn>
          <Btn
            kind={s.editPin ? 'accent' : 'ghost'}
            size="sm"
            disabled={!editMode}
            onClick={() => {
              const pin = window.prompt(s.editPin ? 'New 4-digit PIN (leave empty to remove):' : 'Choose a 4-digit PIN for turning editing on:') ?? '';
              if (pin && !/^\d{4}$/.test(pin)) {
                window.alert('The PIN must be exactly 4 digits.');
                return;
              }
              save((x) => ({ ...x, settings: { ...x.settings, editPin: pin } }), pin ? 'Editing PIN set' : 'Editing PIN removed');
            }}
          >
            {s.editPin ? '🔢 PIN is set — change it' : 'Set an editing PIN'}
          </Btn>
          <span style={{ fontSize: '0.78rem', color: B.mute }}>
            Hand the iPad to anyone — money can't change without the PIN.
          </span>
        </div>
      </Card>

      {/* Payment methods */}
      <Card>
        <SectionTitle>💳 How people pay you</SectionTitle>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {s.paymentMethods.map((m) => (
            <Chip key={m} tone="accent" style={{ textTransform: 'capitalize' }}>
              {m}
              {editMode && s.paymentMethods.length > 1 && (
                <button
                  onClick={() =>
                    save(
                      (x) => ({ ...x, settings: { ...x.settings, paymentMethods: x.settings.paymentMethods.filter((y) => y !== m) } }),
                      `Removed payment method "${m}"`,
                    )
                  }
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', fontWeight: 800, marginLeft: 2 }}
                  aria-label={`Remove ${m}`}
                >
                  ×
                </button>
              )}
            </Chip>
          ))}
          {editMode && (
            <Btn
              size="sm"
              kind="ghost"
              onClick={() => {
                const m = (window.prompt('Add a way people pay you (e.g. paypal):') ?? '').trim().toLowerCase();
                if (!m || s.paymentMethods.includes(m)) return;
                save((x) => ({ ...x, settings: { ...x.settings, paymentMethods: [...x.settings.paymentMethods, m] } }), `Added payment method "${m}"`);
              }}
            >
              + Add
            </Btn>
          )}
        </div>
      </Card>

      {/* Custom fields */}
      <Card>
        <SectionTitle>📋 Your own fields on every kid</SectionTitle>
        <div style={{ color: B.inkSoft, fontSize: '0.85rem', marginBottom: 10 }}>
          Doctor, pickup password, nap schedule — whatever you track, it shows on every kid's card.
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {c.customFields.map((f: CustomFieldDef) => (
            <Chip key={f.id} tone="butter">
              {f.label}
              {editMode && (
                <button
                  onClick={() => {
                    if (!window.confirm(`Remove the "${f.label}" field? Values already saved on kids stay until edited.`)) return;
                    save((x) => ({ ...x, customFields: x.customFields.filter((y) => y.id !== f.id) }), `Removed field "${f.label}"`);
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', fontWeight: 800, marginLeft: 2 }}
                  aria-label={`Remove ${f.label}`}
                >
                  ×
                </button>
              )}
            </Chip>
          ))}
          {editMode && (
            <>
              <input
                style={{ ...inputStyle, width: 180, padding: '7px 11px' }}
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                placeholder="e.g. Doctor"
              />
              <Btn
                size="sm"
                kind="soft"
                onClick={() => {
                  const label = newField.trim();
                  if (!label) return;
                  save((x) => ({ ...x, customFields: [...x.customFields, { id: freshId('cf'), label }] }), `Added field "${label}"`);
                  setNewField('');
                }}
              >
                + Add field
              </Btn>
            </>
          )}
          {!c.customFields.length && !editMode && <span style={{ color: B.mute, fontSize: '0.84rem' }}>None yet.</span>}
        </div>
      </Card>

      {/* Kid tags */}
      <Card>
        <SectionTitle>🏷 Kid tags</SectionTitle>
        <div style={{ color: B.inkSoft, fontSize: '0.85rem', marginBottom: 10 }}>
          Colored labels — "New", "Potty training", "Leaves early" — pick them on each kid's card.
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {c.kidTags.map((t: KidTagDef) => (
            <span
              key={t.id}
              style={{
                background: `${t.color}22`,
                color: t.color,
                borderRadius: 999,
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '4px 12px',
                display: 'inline-flex',
                gap: 4,
                alignItems: 'center',
              }}
            >
              {t.label}
              {editMode && (
                <button
                  onClick={() =>
                    save((x) => ({ ...x, kidTags: x.kidTags.filter((y) => y.id !== t.id) }), `Removed tag "${t.label}"`)
                  }
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
                  aria-label={`Remove ${t.label}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {editMode && (
            <>
              <input
                style={{ ...inputStyle, width: 160, padding: '7px 11px' }}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="e.g. New"
              />
              <Btn
                size="sm"
                kind="soft"
                onClick={() => {
                  const label = newTag.trim();
                  if (!label) return;
                  const color = TAG_COLORS[c.kidTags.length % TAG_COLORS.length];
                  save((x) => ({ ...x, kidTags: [...x.kidTags, { id: freshId('kt'), label, color }] }), `Added tag "${label}"`);
                  setNewTag('');
                }}
              >
                + Add tag
              </Btn>
            </>
          )}
          {!c.kidTags.length && !editMode && <span style={{ color: B.mute, fontSize: '0.84rem' }}>None yet.</span>}
        </div>
      </Card>

      {/* Closure days */}
      <Card>
        <SectionTitle>📅 Closed days</SectionTitle>
        <div style={{ color: B.inkSoft, fontSize: '0.85rem', marginBottom: 10 }}>
          Vacation, yom tov, snow days — they show on your Home page so the day starts with no surprises.
        </div>
        <div style={{ display: 'grid', gap: 6, marginBottom: editMode ? 12 : 0 }}>
          {[...c.closures]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((cl: ClosureDay) => (
              <div key={cl.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem' }}>
                <Chip tone="plum">{cl.date}</Chip>
                <span style={{ fontWeight: 700, flex: 1 }}>{cl.name}</span>
                {editMode && (
                  <Btn
                    size="sm"
                    kind="ghost"
                    onClick={() => save((x) => ({ ...x, closures: x.closures.filter((y) => y.id !== cl.id) }), `Removed closed day ${cl.date}`)}
                  >
                    ×
                  </Btn>
                )}
              </div>
            ))}
          {!c.closures.length && <span style={{ color: B.mute, fontSize: '0.84rem' }}>No closed days coming up.</span>}
        </div>
        {editMode && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="Date" style={{ marginBottom: 0 }}>
              <input style={{ ...inputStyle, width: 160 }} type="date" value={newClosureDate} onChange={(e) => setNewClosureDate(e.target.value)} />
            </Field>
            <Field label="What is it" style={{ marginBottom: 0 }}>
              <input style={{ ...inputStyle, width: 180 }} value={newClosureName} onChange={(e) => setNewClosureName(e.target.value)} placeholder="e.g. Chol Hamoed" />
            </Field>
            <Btn
              size="sm"
              onClick={() => {
                if (!newClosureDate) return;
                save(
                  (x) => ({ ...x, closures: [...x.closures, { id: freshId('cl'), date: newClosureDate, name: newClosureName.trim() || 'Closed' }] }),
                  `Added closed day ${newClosureDate}`,
                );
                setNewClosureDate('');
                setNewClosureName('');
              }}
            >
              + Add
            </Btn>
          </div>
        )}
      </Card>
    </>
  );
}
