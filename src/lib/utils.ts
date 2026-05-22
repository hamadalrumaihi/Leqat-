import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

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
 * The three planner-tier roles act as one effective role in the UI.
 * Everything else maps to itself.
 */
export function effectiveRole(role: string): string {
  if (
    role === 'program_supervisor' ||
    role === 'program_manager' ||
    role === 'program_planner'
  ) {
    return 'program_planner';
  }
  return role;
}

export const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  executive: { ar: 'مشرف تنفيذي عام', en: 'Executive Supervisor' },
  program_planner: { ar: 'مخطط البرنامج', en: 'Program Planner' },
  program_supervisor: { ar: 'مخطط البرنامج', en: 'Program Planner' },
  program_manager: { ar: 'مخطط البرنامج', en: 'Program Planner' },
  group_supervisor: { ar: 'مشرف مجموعة', en: 'Group Supervisor' },
  assistant_supervisor: { ar: 'مشرف مساعد', en: 'Assistant Supervisor' },
  parent: { ar: 'ولي أمر', en: 'Parent' },
  student: { ar: 'طالب', en: 'Student' },
};
