-- ════════════════════════════════════════════════════════════════
--  0009_grants.sql — establish the privilege layer under RLS
--
--  Defect: objects created by the `postgres` migration role inherit a
--  default ACL that gives anon/authenticated/service_role only
--  TRUNCATE/REFERENCES/TRIGGER — no DML and no EXECUTE. With no
--  explicit GRANTs anywhere in 0001–0008, every PostgREST request
--  fails with "permission denied" on a fresh deploy, and every RLS
--  policy fails on its helper functions.
--
--  RLS remains the row-level authorization layer; these grants are
--  the table/function transport layer beneath it. Tables without a
--  policy still deny by default.
--
--  (0007 was never created; numbering resumes at 0009 after 0008.)
-- ════════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated, service_role;

-- API roles: DML gated by RLS. service_role additionally bypasses RLS
-- (used only by audited server-side helpers).
grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

-- Identity/serial columns (e.g. audit_log.id) need sequence access.
grant usage, select on all sequences in schema public
  to authenticated, service_role;

-- RLS policies call the security-definer helpers as the querying role,
-- which therefore needs EXECUTE. anon included: the marketing site's
-- "public read open programs" policy evaluates these helpers too
-- (they safely return false when auth.uid() is null).
grant execute on all functions in schema public
  to anon, authenticated, service_role;

-- Anonymous visitors read open programs only (RLS narrows the rows).
grant select on public.programs to anon;

-- Objects created by future migrations (run as this same role)
-- inherit the grants instead of regressing to the crippled default.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
