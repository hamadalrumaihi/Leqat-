'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, audit } from '@/lib/auth';

const STAFF = ['executive', 'program_supervisor', 'program_manager', 'group_supervisor', 'assistant_supervisor'];

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
