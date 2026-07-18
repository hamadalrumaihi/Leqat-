-- ════════════════════════════════════════════════════════════════
--  0020_age_groups_remap.sql — migrate existing rows onto the three
--  new age groups added in 0019.
--
--  Students: recomputed from date of birth (authoritative) so each
--  child lands in the correct new band regardless of their old label:
--    age ≤ 6  → children,  7–13 → boys,  ≥ 14 → youth.
--  Students with a null dob fall back to the best-fit label mapping.
--
--  Programs / stories carry a target age_grp with no dob, so they use
--  a best-fit mapping of the old kid bands:
--    baraem → children · nashia → boys · fityan → boys · shabab → youth
--  (fityan 10–14 folds into boys; the single 14-year edge is a target-
--  group label, not a per-child assignment.) The adult legacy values
--  university/parents are left untouched — they are not kid groups.
-- ════════════════════════════════════════════════════════════════

-- Students: authoritative recompute from dob.
update students
set age_grp = case
  when extract(year from age(dob)) <= 6  then 'children'::age_group
  when extract(year from age(dob)) <= 13 then 'boys'::age_group
  else 'youth'::age_group
end
where dob is not null
  and age_grp in ('baraem','nashia','fityan','shabab');

-- Students without a dob: best-fit label mapping.
update students set age_grp = case age_grp
  when 'baraem' then 'children'::age_group
  when 'nashia' then 'boys'::age_group
  when 'fityan' then 'boys'::age_group
  when 'shabab' then 'youth'::age_group
  else age_grp
end
where dob is null
  and age_grp in ('baraem','nashia','fityan','shabab');

-- Programs: best-fit target-group mapping (no dob available).
update programs set age_grp = case age_grp
  when 'baraem' then 'children'::age_group
  when 'nashia' then 'boys'::age_group
  when 'fityan' then 'boys'::age_group
  when 'shabab' then 'youth'::age_group
  else age_grp
end
where age_grp in ('baraem','nashia','fityan','shabab');

-- Stories (optional age_grp tag).
update stories set age_grp = case age_grp
  when 'baraem' then 'children'::age_group
  when 'nashia' then 'boys'::age_group
  when 'fityan' then 'boys'::age_group
  when 'shabab' then 'youth'::age_group
  else age_grp
end
where age_grp in ('baraem','nashia','fityan','shabab');
