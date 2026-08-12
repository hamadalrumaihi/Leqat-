import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, type CurrentUser } from '@/lib/auth';
import type { AppRole } from '@/lib/supabase/database.types';

export type ProgramMembership = { id: string; name_ar: string; role: string };

const ACTIVE_COOKIE = 'active_program';

// The programs this user belongs to, each with the user's role IN that
// program. Roles are program-specific: the same user can be a Manager
// in one program and a Group Supervisor in another. Founder/Executive
// span every program (their global role applies everywhere).
// Memoized per request — the layout and the page both need it.
export const getMyPrograms = cache(async function getMyPrograms(): Promise<ProgramMembership[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from('program_staff')
    .select('role, programs(id, name_ar, created_at)')
    .eq('profile_id', user.id);

  const map = new Map<string, ProgramMembership & { created_at?: string }>();
  for (const r of staff ?? []) {
    const p = r.programs as unknown as { id: string; name_ar: string; created_at: string } | null;
    if (p) map.set(p.id, { id: p.id, name_ar: p.name_ar, role: r.role as string, created_at: p.created_at });
  }

  // Founder / Executive see every program (global role applies).
  if (user.role === 'executive' || user.role === 'founder') {
    const { data: all } = await supabase
      .from('programs')
      .select('id, name_ar, created_at')
      .order('created_at', { ascending: true });
    for (const p of all ?? []) {
      if (!map.has(p.id as string)) {
        map.set(p.id as string, {
          id: p.id as string,
          name_ar: p.name_ar as string,
          role: user.role,
          created_at: p.created_at as string,
        });
      }
    }
  }

  return [...map.values()]
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
    .map(({ id, name_ar, role }) => ({ id, name_ar, role }));
});

// The active program (from the cookie, validated against membership),
// or the first program the user belongs to.
export async function getActiveProgram(): Promise<ProgramMembership | null> {
  const programs = await getMyPrograms();
  if (programs.length === 0) return null;
  const store = await cookies();
  const chosen = store.get(ACTIVE_COOKIE)?.value;
  return programs.find((p) => p.id === chosen) ?? programs[0];
}

export const ACTIVE_PROGRAM_COOKIE = ACTIVE_COOKIE;

export type ActiveUser = CurrentUser & {
  /** The profile's global role, before program-specific resolution. */
  globalRole: AppRole;
  /** The active program id, when the user belongs to one. */
  activeProgramId: string | null;
};

/**
 * The current user acting under their role IN THE ACTIVE PROGRAM.
 *
 * Capability gates (can / isStaff / isManagement) must resolve through
 * this, not getCurrentUser, so a user who is a Manager in program A
 * and a Group Supervisor in program B gains and loses capabilities as
 * they switch programs — not just the role label. Founder/Executive
 * keep their global role everywhere; users without any program
 * membership (parents, students, staff not yet assigned) fall back to
 * their global role. RLS remains the data-level authority — these
 * gates are UX/authorization convenience on top of it.
 */
export const getActiveUser = cache(async function getActiveUser(): Promise<ActiveUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const active = await getActiveProgram();
  return {
    ...user,
    role: active ? (active.role as AppRole) : user.role,
    globalRole: user.role,
    activeProgramId: active?.id ?? null,
  };
});
