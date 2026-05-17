import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { dualDate } from '@/lib/utils';
import { FeedbackForm } from '@/components/feedback-form';

export default async function FeedbackPage() {
  const locale = (await getLocale()) as 'ar' | 'en';
  const supabase = await createClient();

  // Most recent session for the parent's child group.
  const { data: session } = await supabase
    .from('sessions')
    .select('id, date, groups(name_ar)')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return <div className="card p-8 text-center text-muted-foreground">—</div>;
  }

  const group = session.groups as unknown as { name_ar: string } | null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تقييم الجلسة</h1>
      <p className="text-sm text-muted-foreground">
        {group?.name_ar} · {dualDate(session.date as string, locale)}
      </p>
      <FeedbackForm sessionId={session.id as string} />
    </div>
  );
}
