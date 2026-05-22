'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

const STAFF = ['executive', 'program_planner', 'program_supervisor', 'program_manager', 'group_supervisor', 'assistant_supervisor'];

export async function updateWorkbookProgressAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !STAFF.includes(user.role)) return { error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase.from('group_workbook_progress').upsert(
    {
      group_id: String(formData.get('group_id')),
      book_id: String(formData.get('book_id')),
      current_page: Number(formData.get('current_page') ?? 0),
      last_section: String(formData.get('last_section') ?? '') || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'group_id,book_id' },
  );
  if (error) return { error: error.message };
  revalidatePath('/dashboard/books');
  return { ok: true };
}
