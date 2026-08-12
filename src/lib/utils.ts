import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

// Soft group-size guidance: warn above this, NEVER block. Roster
// assignment has no hard cap by design — this only surfaces a hint.
export const RECOMMENDED_GROUP_SIZE = 14;

export const DIVISION_LABELS: Record<string, { ar: string; en: string }> = {
  younger: { ar: 'الفئة الأصغر', en: 'Younger' },
  teen: { ar: 'فئة اليافعين', en: 'Teen' },
};

/** Render a number using Arabic-Indic or Latin digits per preference. */
export function toNumerals(value: number | string, pref: 'arabic' | 'latin' = 'arabic') {
  const s = String(value);
  if (pref === 'latin') return s;
  return s.replace(/\d/g, (d) => arabicDigits[Number(d)]);
}

/** Gregorian + Hijri side by side, e.g. "٦ سبتمبر ٢٠٢٥ · ١٤ ربيع الأول ١٤٤٧". */
export function dualDate(input: string | Date, locale: 'ar' | 'en' = 'ar') {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return String(input);
  const greg = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-QA' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  const hijri = new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-QA-u-ca-islamic' : 'en-GB-u-ca-islamic',
    { day: 'numeric', month: 'long', year: 'numeric' },
  ).format(d);
  return `${greg} · ${hijri}`;
}

export const BRAND_GREEN = '#1F5C3A';

/**
 * Today's date (YYYY-MM-DD) in Qatar time. toISOString() is UTC, so
 * "today" flipped at 03:00 Doha time and evening sessions compared
 * against the wrong day.
 */
export function qatarToday(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar' }).format(new Date());
}

/** Current wall-clock minutes in Qatar (for station/next-event math). */
export function qatarNowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Qatar',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

/**
 * Collapse roles to the effective set the UI/gates reason about:
 *   founder | executive | manager | group_supervisor |
 *   assistant_supervisor | parent | student
 * The legacy planner trio (program_supervisor/manager/planner) and the
 * new `manager` all resolve to `manager` — the planner tier's duties
 * became the Manager role. `founder` stays distinct (top of hierarchy);
 * everything else maps to itself.
 */
export function effectiveRole(role: string): string {
  if (
    role === 'program_supervisor' ||
    role === 'program_manager' ||
    role === 'program_planner' ||
    role === 'manager'
  ) {
    return 'manager';
  }
  return role;
}

const MANAGER_LABEL = { ar: 'مدير', en: 'Manager' };

export const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  founder: { ar: 'المؤسّس', en: 'Founder' },
  executive: { ar: 'مشرف تنفيذي عام', en: 'Executive Supervisor' },
  manager: MANAGER_LABEL,
  // Legacy planner-tier values all render as Manager (compat aliases).
  program_planner: MANAGER_LABEL,
  program_supervisor: MANAGER_LABEL,
  program_manager: MANAGER_LABEL,
  group_supervisor: { ar: 'مشرف مجموعة', en: 'Group Supervisor' },
  assistant_supervisor: { ar: 'مشرف مساعد', en: 'Assistant Supervisor' },
  specialist_teacher: { ar: 'معلّم مختص', en: 'Specialist Teacher' },
  parent: { ar: 'ولي أمر', en: 'Parent' },
  student: { ar: 'طالب', en: 'Student' },
};

/** Format a "HH:MM[:SS]" time as 12-hour with Arabic ص/م + numerals. */
export function formatTime12(
  time: string | null | undefined,
  pref: 'arabic' | 'latin' = 'arabic',
) {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  let h = Number(hStr);
  const m = mStr ?? '00';
  const meridiem = h >= 12 ? (pref === 'arabic' ? 'م' : 'PM') : pref === 'arabic' ? 'ص' : 'AM';
  h = h % 12 || 12;
  return `${toNumerals(h, pref)}:${toNumerals(m, pref)} ${meridiem}`;
}

export function timeRange(
  start: string | null,
  end: string | null,
  pref: 'arabic' | 'latin' = 'arabic',
) {
  if (!start && !end) return '';
  return `${formatTime12(start, pref)} — ${formatTime12(end, pref)}`;
}

// Canonical quotient → value mapping (matches the 0006 DB trigger).
export const QUOTIENT_VALUE: Record<string, { ar: string; en: string }> = {
  SQ: { ar: 'الإحسان', en: 'Ihsan' },
  EQ: { ar: 'الانضباط الذاتي', en: 'Self-discipline' },
  IQ: { ar: 'التعلّم', en: 'Learning' },
  PQ: { ar: 'الصحة', en: 'Health' },
};

// Human name of each quotient — the abbreviation alone (IQ/EQ/…)
// means nothing to most users, so every place a quotient code is
// shown must pair it with this name via quotientLabel().
export const QUOTIENT_NAME: Record<string, { ar: string; en: string }> = {
  SQ: { ar: 'البعد الروحي', en: 'Spiritual' },
  EQ: { ar: 'البعد العاطفي', en: 'Emotional' },
  IQ: { ar: 'البعد العقلي', en: 'Intellectual' },
  PQ: { ar: 'البعد الجسدي', en: 'Physical' },
};

/** "SQ — البعد الروحي" (falls back to the raw code for unknown values). */
export function quotientLabel(q: string | null | undefined, locale: 'ar' | 'en' = 'ar'): string {
  if (!q) return '';
  const name = QUOTIENT_NAME[q]?.[locale];
  return name ? `${q} — ${name}` : q;
}

export const QUOTIENT_COLOR: Record<string, string> = {
  SQ: '#1F5C3A',
  EQ: '#3FA34D',
  IQ: '#8A8F98',
  PQ: '#A7D7A0',
};

// REPEAT framework letters → Arabic label + full brand-book phrase.
export const REPEAT_LETTERS: { code: string; label: string; phrase: string }[] = [
  { code: 'R', label: 'احترام', phrase: 'احترام المشرفين والطلاب والأشياء' },
  { code: 'E1', label: 'استئذان', phrase: 'الاستئذان قبل التصرّف' },
  { code: 'P', label: 'مبادرة', phrase: 'المبادرة وروح الريادة' },
  { code: 'E2', label: 'أخلاق', phrase: 'الأخلاق الحسنة في التعامل' },
  { code: 'A', label: 'نشاط', phrase: 'النشاط والحيوية' },
  { code: 'T', label: 'وقت', phrase: 'احترام الوقت والالتزام به' },
];
