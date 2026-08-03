import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/roles';
import { RoomForm } from '@/components/room-form';

export default async function RoomsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user || !can(user.role, 'manageRooms')) redirect({ href: '/dashboard', locale });

  const t = await getTranslations('rooms');
  const supabase = await createClient();

  const [{ data: rooms }, { data: programs }] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, name_ar, capacity, notes_ar, program_id, programs(name_ar)')
      .order('created_at', { ascending: true }),
    supabase.from('programs').select('id, name_ar').order('created_at', { ascending: true }),
  ]);

  const progList = (programs ?? []).map((p) => ({ id: p.id as string, name_ar: p.name_ar as string }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <RoomForm programs={progList} />

      {(rooms ?? []).length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground">{t('empty')}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(rooms ?? []).map((r) => (
            <div key={r.id as string} className="card p-5">
              <p className="font-semibold">{r.name_ar as string}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(r.programs as unknown as { name_ar: string } | null)?.name_ar}
                {r.capacity ? ` · ${t('capacity')}: ${r.capacity as number}` : ''}
              </p>
              {r.notes_ar ? (
                <p className="mt-2 text-sm text-muted-foreground">{r.notes_ar as string}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
