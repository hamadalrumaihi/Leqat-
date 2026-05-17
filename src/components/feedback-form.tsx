'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { submitFeedbackAction } from '@/app/[locale]/dashboard/feedback/actions';

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-5" disabled={pending}>
      {pending ? '…' : 'إرسال'}
    </button>
  );
}

export function FeedbackForm({ sessionId }: { sessionId: string }) {
  const [rating, setRating] = useState(0);
  const [state, action] = useFormState(submitFeedbackAction, null as
    | null
    | { ok?: boolean; error?: string });

  if (state?.ok) {
    return (
      <div className="card p-6 text-center text-green-vibrant">
        شكرًا لك — تم استلام تقييمك.
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <p className="label">كيف كان يوم اليوم؟</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`h-11 w-11 rounded-full text-lg ${
                n <= rating ? 'bg-green-vibrant text-white' : 'bg-muted'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">ملاحظة (اختياري)</label>
        <textarea name="comment" rows={2} className="input h-auto py-2" />
      </div>
      <Btn />
    </form>
  );
}
