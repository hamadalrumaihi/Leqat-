'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createSubstituteLinkAction } from '@/app/[locale]/dashboard/substitute/actions';

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-outline h-10 px-4" disabled={pending}>
      {pending ? '…' : 'إنشاء رابط بديل (٤ ساعات)'}
    </button>
  );
}

export function SubstituteLink({ sessionId }: { sessionId: string }) {
  const [state, action] = useFormState(createSubstituteLinkAction, null as
    | null
    | { url?: string; error?: string });

  return (
    <div className="card space-y-2 p-5">
      <form action={action}>
        <input type="hidden" name="session_id" value={sessionId} />
        <Btn />
      </form>
      {state?.error === 'not_configured' && (
        <p className="text-xs text-muted-foreground">
          أضف SUBSTITUTE_LINK_SECRET في متغيرات البيئة لتفعيل الروابط المؤقتة.
        </p>
      )}
      {state?.url && (
        <input
          readOnly
          dir="ltr"
          value={state.url}
          onFocus={(e) => e.currentTarget.select()}
          className="input text-xs"
        />
      )}
    </div>
  );
}
