import { getTranslations } from 'next-intl/server';
import { AlertCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { effectiveRole } from '@/lib/utils';

type Item = { key: string; label: string; count: number; href: string };

// "Needs attention" strip on the dashboard home. Every count runs
// under the caller's RLS: group staff see unassigned enrollments in
// their programs (0010), planners/executives additionally see pending
// enrollments and invites that expire within 3 days. Renders nothing
// when there is nothing to act on.
export async function AttentionCard() {
  const user = await getCurrentUser();
  if (!user) return null;
  const role = effectiveRole(user.role);
  const staffRoles = ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor'];
  if (!staffRoles.includes(role)) return null;

  const t = await getTranslations('dashboard');
  const supabase = await createClient();
  const items: Item[] = [];

  const { count: unassigned } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .is('group_id', null)
    .in('status', ['pending', 'active']);
  if (unassigned) {
    items.push({ key: 'unassigned', label: t('attnUnassigned'), count: unassigned, href: '/dashboard/groups' });
  }

  if (role === 'executive' || role === 'program_planner') {
    const { count: pending } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (pending) {
      items.push({ key: 'pending', label: t('attnPending'), count: pending, href: '/dashboard/payments' });
    }

    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { count: expiring } = await supabase
      .from('registration_invites')
      .select('id', { count: 'exact', head: true })
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .lt('expires_at', soon);
    if (expiring) {
      items.push({ key: 'invites', label: t('attnInvites'), count: expiring, href: '/dashboard/programs' });
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="card p-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
        {t('attnTitle')}
      </p>
      <ul className="flex flex-wrap gap-2">
        {items.map((it) => (
          <li key={it.key}>
            <Link
              href={it.href}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-secondary/60 px-4 text-sm hover:bg-secondary"
            >
              <span className="font-bold text-primary">{it.count}</span>
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
