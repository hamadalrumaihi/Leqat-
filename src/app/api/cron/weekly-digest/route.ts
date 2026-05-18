import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { buildParentDigest } from '@/lib/digest';
import { sendEmail, emailProvider } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Scheduled weekly (e.g. Vercel Cron, Thursdays). Protect with
// CRON_SECRET so it can't be triggered by the public.
//
//   vercel.json → { "crons": [{ "path": "/api/cron/weekly-digest",
//                                "schedule": "0 16 * * 4" }] }
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: parents } = await admin
    .from('profiles')
    .select('id, email, full_name_ar')
    .eq('role', 'parent')
    .not('email', 'is', null);

  let sent = 0;
  let skipped = 0;
  for (const p of parents ?? []) {
    const digest = await buildParentDigest(admin, p as never);
    if (!digest) {
      skipped++;
      continue;
    }
    const ok = await sendEmail(digest);
    ok ? sent++ : skipped++;
  }

  return NextResponse.json({ provider: emailProvider(), sent, skipped });
}
