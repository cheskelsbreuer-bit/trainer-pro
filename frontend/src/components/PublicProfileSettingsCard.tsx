import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  ImageIcon,
  ExternalLink,
  Save,
  Trash2,
  Plus,
  X,
  Phone,
  Mail,
  Instagram,
  MessageCircle,
  MapPin,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PublicProfile, Trainer } from '../lib/database.types';
import { pickTemplateUx } from '../lib/templateUx';

const DEFAULT: PublicProfile = {
  hero: { title: null, subtitle: null, photo_url: null, cta_text: 'Book a free consultation' },
  about: { headline: null, body: null, photo_url: null },
  contact: { phone: null, email: null, instagram: null, whatsapp: null, address: null },
  gallery: [],
};

function merge(p: Partial<PublicProfile> | null | undefined): PublicProfile {
  return {
    hero: { ...DEFAULT.hero, ...(p?.hero ?? {}) },
    about: { ...DEFAULT.about, ...(p?.about ?? {}) },
    contact: { ...DEFAULT.contact, ...(p?.contact ?? {}) },
    gallery: p?.gallery ?? [],
  };
}

export function PublicProfileSettingsCard({ trainer }: { trainer: Trainer }) {
  const qc = useQueryClient();
  // Per-template placeholders + label copy. A nutrition coach\'s editor
  // shouldn't use personal-trainer copy; a martial-arts dojo's shouldn't
  // either. The pickTemplateUx() registry tells us which template this
  // trainer is on and what placeholder copy to surface.
  const tx = pickTemplateUx(trainer.template_slugs);
  const ph = tx.publicProfile;
  const [form, setForm] = useState<PublicProfile>(merge(trainer.public_profile));
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingAbout, setUploadingAbout] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  useEffect(() => {
    setForm(merge(trainer.public_profile));
  }, [trainer.id, trainer.public_profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('trainers')
        .update({ public_profile: form })
        .eq('id', trainer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', trainer.id] });
      qc.invalidateQueries({ queryKey: ['public-profile'] });
    },
  });

  function setHero<K extends keyof PublicProfile['hero']>(k: K, v: PublicProfile['hero'][K]) {
    setForm((f) => ({ ...f, hero: { ...f.hero, [k]: v } }));
  }
  function setAbout<K extends keyof PublicProfile['about']>(k: K, v: PublicProfile['about'][K]) {
    setForm((f) => ({ ...f, about: { ...f.about, [k]: v } }));
  }
  function setContact<K extends keyof PublicProfile['contact']>(
    k: K,
    v: PublicProfile['contact'][K],
  ) {
    setForm((f) => ({ ...f, contact: { ...f.contact, [k]: v } }));
  }

  async function uploadImage(
    file: File,
    target: 'hero' | 'about' | 'gallery',
  ): Promise<string | null> {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${trainer.id}/${target}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('public-gallery')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) {
      alert(`Upload failed: ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from('public-gallery').getPublicUrl(path);
    return data?.publicUrl ?? null;
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingHero(true);
    const url = await uploadImage(f, 'hero');
    if (url) setHero('photo_url', url);
    setUploadingHero(false);
  }
  async function handleAboutUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingAbout(true);
    const url = await uploadImage(f, 'about');
    if (url) setAbout('photo_url', url);
    setUploadingAbout(false);
  }
  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingGallery(true);
    for (const f of files) {
      const url = await uploadImage(f, 'gallery');
      if (url) {
        setForm((cur) => ({ ...cur, gallery: [...cur.gallery, { url }] }));
      }
    }
    setUploadingGallery(false);
    e.target.value = '';
  }
  function removeGallery(idx: number) {
    setForm((cur) => ({ ...cur, gallery: cur.gallery.filter((_, i) => i !== idx) }));
  }

  const inputCls =
    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

  const profileUrl = trainer.slug ? `${window.location.origin}/p/${trainer.slug}` : null;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start gap-2 mb-4">
        <Globe size={18} className="text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">Public profile site</h3>
          <p className="text-xs text-slate-500">
            Your free hosted website. Hero, about, packages, gallery, testimonials. Editable here.
          </p>
        </div>
        {profileUrl && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700"
          >
            View live <ExternalLink size={11} />
          </a>
        )}
      </div>

      {!trainer.slug && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mb-4">
          Set a <code className="bg-white px-1 rounded">slug</code> in the Booking section above
          first — your profile lives at <code>/p/&lt;slug&gt;</code>.
        </div>
      )}

      {/* Hero */}
      <Group title="Hero" subtitle="The big photo + headline at the top.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Headline</label>
            <input
              className={inputCls}
              placeholder={ph.heroHeadline}
              value={form.hero.title ?? ''}
              onChange={(e) => setHero('title', e.target.value || null)}
            />
          </div>
          <div>
            <label className={labelCls}>CTA button text</label>
            <input
              className={inputCls}
              placeholder={ph.heroCta}
              value={form.hero.cta_text ?? ''}
              onChange={(e) => setHero('cta_text', e.target.value || null)}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className={labelCls}>Subtitle</label>
          <textarea
            rows={2}
            className={inputCls}
            placeholder={ph.heroSubtitle}
            value={form.hero.subtitle ?? ''}
            onChange={(e) => setHero('subtitle', e.target.value || null)}
          />
        </div>
        <PhotoField
          label="Hero background photo"
          url={form.hero.photo_url}
          uploading={uploadingHero}
          onUpload={handleHeroUpload}
          onClear={() => setHero('photo_url', null)}
        />
      </Group>

      {/* About */}
      <Group title="About" subtitle="Your personal pitch.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Headline</label>
            <input
              className={inputCls}
              placeholder={ph.aboutHeadline}
              value={form.about.headline ?? ''}
              onChange={(e) => setAbout('headline', e.target.value || null)}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className={labelCls}>Body</label>
          <textarea
            rows={5}
            className={inputCls}
            placeholder={ph.aboutBody}
            value={form.about.body ?? ''}
            onChange={(e) => setAbout('body', e.target.value || null)}
          />
        </div>
        <PhotoField
          label="Portrait photo (about section)"
          url={form.about.photo_url}
          uploading={uploadingAbout}
          onUpload={handleAboutUpload}
          onClear={() => setAbout('photo_url', null)}
        />
      </Group>

      {/* Contact */}
      <Group title="Contact" subtitle="What clients see in the footer + contact section.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ContactInput
            icon={<Phone size={14} />}
            label="Phone"
            value={form.contact.phone}
            onChange={(v) => setContact('phone', v)}
            placeholder="555-0100"
          />
          <ContactInput
            icon={<Mail size={14} />}
            label="Email"
            value={form.contact.email}
            onChange={(v) => setContact('email', v)}
            placeholder={ph.emailPlaceholder}
          />
          <ContactInput
            icon={<MessageCircle size={14} />}
            label="WhatsApp number"
            value={form.contact.whatsapp}
            onChange={(v) => setContact('whatsapp', v)}
            placeholder="+1 555 0100"
          />
          <ContactInput
            icon={<Instagram size={14} />}
            label="Instagram handle"
            value={form.contact.instagram}
            onChange={(v) => setContact('instagram', v)}
            placeholder={ph.instagramPlaceholder}
          />
        </div>
        <div className="mt-3">
          <ContactInput
            icon={<MapPin size={14} />}
            label={ph.addressLabel}
            value={form.contact.address}
            onChange={(v) => setContact('address', v)}
            placeholder={ph.addressPlaceholder}
          />
        </div>
      </Group>

      {/* Gallery */}
      <Group title="Gallery" subtitle="Up to 9 photos. Shown in a grid on the public site.">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {form.gallery.map((g, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
              <img src={g.url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeGallery(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                title="Remove"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {form.gallery.length < 9 && (
            <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 text-xs gap-1 transition">
              {uploadingGallery ? (
                'Uploading…'
              ) : (
                <>
                  <Plus size={16} />
                  Add photo
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </Group>

      <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          {save.error
            ? `Error: ${(save.error as Error).message}`
            : save.isSuccess
              ? 'Saved.'
              : 'Changes are saved on demand.'}
        </p>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Save size={14} />
          {save.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </section>
  );
}

function Group({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 pb-4 border-b border-slate-100 last:border-b-0 last:pb-0 last:mb-0">
      <div className="mb-2.5">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function PhotoField({
  label,
  url,
  uploading,
  onUpload,
  onClear,
}: {
  label: string;
  url: string | null;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-3">
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {url ? (
        <div className="flex items-start gap-3">
          <img src={url} alt="" className="w-32 h-32 object-cover rounded-lg bg-slate-100 border border-slate-200" />
          <div className="flex flex-col gap-1.5">
            <label className="cursor-pointer text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700">
              <ImageIcon size={12} />
              Replace
              <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
            </label>
            <button
              onClick={onClear}
              className="text-xs flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <Trash2 size={12} />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 w-full bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg py-6 cursor-pointer text-sm text-slate-600">
          {uploading ? (
            'Uploading…'
          ) : (
            <>
              <ImageIcon size={14} />
              Choose a photo
            </>
          )}
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
        </label>
      )}
    </div>
  );
}

function ContactInput({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
        {icon} {label}
      </label>
      <input
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={placeholder}
      />
    </div>
  );
}
