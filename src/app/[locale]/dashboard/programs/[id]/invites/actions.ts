'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createInvite(input: {
  programId: string;
  parentNameHint?: string;
  parentPhoneHint?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const token = crypto.randomBytes(24).toString('base64url'); // 32 chars

  const { data, error } = await supabase
    .from('registration_invites')
    .insert({
      program_id: input.programId,
      created_by: user.id,
      token,
      parent_name_hint: input.parentNameHint || null,
      parent_phone_hint: input.parentPhoneHint || null,
      notes: input.notes || null,
    })
    .select('token')
    .single();
  if (error) return { error: error.message };

  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/ar/register?invite=${data.token}`;
  revalidatePath('/[locale]/dashboard/programs/[id]', 'page');
  return { token: data.token, url };
}

export async function revokeInvite(token: string, programId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('registration_invites')
    .update({ expires_at: new Date().toISOString() })
    .eq('token', token);
  if (error) return { error: error.message };
  revalidatePath('/[locale]/dashboard/programs/[id]', 'page');
  return { ok: true };
}
