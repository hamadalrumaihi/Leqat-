'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { aiDraftAction, saveReportAction } from '@/app/[locale]/dashboard/reports/actions';
import { REPEAT_LETTERS } from '@/lib/utils';

const QUOTIENTS = ['SQ', 'EQ', 'IQ', 'PQ'] as const;
const SKILLS = ['critical', 'creative', 'collaboration', 'communication'] as const;

function Pending({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function ReportEditor({
  sessionId,
  initial,
}: {
  sessionId: string;
  initial: { summaryAr: string; highlightsAr: string };
}) {
  const t = useTranslations('reports');
  const [summary, setSummary] = useState(initial.summaryAr);
  const [highlights, setHighlights] = useState(initial.highlightsAr);
  const [aiAssisted, setAiAssisted] = useState(false);

  const [draftState, draftAction] = useFormState(aiDraftAction, null as
    | null
    | { summaryAr?: string; highlightsAr?: string; aiAssisted?: boolean; error?: string });
  const [saveState, saveAction] = useFormState(saveReportAction, null as
    | null
    | { ok?: boolean; error?: string });

  // Apply the AI draft into the editable fields once it returns.
  useEffect(() => {
    if (draftState?.summaryAr) {
      setSummary(draftState.summaryAr);
      setHighlights(draftState.highlightsAr ?? '');
      setAiAssisted(Boolean(draftState.aiAssisted));
    }
  }, [draftState]);

  return (
    <div className="space-y-6">
      {/* AI assist — drafts only, never auto-publishes */}
      <form action={draftAction} className="card space-y-3 p-5">
        <input type="hidden" name="session_id" value={sessionId} />
        <label className="label">ملاحظات خام للمساعد الذكي (اختياري)</label>
        <textarea
          name="raw_notes"
          rows={3}
          className="input h-auto py-2"
          placeholder="اكتب نقاطًا سريعة عن الجلسة، وسيقترح المساعد مسودة عربية مصقولة تراجعها وتعدّلها قبل الحفظ."
        />
        <div className="flex items-center gap-3">
          <Pending label="اقتراح مسودة" />
          <span className="text-xs text-muted-foreground">
            المخرجات مسودة قابلة للتعديل دائمًا — لا تُنشر تلقائيًا.
          </span>
        </div>
      </form>

      <form action={saveAction} className="card space-y-4 p-5">
        <input type="hidden" name="session_id" value={sessionId} />
        <input type="hidden" name="ai_assisted" value={String(aiAssisted)} />

        <div>
          <label className="label">{t('covered')}</label>
          <textarea
            name="summary_ar"
            rows={4}
            required
            className="input h-auto py-2"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>

        <div>
          <label className="label">{t('highlights')}</label>
          <textarea
            name="highlights_ar"
            rows={3}
            className="input h-auto py-2"
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
          />
        </div>

        <fieldset>
          <legend className="label">إطار REPEAT</legend>
          <div className="flex flex-wrap gap-3">
            {REPEAT_LETTERS.map((r) => (
              <label key={r.code} title={r.phrase} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="repeat_tags" value={r.code} />
                <span className="latin-term font-bold">{r.code}</span> {r.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">{t('quotientTags')}</legend>
          <div className="flex flex-wrap gap-3">
            {QUOTIENTS.map((q) => (
              <label key={q} className="latin-term flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="quotient_tags" value={q} /> {q}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">{t('skillTags')}</legend>
          <div className="flex flex-wrap gap-3">
            {SKILLS.map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="skill_tags" value={s} /> {s}
              </label>
            ))}
          </div>
        </fieldset>

        {aiAssisted && (
          <p className="rounded-md bg-secondary/60 p-2 text-xs">
            صيغت المسودة بمساعدة الذكاء الاصطناعي — راجعها قبل الرفع.
          </p>
        )}
        {saveState?.ok && (
          <p className="rounded-md bg-green-vibrant/15 p-2 text-sm text-green-vibrant">
            تم الحفظ كمسودة. ارفعها من قائمة التقارير.
          </p>
        )}

        <Pending label={t('submit')} />
      </form>
    </div>
  );
}
