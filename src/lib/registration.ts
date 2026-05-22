import 'server-only';
import { createAdminClient } from '@/lib/supabase/server';
import type { AgeGroup } from '@/lib/age';

/** Returns the invite row (with its program) if valid and unconsumed. */
export async function lookupInvite(token: string) {
  if (!token) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('registration_invites')
    .select('*, programs(id, name_ar, name_en, age_grp, price_qar)')
    .eq('token', token)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();
  if (error) return null;
  return data;
}

export type RedeemInput = {
  token: string;
  parentEmail: string;
  parentName: string;
  parentPhone: string;
  childName: string;
  childDob: string; // YYYY-MM-DD
  childAgeGroup: AgeGroup;
  medicalNotes?: string;
  photoConsent: boolean;
  emergencyContacts?: { name: string; phone: string; relation: string }[];
};

/**
 * Consumes the invite, creates parent + child + enrollment + consent,
 * and best-effort emails a magic link. Throws a coded error on failure.
 */
export async function redeemInvite(input: RedeemInput) {
  const sb = createAdminClient();

  const invite = await lookupInvite(input.token);
  if (!invite) throw new Error('invite_invalid_or_expired');

  // 1. Find or create the parent auth user.
  const email = input.parentEmail.toLowerCase().trim();
  const { data: existing } = await sb.auth.admin.listUsers();
  let parentId = existing.users.find((u: { email?: string; id: string }) => u.email === email)?.id;

  if (!parentId) {
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name_ar: input.parentName, role: 'parent' },
    });
    if (createErr) throw new Error('email_in_use_or_invalid');
    parentId = created.user.id;
  }

  // 2. Upsert profile (the signup trigger may have created it already).
  await sb.from('profiles').upsert({
    id: parentId,
    role: 'parent',
    full_name_ar: input.parentName,
    email,
    phone: input.parentPhone,
  });

  // 3. Child + enrollment (group_id stays null; supervisor assigns later).
  const { data: student, error: studentErr } = await sb
    .from('students')
    .insert({
      parent_id: parentId,
      full_name_ar: input.childName,
      dob: input.childDob,
      age_grp: input.childAgeGroup,
      medical_notes: input.medicalNotes ?? null,
      photo_consent: input.photoConsent,
      emergency_contacts: input.emergencyContacts ?? [],
    })
    .select('id')
    .single();
  if (studentErr) throw new Error('student_create_failed');

  if (invite.program_id) {
    await sb.from('enrollments').insert({
      student_id: student.id,
      program_id: invite.program_id,
      status: 'pending', // staff confirms once the WhatsApp payment lands
    });
  }

  // 4. Initial consent record.
  await sb.from('consents').insert({
    student_id: student.id,
    parent_id: parentId,
    photo_consent: input.photoConsent,
  });

  // 5. Mark the invite consumed (single-use).
  await sb
    .from('registration_invites')
    .update({ consumed_at: new Date().toISOString(), consumed_by_profile_id: parentId })
    .eq('token', input.token);

  // 6. Best-effort magic link so the parent can return any time.
  try {
    await sb.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/ar/dashboard` },
    });
  } catch {
    // Email delivery not configured — parent can use the login page's
    // magic-link tab instead.
  }

  return { parentId, studentId: student.id };
}
