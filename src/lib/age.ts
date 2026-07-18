// Compatibility shim — the canonical age-group definitions live in
// @/lib/age-groups. This re-exports them and keeps the older
// AGE_GROUPS ({ value, ar }) shape a couple of call sites still use.
import {
  VISIBLE_AGE_GROUPS,
  AGE_LABEL_AR,
  ageGroupFromDob,
  type AgeGroup,
} from '@/lib/age-groups';

export type { AgeGroup };
export { ageGroupFromDob };

export const AGE_GROUPS: { value: AgeGroup; ar: string }[] = VISIBLE_AGE_GROUPS.map(
  (value) => ({ value, ar: AGE_LABEL_AR[value] }),
);
