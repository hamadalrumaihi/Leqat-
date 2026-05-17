'use client';

import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { addMediaAction } from '@/app/[locale]/dashboard/gallery/actions';

export function GalleryUploader({
  albumId,
  groupId,
}: {
  albumId: string;
  groupId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [blurred, setBlurred] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setDone(0);
    const supabase = createClient();

    for (const file of files) {
      try {
        // On-device compression before upload (Qatar mobile networks).
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1600,
          fileType: 'image/webp',
          useWebWorker: true,
        });
        const path = `${groupId}/${albumId}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage
          .from('gallery')
          .upload(path, compressed, { contentType: 'image/webp', upsert: false });
        if (error) throw error;

        const fd = new FormData();
        fd.set('album_id', albumId);
        fd.set('group_id', groupId);
        fd.set('path', path);
        fd.set('blurred', String(blurred));
        await addMediaAction(null, fd);
        setDone((d) => d + 1);
      } catch {
        // Skip the failed file; continue with the rest.
      }
    }
    setBusy(false);
  }

  return (
    <div className="rounded-lg border bg-background p-4">
      <label className="mb-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={blurred}
          onChange={(e) => setBlurred(e.target.checked)}
        />
        تمويه/استبعاد (لطفل بلا موافقة على نشر الصور)
      </label>
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={busy}
        onChange={onPick}
        className="block w-full text-sm"
      />
      {busy && <p className="mt-2 text-xs text-muted-foreground">جارٍ الضغط والرفع… ({done})</p>}
      {!busy && done > 0 && (
        <p className="mt-2 text-xs text-green-vibrant">تم رفع {done} عنصرًا — بانتظار مراجعة المشرف.</p>
      )}
    </div>
  );
}
