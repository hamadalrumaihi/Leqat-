-- ════════════════════════════════════════════════════════════════
--  0014_pickup_release.sql — staff could never release a pickup.
--
--  pickup_status had exactly one write policy ("parent sets pickup",
--  parent_id = auth.uid()), so the supervisor's "تم التسليم" button
--  ran an UPDATE that matched 0 rows: no error, optimistic UI removed
--  the row, and the child was never marked released. Proven live in
--  the two-browser test — the release row stayed released_at = null.
--
--  is_group_staff() covers group staff, program staff of the group's
--  program, and executives — the same set that reads the queue.
-- ════════════════════════════════════════════════════════════════

create policy "group staff releases pickup" on pickup_status
  for update
  using (
    exists (
      select 1 from sessions s
      where s.id = pickup_status.session_id and is_group_staff(s.group_id)
    )
  )
  with check (
    exists (
      select 1 from sessions s
      where s.id = pickup_status.session_id and is_group_staff(s.group_id)
    )
  );
