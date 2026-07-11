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

/** Find a parent's auth id by email without paging the whole user list. */
async function findParentIdByEmail(
  sb: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  // profiles is 1:1 with auth.users (signup trigger + invite upsert)
  // and has an email column — an indexed O(1) lookup, unlike
  // auth.admin.listUsers() which only returns the first page.
  const { data } = await sb
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Consumes the invite, creates parent + child + enrollment + consent,
 * and best-effort emails a magic link. Throws a coded error on failure.
 *
 * Concurrency: the invite is CLAIMED first via a conditional update
 * (consumed_at IS NULL), which is atomic in Postgres — a double
 * submit or replay gets zero rows and stops. If any later step fails,
 * the claim is released so the parent can retry.
 */
export async function redeemInvite(input: RedeemInput) {
  const sb = createAdminClient();

  // 1. Atomically claim the invite.
  const { data: claimed } = await sb
    .from('registration_invites')
    .update({ consumed_at: new Date().toISOString() })
    .eq('token', input.token)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('id, program_id')
    .maybeSingle();
  if (!claimed) throw new Error('invite_invalid_or_expired');
  const invite = claimed as { id: string; program_id: string | null };

  const releaseClaim = async () => {
    await sb
      .from('registration_invites')
      .update({ consumed_at: null, consumed_by_profile_id: null })
      .eq('id', invite.id);
  };

  try {
    // 2. Find or create the parent auth user.
    const email = input.parentEmail.toLowerCase().trim();
    let parentId = await findParentIdByEmail(sb, email);

    if (!parentId) {
      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name_ar: input.parentName, role: 'parent' },
      });
      if (createErr) {
        // Possible race: user created between lookup and createUser.
        parentId = await findParentIdByEmail(sb, email);
        if (!parentId) throw new Error('email_in_use_or_invalid');
      } else {
        parentId = created.user.id;
      }
    }
    return await completeRedemption(sb, invite, input, email, parentId);
  } catch (e) {
    await releaseClaim();
    throw e;
  }
}

async function completeRedemption(
  sb: ReturnType<typeof createAdminClient>,
  invite: { id: string; program_id: string | null },
  input: RedeemInput,
  email: string,
  parentId: string,
) {

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
    // Capacity is a soft gate: a full program waitlists instead of
    // blocking — staff resolves from the ledger, never the parent.
    let status: 'pending' | 'waitlisted' = 'pending';
    const { data: prog } = await sb
      .from('programs')
      .select('capacity')
      .eq('id', invite.program_id)
      .maybeSingle();
    if (prog) {
      const { count } = await sb
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('program_id', invite.program_id)
        .in('status', ['pending', 'active']);
      if ((count ?? 0) >= Number((prog as { capacity: number }).capacity)) {
        status = 'waitlisted';
      }
    }
    await sb.from('enrollments').insert({
      student_id: student.id,
      program_id: invite.program_id,
      status,
    });
  }

  // 4. Initial consent record.
  await sb.from('consents').insert({
    student_id: student.id,
    parent_id: parentId,
    photo_consent: input.photoConsent,
  });

  // 5. Attach the redeeming parent to the already-claimed invite.
  await sb
    .from('registration_invites')
    .update({ consumed_by_profile_id: parentId })
    .eq('id', invite.id);

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
