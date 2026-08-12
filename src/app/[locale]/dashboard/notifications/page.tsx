import { getTranslations, getLocale } from 'next-intl/server';
import { redirect, Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { dualDate } from '@/lib/utils';
import { MarkReadButton, MarkAllReadButton } from '@/components/notification-actions';

export default async function NotificationsPage() {
  const user = await getActiveUser();
  const locale = await getLocale();
  if (!user) redirect({ href: '/login', locale });

  const t = await getTranslations('notif');
  const supabase = await createClient();

  const { data } = await supabase
    .from('notifications')
    .select('id, title_ar, body_ar, href, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  const rows = (data ?? []) as unknown as {
    id: string; title_ar: string; body_ar: string | null; href: string | null;
    read_at: string | null; created_at: string;
  }[];
  const hasUnread = rows.some((r) => !r.read_at);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {hasUnread && <MarkAllReadButton />}
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground">{t('empty')}</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li
              key={n.id}
              className={`card flex flex-wrap items-start gap-3 p-4 ${n.read_at ? '' : 'border-primary/40 bg-secondary/30'}`}
            >
              {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {n.href ? (
                    <Link href={n.href} className="hover:underline">{n.title_ar}</Link>
                  ) : (
                    n.title_ar
                  )}
                </p>
                {n.body_ar ? <p className="mt-0.5 text-sm text-muted-foreground">{n.body_ar}</p> : null}
                <p dir="ltr" className="mt-1 text-xs text-muted-foreground">
                  {dualDate(n.created_at.slice(0, 10), locale as 'ar' | 'en')}
                </p>
              </div>
              {!n.read_at && <MarkReadButton id={n.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
