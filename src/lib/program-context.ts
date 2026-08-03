import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export type ProgramMembership = { id: string; name_ar: string; role: string };

const ACTIVE_COOKIE = 'active_program';

// The programs this user belongs to, each with the user's role IN that
// program. Roles are program-specific: the same user can be a Manager
// in one program and a Group Supervisor in another. Founder/Executive
// span every program (their global role applies everywhere).
export async function getMyPrograms(): Promise<ProgramMembership[]> {
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
}

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
