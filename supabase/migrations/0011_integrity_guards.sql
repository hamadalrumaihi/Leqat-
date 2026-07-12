-- ════════════════════════════════════════════════════════════════
--  0011_integrity_guards.sql — duplicate-row guards
--
--  R7: a parent double-tapping "أنا عند البوابة" inserted duplicate
--      pickup rows for the same child in the same session; the
--      supervisor queue then showed the child twice. One un-released
--      arrival per (session, student) is now enforced in the DB.
--  R8: repeated "بدء محادثة" clicks created parallel DM channels for
--      the same staff↔student pair because channels didn't record the
--      student. chat_channels.student_id lets the action find and
--      reuse the existing channel (two *different* supervisors may
--      still each have their own DM — intentionally not unique).
-- ════════════════════════════════════════════════════════════════

create unique index if not exists pickup_one_open_arrival
  on pickup_status (session_id, student_id)
  where released_at is null;

alter table chat_channels
  add column if not exists student_id uuid references students(id) on delete set null;

create index if not exists chat_channels_student_idx
  on chat_channels (student_id) where student_id is not null;
