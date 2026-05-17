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

export const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  executive: { ar: 'مشرف تنفيذي عام', en: 'Executive Supervisor' },
  program_supervisor: { ar: 'مشرف برنامج تنفيذي', en: 'Program Supervisor' },
  program_manager: { ar: 'مدير برنامج', en: 'Program Manager' },
  group_supervisor: { ar: 'مشرف مجموعة', en: 'Group Supervisor' },
  assistant_supervisor: { ar: 'مشرف مساعد', en: 'Assistant Supervisor' },
  parent: { ar: 'ولي أمر', en: 'Parent' },
  student: { ar: 'طالب', en: 'Student' },
};
