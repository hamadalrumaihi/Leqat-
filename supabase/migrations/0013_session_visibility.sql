-- ════════════════════════════════════════════════════════════════
--  0013_session_visibility.sql — two visibility defects, proven by
--  RLS probes against the seeded local stack:
--
--  1. Group staff were blind to sessions. "read sessions" only
--     allowed is_program_staff(), but group supervisors/assistants
--     live in group_staff, not program_staff — so a group supervisor
--     counted 0 sessions and the attendance page, live screen, and
--     next-event widget could never find today's session for them.
--     staff_program_ids() (0010) already unions both memberships.
--
--  2. Parents/students could read unpublished drafts. The schedule
--     page hides them client-side (.not('published_at','is',null)),
--     but the policy had no published_at filter, so a draft plan —
--     dates, times, station layout — was readable via the API before
--     the planner published it. Same gap on stations via the session
--     subquery. Authorization belongs in RLS, not the client.
--
--  attendance policies already use is_group_staff() and are correct.
--  Write policies are unchanged: planning stays with program staff.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "read sessions" on sessions;
create policy "read sessions" on sessions for select using (
  is_executive()
  or program_id in (select staff_program_ids())
  or (published_at is not null and (
       group_id in (select parent_group_ids())
       or group_id in (select student_group_ids())))
);

drop policy if exists "read stations" on stations;
create policy "read stations" on stations for select using (
  -- program-level station templates: any staff of that program
  (program_id is not null
    and (is_executive() or program_id in (select staff_program_ids())))
  -- session stations: staff of the session's program; families only
  -- once the session is published
  or exists (
    select 1 from sessions s
    where s.id = stations.session_id
      and (is_executive()
        or s.program_id in (select staff_program_ids())
        or (s.published_at is not null and (
             s.group_id in (select parent_group_ids())
             or s.group_id in (select student_group_ids()))))
  )
);
