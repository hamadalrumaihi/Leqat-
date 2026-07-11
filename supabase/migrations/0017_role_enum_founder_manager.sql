-- ════════════════════════════════════════════════════════════════
--  0017_role_enum_founder_manager.sql — role model migration, step
--  M-a (enum add, STANDALONE).
--
--  Adds the two new roles of the target hierarchy:
--    Founder → Executive → Manager → Group Supervisor → Assistant →
--    Parent → Student
--
--  This migration ONLY adds the enum values. Postgres cannot use a new
--  enum value in the same transaction that adds it, so seeding a
--  founder account, remapping the legacy planner trio, and any policy/
--  app change that references 'founder'/'manager' must live in later
--  migrations (M-b/M-c) and commits — never here.
--
--  Legacy values (program_supervisor, program_manager, program_planner)
--  are RETAINED for backward compatibility; effectiveRole() collapses
--  them to 'manager' in the app layer (M-c). No value is dropped, so
--  this step is inert until later steps reference the new roles —
--  which is exactly what makes rollback safe (revert the app commits;
--  unused enum values sit harmless).
-- ════════════════════════════════════════════════════════════════

alter type app_role add value if not exists 'founder';
alter type app_role add value if not exists 'manager';
