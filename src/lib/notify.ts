import 'server-only';
import { createAdminClient } from '@/lib/supabase/server';

export type NotifyPayload = {
  kind?: string;
  title_ar: string;
  body_ar?: string | null;
  href?: string | null;
};

/**
 * Create in-app notifications for a set of recipients. SERVER ONLY.
 * Uses the service-role client (there is no user INSERT policy on
 * notifications by design) — call it from trusted server actions that
 * have already authorized the producer. Never throws to the caller;
 * notification delivery is best-effort and must not fail the action.
 */
export async function notify(recipientIds: string[], payload: NotifyPayload): Promise<void> {
  const ids = [...new Set(recipientIds.filter(Boolean))];
  if (ids.length === 0) return;
  try {
    const admin = createAdminClient();
    await admin.from('notifications').insert(
      ids.map((recipient_id) => ({
        recipient_id,
        kind: payload.kind ?? 'general',
        title_ar: payload.title_ar,
        body_ar: payload.body_ar ?? null,
        href: payload.href ?? null,
      })),
    );
  } catch {
    // best-effort — swallow.
  }
}

/**
 * Resolve an announcement audience to the set of recipient profile ids.
 * SERVER ONLY (uses the service-role client to read across profiles /
 * group_staff regardless of the caller's RLS).
 */
export async function announcementRecipients(opts: {
  audience: string;
  targetGroupId: string | null;
  targetProfileId: string | null;
  exclude?: string | null;
}): Promise<string[]> {
  const admin = createAdminClient();
  const MANAGER_ROLES = ['manager', 'program_manager', 'program_supervisor', 'program_planner'];
  let ids: string[] = [];

  const rolesIn = async (roles: string[]) => {
    const { data } = await admin.from('profiles').select('id').in('role', roles);
    return (data ?? []).map((r) => r.id as string);
  };

  switch (opts.audience) {
    case 'all_staff': {
      const { data } = await admin.from('profiles').select('id').not('role', 'in', '(parent,student)');
      ids = (data ?? []).map((r) => r.id as string);
      break;
    }
    case 'executives':
      ids = await rolesIn(['executive', 'founder']);
      break;
    case 'managers':
      ids = await rolesIn(MANAGER_ROLES);
      break;
    case 'group_supervisors':
      ids = await rolesIn(['group_supervisor']);
      break;
    case 'specialist_teachers':
      ids = await rolesIn(['specialist_teacher']);
      break;
    case 'group': {
      if (opts.targetGroupId) {
        const { data } = await admin.from('group_staff').select('profile_id').eq('group_id', opts.targetGroupId);
        ids = (data ?? []).map((r) => r.profile_id as string);
      }
      break;
    }
    case 'teacher':
      ids = opts.targetProfileId ? [opts.targetProfileId] : [];
      break;
  }
  return ids.filter((id) => id !== opts.exclude);
}
