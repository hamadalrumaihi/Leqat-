import { createClient } from '@/lib/supabase/server';
import { EditProgram } from '@/components/program-forms';
import { InvitesManager, type InviteRow } from '@/components/invites-manager';
import type { AgeGroup } from '@/lib/age-groups';

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from('programs')
    .select('id, name_ar, age_grps, quotient, value_ar, value_en, ramadan_mode, status')
    .eq('id', id)
    .maybeSingle();

  if (!program) {
    return <div className="card p-8 text-center text-muted-foreground">البرنامج غير موجود.</div>;
  }

  const { data: invites } = await supabase
    .from('registration_invites')
    .select('token, parent_name_hint, parent_phone_hint, created_at, expires_at, consumed_at, consumed:profiles!registration_invites_consumed_by_profile_id_fkey(full_name_ar)')
    .eq('program_id', id)
    .order('created_at', { ascending: false })
    .limit(20);

  const rows: InviteRow[] = (invites ?? []).map((i) => ({
    token: i.token as string,
    parentNameHint: (i.parent_name_hint as string) ?? null,
    parentPhoneHint: (i.parent_phone_hint as string) ?? null,
    createdAt: i.created_at as string,
    expiresAt: i.expires_at as string,
    consumedAt: (i.consumed_at as string) ?? null,
    consumedParentName:
      (i.consumed as unknown as { full_name_ar: string } | null)?.full_name_ar ?? null,
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{program.name_ar as string}</h1>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">إعدادات البرنامج</h2>
        <EditProgram
          program={{
            id: program.id as string,
            name_ar: (program.name_ar as string) ?? '',
            age_grps: (program.age_grps as AgeGroup[]) ?? [],
            quotient: (program.quotient as string) ?? '',
            value_ar: (program.value_ar as string) ?? '',
            value_en: (program.value_en as string) ?? '',
            ramadan_mode: Boolean(program.ramadan_mode),
            status: (program.status as string) ?? 'draft',
          }}
        />
      </section>

      <InvitesManager
        programId={id}
        programName={program.name_ar as string}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ''}
        initial={rows}
      />
    </div>
  );
}
