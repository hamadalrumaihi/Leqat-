import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { Link } from '@/i18n/routing';
import { ChatRoom } from '@/components/chat-room';
import { GroupSwatch } from '@/components/group-swatch';
import { AllowParentsToggle } from '@/components/allow-parents-toggle';
import { can } from '@/lib/roles';

const ORDER: Record<string, number> = { program: 0, group: 1, dm: 2 };

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const t = await getTranslations('chat');
  const supabase = await createClient();
  const user = await getActiveUser();
  const isStaff = can(user?.role, 'moderateChat');

  const { data: memberships } = await supabase
    .from('chat_members')
    .select('chat_channels(id, type, group_id, title_ar, parents_can_post, groups(name_ar, color))')
    .eq('profile_id', user!.id);

  const channels = (memberships ?? [])
    .map((m) => m.chat_channels as unknown as {
      id: string; type: string; group_id: string | null; title_ar: string | null;
      parents_can_post: boolean; groups: { name_ar: string; color: string | null } | null;
    })
    .filter(Boolean)
    .sort((a, b) => (ORDER[a.type] ?? 9) - (ORDER[b.type] ?? 9));

  const selectedId = c ?? channels.find((ch) => ch.type !== 'dm')?.id ?? channels[0]?.id;
  const selected = channels.find((ch) => ch.id === selectedId);

  let initial: Parameters<typeof ChatRoom>[0]['initial'] = [];
  if (selected) {
    // Sender names come from a names-only directory (id + names of
    // channel peers), never an embedded profiles join — that would
    // expose co-members' email/phone. See migration 0015.
    const [{ data: messages }, { data: dir }] = await Promise.all([
      supabase
        .from('chat_messages')
        .select('id, body, sender_id, is_announcement, moderation, media_path, media_kind, created_at')
        .eq('channel_id', selected.id)
        .order('created_at', { ascending: true })
        .limit(100),
      supabase.rpc('channel_peer_directory'),
    ]);
    const names = new Map(
      ((dir as { id: string; full_name_ar: string }[] | null) ?? []).map((d) => [d.id, d.full_name_ar]),
    );
    initial = (messages ?? []).map((m) => ({
      id: m.id as string,
      body: (m.body as string) ?? '',
      senderId: m.sender_id as string,
      pinned: m.is_announcement as boolean,
      moderation: m.moderation as string,
      mediaPath: (m.media_path as string) ?? null,
      mediaKind: (m.media_kind as string) ?? null,
      createdAt: m.created_at as string,
      senderName: names.get(m.sender_id as string) ?? '—',
    }));
  }

  const role = user!.role;
  const canPost =
    !selected
      ? false
      : selected.type === 'dm'
        ? true
        : role === 'parent' || role === 'student'
          ? Boolean(selected.parents_can_post) && role === 'parent'
          : true;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <nav className="card space-y-1 p-3">
          {channels.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground">لا توجد قنوات.</p>
          )}
          {channels.map((ch) => (
            <Link
              key={ch.id}
              href={`/dashboard/chat?c=${ch.id}`}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                ch.id === selectedId ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {ch.type === 'program' ? (
                <span aria-hidden>📣</span>
              ) : ch.type === 'group' ? (
                <GroupSwatch color={ch.groups?.color} />
              ) : (
                <span aria-hidden>✉️</span>
              )}
              <span className="truncate">{ch.title_ar ?? (ch.groups?.name_ar || 'محادثة')}</span>
            </Link>
          ))}
        </nav>

        <div className="space-y-2">
          {selected && isStaff && selected.type !== 'dm' && (
            <AllowParentsToggle channelId={selected.id} allowed={Boolean(selected.parents_can_post)} />
          )}
          {selected ? (
            <ChatRoom
              channelId={selected.id}
              groupId={selected.group_id ?? ''}
              meId={user!.id}
              initial={initial}
              canModerate={isStaff}
              canPost={canPost}
            />
          ) : (
            <div className="card p-8 text-center text-muted-foreground">اختر قناة.</div>
          )}
        </div>
      </div>
    </div>
  );
}
