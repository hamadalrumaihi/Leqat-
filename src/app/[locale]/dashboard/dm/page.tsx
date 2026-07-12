import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { ChatRoom } from '@/components/chat-room';
import { StartDm } from '@/components/start-dm';
import { can } from '@/lib/roles';

export default async function DmPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const isStaff = can(user?.role, 'useDm');

  // DM channels the user is a member of.
  const { data: memberships } = await supabase
    .from('chat_members')
    .select('chat_channels!inner(id, title_ar, type, group_id)')
    .eq('profile_id', user!.id);
  const channels = (memberships ?? [])
    .map((m) => m.chat_channels as unknown as { id: string; title_ar: string; type: string; group_id: string | null })
    .filter((ch) => ch && ch.type === 'dm');

  const students = isStaff
    ? ((await supabase.from('students').select('id, full_name_ar').limit(200)).data ?? []).map(
        (s) => ({ id: s.id as string, name: s.full_name_ar as string }),
      )
    : [];

  let room = null as null | {
    channelId: string;
    groupId: string;
    initial: Parameters<typeof ChatRoom>[0]['initial'];
  };
  if (c) {
    // Names via the names-only directory RPC, not an embedded profiles
    // join (which would expose the peer's email/phone). See 0015.
    const [{ data: msgs }, { data: dir }] = await Promise.all([
      supabase
        .from('chat_messages')
        .select('id, body, sender_id, is_announcement, moderation, media_path, media_kind, created_at')
        .eq('channel_id', c)
        .order('created_at', { ascending: true })
        .limit(100),
      supabase.rpc('channel_peer_directory'),
    ]);
    const names = new Map(
      ((dir as { id: string; full_name_ar: string }[] | null) ?? []).map((d) => [d.id, d.full_name_ar]),
    );
    const ch = channels.find((x) => x.id === c);
    if (ch) {
      room = {
        channelId: c,
        groupId: ch.group_id ?? '',
        initial: (msgs ?? []).map((m) => ({
          id: m.id as string,
          body: (m.body as string) ?? '',
          senderId: m.sender_id as string,
          pinned: m.is_announcement as boolean,
          moderation: m.moderation as string,
          mediaPath: (m.media_path as string) ?? null,
          mediaKind: (m.media_kind as string) ?? null,
          createdAt: m.created_at as string,
          senderName: names.get(m.sender_id as string) ?? '—',
        })),
      };
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المحادثات الخاصة — Direct messages</h1>

      {isStaff && <StartDm students={students} />}

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="card space-y-1 p-3">
          {channels.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground">لا توجد محادثات.</p>
          )}
          {channels.map((ch) => (
            <Link
              key={ch.id}
              href={`/dashboard/dm?c=${ch.id}`}
              className={`block rounded-md px-3 py-2 text-sm ${
                c === ch.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {ch.title_ar ?? 'محادثة'}
            </Link>
          ))}
        </nav>

        <div>
          {room ? (
            <ChatRoom
              channelId={room.channelId}
              groupId={room.groupId}
              meId={user!.id}
              initial={room.initial}
              canModerate={isStaff}
            />
          ) : (
            <div className="card p-8 text-center text-muted-foreground">
              اختر محادثة من القائمة.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
