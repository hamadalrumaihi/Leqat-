'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { advanceReportAction } from '@/app/[locale]/dashboard/reports/actions';

function Btn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-outline h-9 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function ReportAdvance({
  reportId,
  label,
}: {
  reportId: string;
  label: string;
}) {
  const [state, action] = useFormState(advanceReportAction, null as
    | null
    | { ok?: boolean; error?: string; to?: string });

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="report_id" value={reportId} />
      <Btn label={label} />
      {state?.error === 'forbidden' && (
        <span className="text-xs text-destructive">لا تملك صلاحية هذا الإجراء</span>
      )}
      {state?.ok && <span className="text-xs text-green-vibrant">تم</span>}
    </form>
  );
}
