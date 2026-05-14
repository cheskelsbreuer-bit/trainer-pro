// Drag-and-drop / click-to-upload photo widget for check-ins.
// Uploads to the Supabase Storage bucket `nutrition-photos` under the
// path <trainer_id>/<client_id>/<timestamp>-<filename>. Returns a
// public URL for the check-in row's photo_url field.

import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { N, SERIF_FONT } from '../theme';

interface PhotoUploadProps {
  trainerId: string;
  clientId: string;
  currentUrl?: string | null;
  /** Called with the public URL after a successful upload. */
  onUploaded: (url: string) => void;
  /** Called when the user clears the photo. */
  onCleared?: () => void;
}

export function PhotoUpload({
  trainerId,
  clientId,
  currentUrl,
  onUploaded,
  onCleared,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please pick an image file (jpg, png, webp).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8 MB.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const name = `${trainerId}/${clientId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('nutrition-photos')
        .upload(name, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from('nutrition-photos').getPublicUrl(name);
      onUploaded(data.publicUrl);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (currentUrl) {
    return (
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ background: N.inset, border: `1px solid ${N.rule}` }}
      >
        <img
          src={currentUrl}
          alt="Progress photo"
          className="w-full h-48 object-cover"
        />
        {onCleared && (
          <button
            onClick={onCleared}
            className="absolute top-2 right-2 w-8 h-8 rounded-full inline-flex items-center justify-center hover:opacity-95"
            style={{
              background: 'rgba(0,0,0,0.65)',
              color: '#FFF',
            }}
            title="Remove photo"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) upload(file);
      }}
      onClick={() => inputRef.current?.click()}
      className="rounded-xl p-6 text-center cursor-pointer transition-colors"
      style={{
        background: dragOver ? N.coralSoft : N.inset,
        border: `2px dashed ${dragOver ? N.coral : N.rule}`,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />
      <div
        className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2"
        style={{ background: N.coralSoft, color: N.coral }}
      >
        {uploading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Upload size={18} />
        )}
      </div>
      <p
        className="text-sm font-medium mb-1"
        style={{ color: N.ink }}
      >
        {uploading ? 'Uploading…' : 'Add a progress photo'}
      </p>
      <p className="text-xs" style={{ color: N.mute }}>
        Drop an image here, or click to pick. JPG / PNG / WEBP up to 8 MB.
      </p>
      {error && (
        <p
          className="text-xs mt-3 inline-flex items-center gap-1"
          style={{ color: N.danger }}
        >
          <ImageIcon size={11} /> {error}
        </p>
      )}
      <span
        className="hidden"
        style={{ fontFamily: SERIF_FONT }}
        aria-hidden
      />
    </div>
  );
}
