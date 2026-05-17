import { createClient } from '@/lib/supabase/server';

/**
 * Consent is an append-only event log, not a stored boolean — so
 * withdrawal is genuinely retroactive: every read re-derives the
 * current state from the latest signed, non-withdrawn record.
 * Default = NO consent (constraint: minors' photos).
 */
export async function effectiveConsent(studentId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('consents')
    .select('photo_consent, withdrawn_at, signed_at')
    .eq('student_id', studentId)
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return false;
  if (data.withdrawn_at) return false;
  return Boolean(data.photo_consent);
}

export type ChildConsent = {
  studentId: string;
  nameAr: string;
  nameEn: string | null;
  consented: boolean;
};

/** The signed-in parent's children + their current effective consent. */
export async function childrenConsentForParent(): Promise<ChildConsent[]> {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from('students')
    .select('id, full_name_ar, full_name_en, consents(photo_consent, withdrawn_at, signed_at)')
    .order('full_name_ar', { ascending: true });

  return (students ?? []).map((s) => {
    const rows = ((s.consents as { photo_consent: boolean; withdrawn_at: string | null; signed_at: string }[]) ?? [])
      .slice()
      .sort((a, b) => (a.signed_at < b.signed_at ? 1 : -1));
    const latest = rows[0];
    return {
      studentId: s.id as string,
      nameAr: s.full_name_ar as string,
      nameEn: (s.full_name_en as string) ?? null,
      consented: Boolean(latest && !latest.withdrawn_at && latest.photo_consent),
    };
  });
}
