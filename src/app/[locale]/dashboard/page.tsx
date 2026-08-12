import { getTranslations, getLocale } from 'next-intl/server';
import { getActiveUser } from '@/lib/program-context';
import { createClient } from '@/lib/supabase/server';
import { effectiveRole, ROLE_LABELS } from '@/lib/utils';
import { MissingPhoneAlerts } from '@/components/missing-phone-alerts';
import { NextEventWidget } from '@/components/next-event-widget';
import { AttentionCard } from '@/components/attention-card';

// Group supervisor's roster students whose parent phone is missing.
async function missingPhones() {
  const supabase = await createClient();
  const user = await getActiveUser();
  if (!user) return { items: [], total: 0 };
  const role = effectiveRole(user.role);
  if (role !== 'group_supervisor' && role !== 'assistant_supervisor') {
    return { items: [], total: 0 };
  }

  const { data: staff } = await supabase
    .from('group_staff')
    .select('group_id')
    .eq('profile_id', user.id);
  const groupIds = (staff ?? []).map((s) => s.group_id as string);
  if (groupIds.length === 0) return { items: [], total: 0 };

  const { data: rows } = await supabase
    .from('enrollments')
    .select('student_id, students!inner(id, full_name_ar, parent:profiles!students_parent_id_fkey(id, phone))')
    .in('group_id', groupIds);

  const missing = (rows ?? [])
    .map((r) => r.students as unknown as {
      id: string;
      full_name_ar: string;
      parent: { id: string; phone: string | null } | null;
    })
    .filter((s) => s && !s.parent?.phone)
    .map((s) => ({ studentId: s.id, name: s.full_name_ar, parentId: s.parent?.id ?? null }));

  return { items: missing.slice(0, 5), total: missing.length };
}

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
  const locale = await getLocale();
  const user = await getActiveUser();
  const c = await counts();
  const alerts = await missingPhones();

  const cards = [
    { label: t('statSessions'), value: c.sessions, key: 'sessions' },
    { label: t('groups'), value: c.groups, key: 'groups' },
    { label: t('statStudents'), value: c.students, key: 'students' },
    { label: t('programs'), value: c.programs, key: 'programs' },
  ];

  const roleLabel = user
    ? ROLE_LABELS[user.role]?.[locale === 'ar' ? 'ar' : 'en'] ?? user.role
    : '';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('overview')}</h1>
      <NextEventWidget />
      <AttentionCard />
      <MissingPhoneAlerts items={alerts.items} total={alerts.total} />
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
          {t('currentRole')}: <span className="font-medium text-foreground">{roleLabel}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{t('roleHint')}</p>
      </div>
    </div>
  );
}
