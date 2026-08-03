'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';

// Header bell with a live unread counter. Subscribes to the caller's
// own notification inserts/updates; the count refetches on any change.
export function NotificationBell({ userId, label }: { userId: string; label: string }) {
  const [unread, setUnread] = useState(0);
  const supabase = useRef(createClient());

  useEffect(() => {
    const sb = supabase.current;
    let cancelled = false;
    let channel: ReturnType<typeof sb.channel> | null = null;

    const refresh = async () => {
      const { count } = await sb
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      if (!cancelled) setUnread(count ?? 0);
    };

    (async () => {
      // Authenticate the socket before subscribing (login is a server
      // action, so the browser client only emits INITIAL_SESSION).
      await sb.realtime.setAuth();
      if (cancelled) return;
      await refresh();
      channel = sb
        .channel(`notif:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
          () => refresh(),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) sb.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link href="/dashboard/notifications" className="btn-ghost relative" aria-label={label}>
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
