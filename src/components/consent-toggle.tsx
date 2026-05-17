'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { setConsentAction } from '@/app/[locale]/dashboard/consent/actions';
import { cn } from '@/lib/utils';

function Btn({ grant, consented }: { grant: boolean; consented: boolean }) {
  const { pending } = useFormStatus();
  const active = grant === consented;
  return (
    <button
      type="submit"
      disabled={pending || active}
      className={cn(
        'btn h-9 px-4 text-sm',
        grant
          ? 'bg-green-vibrant text-white'
          : 'border border-input bg-background',
        active && 'opacity-60',
      )}
    >
      {grant ? 'أوافق' : 'سحب الموافقة'}
    </button>
  );
}

export function ConsentToggle({
  studentId,
  consented,
}: {
  studentId: string;
  consented: boolean;
}) {
  const [, action] = useFormState(setConsentAction, null);
  return (
    <div className="flex items-center gap-2">
      <form action={action}>
        <input type="hidden" name="student_id" value={studentId} />
        <input type="hidden" name="grant" value="true" />
        <Btn grant consented={consented} />
      </form>
      <form action={action}>
        <input type="hidden" name="student_id" value={studentId} />
        <input type="hidden" name="grant" value="false" />
        <Btn grant={false} consented={consented} />
      </form>
    </div>
  );
}
