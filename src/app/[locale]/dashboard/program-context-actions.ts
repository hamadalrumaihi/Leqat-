'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getMyPrograms, ACTIVE_PROGRAM_COOKIE } from '@/lib/program-context';

// Switch the active program. Validated against the user's memberships,
// so a user can only activate a program they belong to.
export async function setActiveProgramAction(programId: string) {
  const programs = await getMyPrograms();
  if (!programs.some((p) => p.id === programId)) return { error: 'forbidden' };
  const store = await cookies();
  store.set(ACTIVE_PROGRAM_COOKIE, programId, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 180,
  });
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}
