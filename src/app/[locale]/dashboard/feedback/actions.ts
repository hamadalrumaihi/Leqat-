'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';

export async function submitFeedbackAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user) return { error: 'unauthenticated' };

  const sessionId = String(formData.get('session_id'));
  const rating = Number(formData.get('rating'));
  if (!sessionId || rating < 1 || rating > 5) return { error: 'bad' };

  const supabase = await createClient();
  const { error } = await supabase.from('session_feedback').upsert(
    {
      session_id: sessionId,
      parent_id: user.id,
      rating,
      comment: String(formData.get('comment') ?? '') || null,
    },
    { onConflict: 'session_id,parent_id' },
  );
  if (error) return { error: error.message };

  revalidatePath('/dashboard/feedback');
  return { ok: true };
}
