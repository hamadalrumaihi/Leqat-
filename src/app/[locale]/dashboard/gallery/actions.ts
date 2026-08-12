'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { audit } from '@/lib/auth';
import { getActiveUser } from '@/lib/program-context';

export async function createAlbumAction(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const groupId = String(formData.get('group_id'));
  const titleAr = String(formData.get('title_ar') ?? '').trim();
  if (!titleAr || !groupId) return { error: 'missing' };

  const { data, error } = await supabase
    .from('gallery_albums')
    .insert({ group_id: groupId, title_ar: titleAr, title_en: String(formData.get('title_en') ?? '') || null })
    .select('id')
    .single();
  if (error) return { error: error.message };

  revalidatePath('/dashboard/gallery');
  return { ok: true, albumId: (data as { id: string }).id };
}

/** Records a media row after the client uploaded the (compressed) file. */
export async function addMediaAction(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const albumId = String(formData.get('album_id'));
  const groupId = String(formData.get('group_id'));
  const path = String(formData.get('path'));
  const blurred = formData.get('blurred') === 'true';
  if (!path || !albumId) return { error: 'missing' };

  const { error } = await supabase.from('gallery_media').insert({
    album_id: albumId,
    group_id: groupId,
    path,
    kind: 'image',
    caption_ar: String(formData.get('caption_ar') ?? '') || null,
    blurred,
  });
  if (error) return { error: error.message };

  revalidatePath('/dashboard/gallery');
  return { ok: true };
}

/** Year-end highlights: one album per group with its recent media. */
export async function generateHighlightsAction(_: unknown, formData: FormData) {
  const groupId = String(formData.get('group_id'));
  const user = await getActiveUser();
  if (!user || (user.role !== 'executive' && user.role !== 'group_supervisor' && user.role !== 'program_supervisor')) {
    return { error: 'forbidden' };
  }

  const supabase = await createClient();
  const { data: album, error } = await supabase
    .from('gallery_albums')
    .insert({ group_id: groupId, title_ar: 'أبرز اللحظات — نهاية العام', title_en: 'Year-end highlights', is_highlight: true })
    .select('id')
    .single();
  if (error) return { error: error.message };

  const { data: media } = await supabase
    .from('gallery_media')
    .select('path, kind, caption_ar')
    .eq('group_id', groupId)
    .eq('blurred', false)
    .order('created_at', { ascending: false })
    .limit(24);

  if (media && media.length > 0) {
    await supabase.from('gallery_media').insert(
      media.map((m) => ({
        album_id: (album as { id: string }).id,
        group_id: groupId,
        path: m.path,
        kind: m.kind,
        caption_ar: m.caption_ar,
      })),
    );
  }

  await audit('gallery.highlights', 'groups', groupId);
  revalidatePath('/dashboard/gallery');
  return { ok: true };
}
