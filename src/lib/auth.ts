import { createClient } from '@/lib/supabase/server';
import type { AppRole } from '@/lib/supabase/database.types';

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppRole;
  fullNameAr: string;
  fullNameEn: string | null;
  locale: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name_ar, full_name_en, locale, email')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: (profile.email as string) ?? user.email ?? null,
    role: profile.role as AppRole,
    fullNameAr: profile.full_name_ar as string,
    fullNameEn: (profile.full_name_en as string) ?? null,
    locale: (profile.locale as string) ?? 'ar',
  };
}

/** Log a PII / sensitive access event (constraint: log on access). */
export async function audit(
  action: string,
  entity: string,
  entityId?: string,
  meta: Record<string, unknown> = {},
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action,
    entity,
    entity_id: entityId,
    meta,
  });
}
