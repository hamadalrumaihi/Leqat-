import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

async function counts() {
  const supabase = await createClient();
  const [programs, groups, students, sessions] = await Promise.all([
    supabase.from('programs').select('id', { count: 'exact', head: true }),
    supabase.from('groups').select('id', { count: 'exact', head: true }),
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('sessions').select('id', { count: 'exact', head: true }),
  ]);
  return {
    programs: programs.count ?? 0,
    groups: groups.count ?? 0,
    students: students.count ?? 0,
    sessions: sessions.count ?? 0,
  };
}

export default async function Overview() {
  const t = await getTranslations('dashboard');
  const user = await getCurrentUser();
  const c = await counts();

  const cards = [
    { label: t('attendance'), value: c.sessions, key: 'sessions' },
    { label: t('staff'), value: c.groups, key: 'groups' },
    { label: 'الطلاب / Students', value: c.students, key: 'students' },
    { label: t('schedule'), value: c.programs, key: 'programs' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('overview')}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.key} className="card p-6">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-primary">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="card p-6">
        <p className="text-sm text-muted-foreground">
          الدور الحالي / Current role:{' '}
          <span className="font-medium text-foreground">{user?.role}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          استخدم القائمة الجانبية للوصول إلى الميزات المتاحة لدورك. كل الصلاحيات
          مُطبَّقة على الخادم عبر سياسات RLS.
        </p>
      </div>
    </div>
  );
}
