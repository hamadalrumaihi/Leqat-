-- ════════════════════════════════════════════════════════════════
--  0012_realtime.sql — enable Realtime on the subscribed tables
--
--  Critical defect (proven on a local stack): the client subscribes
--  to postgres_changes on chat_messages, pickup_status, and
--  attendance, but NONE of them were in the supabase_realtime
--  publication — so on a fresh deploy the pickup "at the gate" live
--  queue, chat live updates, and realtime attendance simply never
--  fired. The Supabase dashboard toggles this per-table; nothing in
--  the repo did, so every environment rebuilt from migrations was
--  broken. This migration makes it reproducible.
--
--  REPLICA IDENTITY FULL is required because the pickup queue and DM
--  room subscribe with a `filter` (session_id / channel_id) and react
--  to UPDATE events (release, moderation flip). With the default
--  replica identity, UPDATE/DELETE change payloads carry only the PK,
--  so the server-side filter can't match on a non-PK column and the
--  old values (needed to detect released_at transitions) are absent.
-- ════════════════════════════════════════════════════════════════

alter table chat_messages replica identity full;
alter table pickup_status replica identity full;
alter table attendance    replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'pickup_status'
  ) then
    alter publication supabase_realtime add table pickup_status;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'attendance'
  ) then
    alter publication supabase_realtime add table attendance;
  end if;
end $$;
