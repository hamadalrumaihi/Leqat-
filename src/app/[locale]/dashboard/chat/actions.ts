'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, audit } from '@/lib/auth';

const STAFF = ['executive', 'program_planner', 'program_supervisor', 'program_manager', 'group_supervisor', 'assistant_supervisor'];

/** Staff toggle: allow parents to post in a channel (§11). */
export async function setParentsCanPostAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !STAFF.includes(user.role)) return { error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('chat_channels')
    .update({ parents_can_post: formData.get('allow') === 'true' })
    .eq('id', String(formData.get('channel_id')));
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Mirror a staff chat photo into the group gallery (§12). Files land
 * in the session's album, or a default "متفرقات / Misc" album.
 */
export async function mirrorToGalleryAction(groupId: string, path: string) {
  const user = await getCurrentUser();
  if (!user || !STAFF.includes(user.role) || !groupId) return;
  const supabase = await createClient();

  let albumId: string | null = null;
  const { data: misc } = await supabase
    .from('gallery_albums')
    .select('id')
    .eq('group_id', groupId)
    .eq('title_ar', 'متفرقات')
    .maybeSingle();
  if (misc) {
    albumId = (misc as { id: string }).id;
  } else {
    const { data: created } = await supabase
      .from('gallery_albums')
      .insert({ group_id: groupId, title_ar: 'متفرقات', title_en: 'Misc' })
      .select('id')
      .single();
    albumId = (created as { id: string } | null)?.id ?? null;
  }
  if (!albumId) return;

  await supabase.from('gallery_media').insert({
    album_id: albumId,
    group_id: groupId,
    path,
    kind: 'image',
  });
}

/**
 * Record a message after the client uploaded any media to storage.
 * Media from non-staff is held as `pending` until a supervisor
 * approves it — nothing reaches the group feed unmoderated.
 */
export async function sendMessageAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };

  const channelId = String(formData.get('channel_id'));
  const body = String(formData.get('body') ?? '').trim();
  const mediaPath = String(formData.get('media_path') ?? '') || null;
  const mediaKind = String(formData.get('media_kind') ?? '') || null;
  if (!body && !mediaPath) return { error: 'empty' };

  const isStaff = STAFF.includes(user.role);
  const moderation = mediaPath && !isStaff ? 'pending' : 'approved';

  const supabase = await createClient();
  const { error } = await supabase.from('chat_messages').insert({
    channel_id: channelId,
    sender_id: user.id,
    body: body || null,
    media_path: mediaPath,
    media_kind: mediaKind,
    is_announcement: isStaff && formData.get('announce') === 'true',
    moderation,
  });
  if (error) return { error: error.message };
  return { ok: true, moderation };
}

export async function moderateMessageAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !STAFF.includes(user.role)) return { error: 'forbidden' };

  const messageId = String(formData.get('message_id'));
  const decision = String(formData.get('decision')); // approved | rejected
  if (decision !== 'approved' && decision !== 'rejected') return { error: 'bad' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('chat_messages')
    .update({ moderation: decision })
    .eq('id', messageId);
  if (error) return { error: error.message };

  await audit(`chat.${decision}`, 'chat_messages', messageId);
  return { ok: true };
}

export async function reactAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };
  const supabase = await createClient();
  const { error } = await supabase.from('message_reactions').upsert(
    {
      message_id: String(formData.get('message_id')),
      profile_id: user.id,
      emoji: String(formData.get('emoji')),
    },
    { onConflict: 'message_id,profile_id,emoji' },
  );
  if (error) return { error: error.message };
  return { ok: true };
}
