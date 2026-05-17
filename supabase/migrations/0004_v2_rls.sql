-- ════════════════════════════════════════════════════════════════
--  0004_v2_rls.sql — RLS for the v2 layer tables.
--  Reuses helpers from 0002 (is_executive, is_group_staff,
--  is_parent_of, parent_group_ids, student_group_ids).
-- ════════════════════════════════════════════════════════════════

alter table stories                    enable row level security;
alter table recognition_tokens         enable row level security;
alter table permission_slips           enable row level security;
alter table permission_slip_signatures enable row level security;
alter table session_feedback           enable row level security;
alter table inventory_items            enable row level security;
alter table inventory_checkouts        enable row level security;

-- ── Story library: any authenticated staff/student reads; staff write
create policy "read stories" on stories for select using (auth.uid() is not null);
create policy "staff write stories" on stories for all
  using (auth_role() <> 'parent' and auth_role() <> 'student')
  with check (auth_role() <> 'parent' and auth_role() <> 'student');

-- ── Recognition tokens: private wall — the child + their parent +
--    staff over their group. No public leaderboards.
create policy "read recognition" on recognition_tokens for select using (
  is_parent_of(student_id)
  or exists (select 1 from students st where st.id = recognition_tokens.student_id and st.profile_id = auth.uid())
  or exists (select 1 from enrollments e where e.student_id = recognition_tokens.student_id and is_group_staff(e.group_id))
);
create policy "staff award recognition" on recognition_tokens for all using (
  exists (select 1 from enrollments e where e.student_id = recognition_tokens.student_id and is_group_staff(e.group_id))
) with check (
  exists (select 1 from enrollments e where e.student_id = recognition_tokens.student_id and is_group_staff(e.group_id))
);

-- ── Permission slips: program scope ─────────────────────────────
create policy "read slips" on permission_slips for select using (
  is_program_staff(program_id)
  or exists (
    select 1 from enrollments e join students st on st.id = e.student_id
    where e.program_id = permission_slips.program_id and st.parent_id = auth.uid()
  )
);
create policy "staff write slips" on permission_slips for all
  using (is_program_staff(program_id)) with check (is_program_staff(program_id));

create policy "read slip sigs" on permission_slip_signatures for select using (
  parent_id = auth.uid()
  or exists (select 1 from permission_slips ps where ps.id = slip_id and is_program_staff(ps.program_id))
);
create policy "parent signs slip" on permission_slip_signatures for insert
  with check (parent_id = auth.uid() and is_parent_of(student_id));

-- ── Session feedback: parent writes own; staff/exec read aggregate
create policy "parent writes feedback" on session_feedback for all
  using (parent_id = auth.uid()) with check (parent_id = auth.uid());
create policy "staff read feedback" on session_feedback for select using (
  parent_id = auth.uid()
  or exists (select 1 from sessions s where s.id = session_feedback.session_id and is_group_staff(s.group_id))
);

-- ── Inventory: staff only ───────────────────────────────────────
create policy "staff read inventory" on inventory_items for select
  using (auth_role() <> 'parent' and auth_role() <> 'student');
create policy "exec write inventory" on inventory_items for all
  using (is_executive()) with check (is_executive());
create policy "staff inventory checkouts" on inventory_checkouts for all
  using (auth_role() <> 'parent' and auth_role() <> 'student')
  with check (auth_role() <> 'parent' and auth_role() <> 'student');
