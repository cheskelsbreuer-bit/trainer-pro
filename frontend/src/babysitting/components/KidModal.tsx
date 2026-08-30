// Add / edit one kid. Identity fields map to real columns (parent's
// phone + email, kid's birthday, allergies in medical_notes, care notes
// in notes); babysitting-specific fields ride the tags.

import { useMemo, useState } from 'react';
import type { Client } from '../../lib/database.types';
import {
  B,
  ALL_DAYS,
  DAY_SHORT,
  familySlugOf,
  familyLabel,
  readFamilySlug,
  readParent,
  readDays,
  readWeeklyRate,
  readHourlyRate,
  readStartDate,
  tagsWithProfile,
  readCustomValues,
  readKidTagIds,
  tagsWithCustom,
} from '../theme';
import { useUpsertKid, useKids } from '../lib/data';
import { useBabysittingConfig, appendLog } from '../lib/config';
import { Modal, Field, inputStyle, Btn, Chip } from './ui';

export function KidModal({ kid, onClose }: { kid: Client | null; onClose: () => void }) {
  const upsert = useUpsertKid();
  const { data: kids } = useKids();
  const cfg = useBabysittingConfig();

  const [name, setName] = useState(kid?.full_name ?? '');
  const [familyName, setFamilyName] = useState(kid ? familyLabel(readFamilySlug(kid)).replace(/ family$/, '') : '');
  const [parent, setParent] = useState(kid ? readParent(kid) : '');
  const [phone, setPhone] = useState(kid?.phone ?? '');
  const [email, setEmail] = useState(kid?.email ?? '');
  const [dob, setDob] = useState(kid?.date_of_birth ?? '');
  const [days, setDays] = useState<string[]>(kid ? readDays(kid) : []);
  const [weeklyRate, setWeeklyRate] = useState(
    kid ? String(readWeeklyRate(kid) || '') : String(cfg.data?.settings.defaultWeeklyRate || ''),
  );
  const [hourlyRate, setHourlyRate] = useState(
    kid ? String(readHourlyRate(kid) || '') : String(cfg.data?.settings.defaultHourlyRate || ''),
  );
  const [allergies, setAllergies] = useState(kid?.medical_notes ?? '');
  const [notes, setNotes] = useState(kid?.notes ?? '');
  const [emergency, setEmergency] = useState(kid?.emergency_contact ?? '');
  const [cfValues, setCfValues] = useState<Record<string, string>>(kid ? readCustomValues(kid) : {});
  const [tagIds, setTagIds] = useState<string[]>(kid ? readKidTagIds(kid) : []);
  const [err, setErr] = useState('');

  const familyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const k of kids ?? []) {
      const slug = readFamilySlug(k);
      if (slug) set.add(familyLabel(slug).replace(/ family$/, ''));
    }
    return Array.from(set).sort();
  }, [kids]);

  function toggleDay(d: string) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function save() {
    if (!name.trim()) {
      setErr('The kid needs a name.');
      return;
    }
    setErr('');
    const orderedDays = ALL_DAYS.filter((d) => days.includes(d));
    const baseTags = tagsWithProfile(kid?.tags ?? [], {
      familySlug: familyName.trim() ? familySlugOf(familyName) : null,
      parent: parent.trim() || null,
      daysSlug: orderedDays.length ? orderedDays.join('-') : null,
      weeklyRate: weeklyRate.trim() ? parseFloat(weeklyRate) || 0 : null,
      hourlyRate: hourlyRate.trim() ? parseFloat(hourlyRate) || 0 : null,
      startDate: kid ? readStartDate(kid) : new Date().toISOString().slice(0, 10),
    });
    const tags = tagsWithCustom(baseTags, cfValues, tagIds);
    try {
      await upsert.mutateAsync({
        id: kid?.id,
        full_name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        date_of_birth: dob || null,
        medical_notes: allergies.trim() || null,
        notes: notes.trim() || null,
        emergency_contact: emergency.trim() || null,
        tags,
      });
      if (cfg.data) {
        cfg.save.mutate(
          appendLog(cfg.data, 'kid', kid ? `Updated ${name.trim()}` : `Added ${name.trim()}`),
        );
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    }
  }

  return (
    <Modal title={kid ? `Edit ${kid.full_name}` : 'Add a kid'} onClose={onClose} width={520}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Kid's name" style={{ gridColumn: '1 / -1' }}>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rivky Cohen" autoFocus />
        </Field>
        <Field label="Family" hint="Siblings with the same family are billed together.">
          <input
            style={inputStyle}
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="e.g. Cohen"
            list="bs-family-options"
          />
          <datalist id="bs-family-options">
            {familyOptions.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Field>
        <Field label="Parent's name">
          <input style={inputStyle} value={parent} onChange={(e) => setParent(e.target.value)} placeholder="e.g. Malky" />
        </Field>
        <Field label="Parent's phone">
          <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
        </Field>
        <Field label="Parent's email">
          <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="parent@email.com" />
        </Field>
        <Field label="Birthday">
          <input style={inputStyle} type="date" value={dob ?? ''} onChange={(e) => setDob(e.target.value)} />
        </Field>
        <Field label="Emergency contact">
          <input style={inputStyle} value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder="Name + phone" />
        </Field>
        <Field label="Days here" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ALL_DAYS.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: B.pill,
                    padding: '7px 13px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    background: on ? B.accent : '#f2ede4',
                    color: on ? '#fff' : B.inkSoft,
                  }}
                >
                  {DAY_SHORT[d]}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Weekly rate ($)" hint="Flat rate for a normal week.">
          <input style={inputStyle} type="number" min="0" value={weeklyRate} onChange={(e) => setWeeklyRate(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Hourly rate ($)" hint="For billing by the hour.">
          <input style={inputStyle} type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="0" />
        </Field>
        {(cfg.data?.customFields ?? []).map((f) => (
          <Field key={f.id} label={f.label}>
            <input
              style={inputStyle}
              value={cfValues[f.id] ?? ''}
              onChange={(e) => setCfValues((p) => ({ ...p, [f.id]: e.target.value }))}
            />
          </Field>
        ))}
        {!(cfg.data?.customFields ?? []).length && (
          <div style={{ gridColumn: '1 / -1', fontSize: '0.74rem', color: B.mute, margin: '0 0 13px' }}>
            Want more boxes on this form — doctor, pickup password, nap schedule? Add your own fields
            in Settings → 🧰 Make it yours. They'll show up here and on every kid's page.
          </div>
        )}
        {(cfg.data?.kidTags ?? []).length > 0 && (
          <Field label="Tags" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(cfg.data?.kidTags ?? []).map((tg) => {
                const on = tagIds.includes(tg.id);
                return (
                  <button
                    key={tg.id}
                    type="button"
                    onClick={() => setTagIds((p) => (on ? p.filter((x) => x !== tg.id) : [...p, tg.id]))}
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: B.pill,
                      padding: '6px 13px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      background: on ? tg.color : '#f2ede4',
                      color: on ? '#fff' : B.inkSoft,
                    }}
                  >
                    {tg.label}
                  </button>
                );
              })}
            </div>
          </Field>
        )}
        <Field label="Allergies" style={{ gridColumn: '1 / -1' }} hint="Shows as a red badge everywhere this kid appears.">
          <input style={inputStyle} value={allergies ?? ''} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. peanuts, dairy" />
        </Field>
        <Field label="Care notes" style={{ gridColumn: '1 / -1' }}>
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
            value={notes ?? ''}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nap schedule, favorite snack, pickup notes…"
          />
        </Field>
      </div>
      {err && <Chip tone="red" style={{ marginBottom: 12 }}>{err}</Chip>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={upsert.isPending}>
          {upsert.isPending ? 'Saving…' : kid ? 'Save changes' : 'Add kid'}
        </Btn>
      </div>
    </Modal>
  );
}
