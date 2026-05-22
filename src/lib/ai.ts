import AI from '@anthropic-ai/sdk';

export type StationLite = { title_ar: string; quotient?: string | null };

export type ReportDraft = {
  summaryAr: string;
  highlightsAr: string;
  aiAssisted: boolean;
};

const SYSTEM = `أنت مساعد تربوي لبرنامج "مهندس الحياة" في قطر. مهمتك تحويل ملاحظات
المشرف الخام إلى تقرير جلسة مصقول بالعربية الفصحى، بنبرة تربوية دافئة
ومحترمة تناسب أولياء الأمور. لا تختلق معلومات غير موجودة في الملاحظات.
اكتب فقرتين موجزتين: الأولى "ماذا غطّينا اليوم" مرتبطة بالمحطات،
والثانية "أبرز ما حدث". لا تضف عناوين، أعد النص فقط مفصولًا بسطر فارغ.`;

/**
 * Produce a polished Arabic report draft from the supervisor's rough
 * notes. Human-in-the-loop: the caller stores this as a DRAFT only —
 * it is never auto-published. Falls back to a deterministic template
 * when AI_API_KEY is not configured (no external call).
 */
export async function draftReportArabic(
  rawNotes: string,
  stations: StationLite[],
): Promise<ReportDraft> {
  const stationList = stations.map((s) => `- ${s.title_ar}`).join('\n');

  if (!process.env.AI_API_KEY) {
    return {
      summaryAr: `غطّينا اليوم المحطات التالية:\n${stationList}\n\nملاحظات المشرف: ${rawNotes}`,
      highlightsAr: rawNotes.slice(0, 280),
      aiAssisted: false,
    };
  }

  const client = new AI({ apiKey: process.env.AI_API_KEY });
  const message = await client.messages.create({
    model: process.env.AI_MODEL ?? 'claude-opus-4-7',
    max_tokens: 1500,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `محطات الجلسة:\n${stationList}\n\nملاحظات المشرف الخام:\n${rawNotes}`,
      },
    ],
  });

  const text = message.content
    .filter((b): b is AI.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  const [summaryAr, ...rest] = text.split(/\n\s*\n/);
  return {
    summaryAr: summaryAr?.trim() || text,
    highlightsAr: rest.join('\n\n').trim(),
    aiAssisted: true,
  };
}
