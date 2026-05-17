import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { ChatRoom } from '@/components/chat-room';

export default async function ChatPage() {
  const t = await getTranslations('chat');
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: channel } = await supabase
    .from('chat_channels')
    .select('id, title_ar, title_en, group_id, type')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!channel) {
    return <div className="card p-8 text-center text-muted-foreground">{t('title')}</div>;
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, body, sender_id, is_announcement, moderation, media_path, media_kind, created_at, profiles(full_name_ar)')
    .eq('channel_id', channel.id)
    .order('created_at', { ascending: true })
    .limit(100);

  const initial = (messages ?? []).map((m) => ({
    id: m.id as string,
    body: (m.body as string) ?? '',
    senderId: m.sender_id as string,
    pinned: m.is_announcement as boolean,
    moderation: m.moderation as string,
    mediaPath: (m.media_path as string) ?? null,
    mediaKind: (m.media_kind as string) ?? null,
    createdAt: m.created_at as string,
    senderName:
      (m.profiles as unknown as { full_name_ar: string } | null)?.full_name_ar ?? '—',
  }));

  const canModerate =
    user!.role !== 'parent' && user!.role !== 'student';

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{channel.title_ar ?? t('groupChat')}</h1>
      <ChatRoom
        channelId={channel.id}
        groupId={(channel.group_id as string) ?? ''}
        meId={user!.id}
        initial={initial}
        canModerate={canModerate}
      />
    </div>
  );
}
