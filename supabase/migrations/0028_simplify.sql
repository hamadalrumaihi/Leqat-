-- ════════════════════════════════════════════════════════════════
--  0028_simplify.sql — platform simplification batch.
--
--  1. Two age categories only: ناشئة (nashia, the younger) and
--     فتيان (fityan, the older). Existing rows are remapped —
--     students authoritatively from dob (≤ 9 → nashia, 10+ → fityan),
--     label-tagged rows (programs/stories/activities) by best fit.
--  2. Programs can target MULTIPLE age categories: new age_grps
--     array column, backfilled from the single age_grp.
--  3. Price becomes free text per enrollment (agreed at booking):
--     new enrollments.price_note column.
--
--  The age_group enum already contains nashia/fityan (original 0001
--  values), so no enum surgery is needed; the old values stay valid
--  members for any historical data.
-- ════════════════════════════════════════════════════════════════

-- 1a. Students: authoritative recompute from dob.
update students
set age_grp = case
  when extract(year from age(dob)) <= 9 then 'nashia'::age_group
  else 'fityan'::age_group
end
where dob is not null
  and age_grp not in ('nashia', 'fityan', 'university', 'parents');

-- 1b. Students without a dob: best-fit label mapping.
update students set age_grp = case age_grp
  when 'children' then 'nashia'::age_group
  when 'baraem'   then 'nashia'::age_group
  when 'boys'     then 'nashia'::age_group
  when 'youth'    then 'fityan'::age_group
  when 'shabab'   then 'fityan'::age_group
  else age_grp
end
where dob is null
  and age_grp in ('children', 'baraem', 'boys', 'youth', 'shabab');

-- 1c. Programs / stories / activities carry a target label, no dob.
update programs set age_grp = case age_grp
  when 'children' then 'nashia'::age_group
  when 'baraem'   then 'nashia'::age_group
  when 'boys'     then 'nashia'::age_group
  when 'youth'    then 'fityan'::age_group
  when 'shabab'   then 'fityan'::age_group
  else age_grp
end
where age_grp in ('children', 'baraem', 'boys', 'youth', 'shabab');

update stories set age_grp = case age_grp
  when 'children' then 'nashia'::age_group
  when 'baraem'   then 'nashia'::age_group
  when 'boys'     then 'nashia'::age_group
  when 'youth'    then 'fityan'::age_group
  when 'shabab'   then 'fityan'::age_group
  else age_grp
end
where age_grp in ('children', 'baraem', 'boys', 'youth', 'shabab');

update activities set age_grp = case age_grp
  when 'children' then 'nashia'::age_group
  when 'baraem'   then 'nashia'::age_group
  when 'boys'     then 'nashia'::age_group
  when 'youth'    then 'fityan'::age_group
  when 'shabab'   then 'fityan'::age_group
  else age_grp
end
where age_grp in ('children', 'baraem', 'boys', 'youth', 'shabab');

-- 2. Programs may target several age categories at once.
alter table programs
  add column if not exists age_grps age_group[] not null default '{}'::age_group[];

update programs
set age_grps = array[age_grp]
where age_grps = '{}'::age_group[] and age_grp is not null;

-- 3. Free-text agreed price, captured when the student is registered.
alter table enrollments
  add column if not exists price_note text;
