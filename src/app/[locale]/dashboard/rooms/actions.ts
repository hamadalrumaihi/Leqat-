'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/roles';

export async function createRoomAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'manageRooms')) return { error: 'forbidden' };

  const programId = String(formData.get('program_id') ?? '');
  const nameAr = String(formData.get('name_ar') ?? '').trim();
  if (!programId || !nameAr) return { error: 'missing' };

  const capacityRaw = String(formData.get('capacity') ?? '').trim();
  const supabase = await createClient();
  // RLS ("management writes rooms") re-checks program-staff/exec on the
  // server — this gate is UX only.
  const { error } = await supabase.from('rooms').insert({
    program_id: programId,
    name_ar: nameAr,
    name_en: String(formData.get('name_en') ?? '').trim() || null,
    capacity: capacityRaw ? Number(capacityRaw) : null,
    notes_ar: String(formData.get('notes_ar') ?? '').trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/rooms');
  return { ok: true };
}
