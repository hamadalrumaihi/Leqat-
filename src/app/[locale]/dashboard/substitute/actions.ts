'use server';

import { getCurrentUser, audit } from '@/lib/auth';
import { signSubstituteToken } from '@/lib/token';

const STAFF = ['executive', 'program_supervisor', 'program_manager', 'group_supervisor'];

export async function createSubstituteLinkAction(
  _: unknown,
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user || !STAFF.includes(user.role)) return { error: 'forbidden' };

  const sessionId = String(formData.get('session_id'));
  try {
    const token = signSubstituteToken(sessionId, 240); // 4-hour window
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    await audit('substitute.link_create', 'sessions', sessionId);
    return { url: `${base}/substitute/${token}` };
  } catch {
    return { error: 'not_configured' };
  }
}
