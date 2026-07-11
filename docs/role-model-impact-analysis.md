# Role Model Redesign — Impact Analysis

Status: **analysis only** — no enum migration performed. Required gate
before Phase 2 structural work per the enhancement mission.

Legend for Phase-2 tagging used later in the walkthrough:
- **[NEW]** valid under the new target model
- **[LEGACY]** belongs to the current/legacy model
- **[FIX-NOW]** defect to fix immediately regardless of role redesign
- **[WAIT-MIGRATION]** structural change deferred to the approved role
  migration

---

## 1. Current role model in the repository (verified from code)

`app_role` enum (`0001` + `0006 add value 'program_planner'`), in
creation order:

```
executive, program_supervisor, program_manager, group_supervisor,
assistant_supervisor, parent, student, program_planner
```

- `program_planner` was **added to the enum** in 0006 but **no seeded
  account uses it**. The three planner-tier values
  (`program_supervisor`, `program_manager`, `program_planner`) are
  collapsed to one **effective** role `program_planner` by
  `effectiveRole()` in `src/lib/utils.ts:62`. `ROLE_LABELS` renders all
  three as "مخطط البرنامج / Program Planner".
- Seeded accounts (`seed.sql`): `executive`, `program_supervisor`,
  `program_manager`, `group_supervisor`, `assistant_supervisor`,
  `parent`, `student`. There is **no** `program_planner` seed row and
  **no** Founder.
- RLS authorization pivots on exactly two role concepts:
  `is_executive()` (role = 'executive') and staff-membership helpers
  (`is_program_staff`, `is_group_staff`, `staff_program_ids`,
  `staff_can_see_student`, `is_staff_for_parent` — the last three added
  in 0010). **No RLS policy references `program_manager`,
  `program_supervisor`, or `program_planner` by name** — staff power is
  membership-driven via `program_staff` / `group_staff`, not role-string
  driven. This is the single most important fact for the migration: the
  database authorization layer is already role-string-agnostic for
  staff, so the enum change is mostly an application + labelling concern.

### Divisions / groups (verified)

- `groups` has `program_id, name_ar, name_en, capacity (default 15),
  color`. There is **no division concept** — no younger/teen split.
  `age_group` lives on `programs.age_grp` and `students.age_grp`, not on
  divisions.
- No shift concept anywhere (`morning`/`afternoon`).
- Assistant assignment: `group_staff.role` can be `group_supervisor`
  or `assistant_supervisor`; there is **no** `group_assistant` /
  `station_assistant` distinction. `stations` has no assistant link.

---

## 2. Every affected location (by layer)

### 2.1 Database / migrations
- `app_role` enum — add `founder`, `manager`; retain legacy values.
- `auth_role()`, `is_executive()` — unchanged mechanics; add
  `is_founder()` / `is_management()` helpers.
- `program_staff.role`, `group_staff.role` (`app_role` columns) — will
  accept new values; no structural change.
- `handle_new_user()` casts `raw_user_meta_data.role::app_role` — new
  values must exist in the enum before any signup uses them (enum-add
  must be its own committed migration; Postgres cannot use a new enum
  value in the same transaction it is added).
- New tables/columns proposed: `manager_shifts`, `group_staff.assignment`
  (station/group), `divisions` (or `groups.division`),
  `stations.assistant_profile_id`.

### 2.2 RLS
- `is_executive()` is used in 11 policies (0002), 1 (0004), 1 (0005),
  2 (0008). Under the new model, **Founder must have ≥ Executive
  power.** Cheapest correct change: make `is_executive()` return true
  for both `executive` and `founder` (rename intent: "is at least
  executive-level management"), OR add `is_management()` and update
  policies. Analysis recommendation in §6.
- Storage policies (0005) use `is_executive()` for the `books` bucket
  write — same treatment.

### 2.3 Server actions (role gate arrays) — 15 files
Verified gate arrays (`grep`):
| File | Current array |
|---|---|
| programs/actions.ts | `CAN = [executive, program_planner]` |
| groups/actions.ts | `CAN_MANAGE = [executive, program_planner]` |
| groups/[id]/actions.ts | `STAFF = [executive, program_planner, group_supervisor, assistant_supervisor]` |
| schedule/actions.ts | `PLANNER = [executive, program_planner]` |
| slips/actions.ts + page | `[executive, program_supervisor, program_manager, group_supervisor]` |
| substitute/actions.ts | `[executive, program_supervisor, program_manager, group_supervisor]` |
| gallery/page.tsx | `[executive, program_supervisor, program_manager, group_supervisor, assistant_supervisor]` |
| inventory/actions.ts | `[…same 5…]` |
| dm/actions.ts | `[executive, program_planner, group_supervisor, assistant_supervisor]` |
| dm/page.tsx | `[executive, program_supervisor, program_manager, group_supervisor, assistant_supervisor]` |
| chat/actions.ts + page | `[executive, program_planner, program_supervisor, program_manager, group_supervisor, assistant_supervisor]` |
| books/actions.ts + page | `[…same 6…]` |
| pickup/actions.ts + page | `[…same 6…]` |
| recognition/actions.ts | `[executive, group_supervisor, assistant_supervisor]` |

**Defect surfaced by this audit [FIX-NOW, model-independent]:** these
arrays are inconsistent. Some include `program_planner`, some the two
legacy planner values, some both — meaning a `program_planner` account
(the only *documented* planner role) is **silently denied** slips,
substitute, gallery, inventory, dm-page, books, pickup because those
arrays omit it. This is a latent authorization bug independent of the
redesign. Fix: centralize gates into one `src/lib/roles.ts` keyed by
capability, all going through `effectiveRole`.

### 2.4 Navigation — `src/lib/nav.ts`
`navGroupsFor(role)` filters via `effectiveRole`. Role union type is
the 6-value effective set (`program_planner` collapses the trio). New
roles (`founder`, `manager`) must map through `effectiveRole` and the
nav union.

### 2.5 Seed
7 accounts. New mapping in §3. Adds Founder; renames planner-tier.

### 2.6 UI labels
`ROLE_LABELS` (utils.ts), plus dashboard `roleLabel` rendering. Add
Founder + Manager labels.

### 2.7 database.types.ts
`AppRole` union — add `founder`, `manager`.

---

## 3. Proposed mapping for every seeded account

| Email | Current role | New role | Notes |
|---|---|---|---|
| exec@leqat.qa | executive | **executive** | unchanged; +1 new founder account added |
| psup@leqat.qa | program_supervisor | **manager** | manager, both-shifts by default |
| pmgr@leqat.qa | program_manager | **manager** | manager, afternoon shift |
| gsup@leqat.qa | group_supervisor | group_supervisor | unchanged |
| asup@leqat.qa | assistant_supervisor | assistant_supervisor | unchanged; default session assignment = group_assistant |
| parent@leqat.qa | parent | parent | unchanged |
| student@leqat.qa | student | student | unchanged |
| *(new)* founder@leqat.qa | — | **founder** | new seed row |

Legacy values (`program_supervisor`, `program_manager`,
`program_planner`) remain valid enum members for backward
compatibility; `effectiveRole` maps all three → `manager` after the
transition (replacing the current `→ program_planner` collapse).

---

## 4. Program Planner responsibilities → where they go

Evidence: "Program Planner" is a **UI-invented umbrella**, not a
program concept. Its responsibilities (create/edit programs, groups,
sessions, stations, publish sessions, invites, report advancement,
substitute links) map to what the new model calls the **Manager** (runs
the shift, directs group supervisors, sets station times, staffing,
transitions), with the top of those powers also held by Executive and
Founder.

**Recommendation:** *Program Planner responsibilities become part of
the Manager role.* Not a separate assignment and not a retained role.
Rationale: no seeded planner account exists, RLS never references the
role by name, and the new Manager definition is a strict superset of
the planner's scheduling duties. Keep the three legacy enum values only
as compatibility aliases resolved by `effectiveRole → manager`; do not
surface "Program Planner" as a label after migration.

---

## 5–7. Proposed schemas (for the approved migration, not now)

### 5. Shift assignment
```
create type shift_t as enum ('morning','afternoon','both');
create table manager_shifts (
  program_id uuid references programs(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  shift      shift_t not null default 'both',
  primary key (program_id, profile_id)
);
```
Morning/Afternoon Manager = same role + `shift` value; identical
authority. `both` when needed.

### 6. Assistant Supervisor session assignment
```
create type assistant_kind as enum ('group_assistant','station_assistant');
-- session-level, because an assistant may differ per session:
create table session_assistant_assignments (
  session_id uuid references sessions(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  kind       assistant_kind not null,
  station_id uuid references stations(id) on delete set null, -- for station_assistant
  primary key (session_id, profile_id)
);
```
One global `assistant_supervisor` role retained; assignment is data,
not a second role — matches the directive ("Do not create two
permanent Assistant Supervisor roles unless the permission audit proves
their access requirements are materially different"). Permission audit
verdict: **materially the same** read/write surface (attendance assist,
station notes) → keep one role.

### 7. Age divisions
```
create type division_t as enum ('younger','teen');
alter table groups add column division division_t;
-- OR a divisions table if divisions need their own metadata/staff.
```
Recommendation: start with a `groups.division` column (younger/teen);
promote to a `divisions` table only if divisions gain their own
supervisor/schedule. Keep `groups.color` unique-ish per division via a
soft warning, not a constraint.

### Group size (soft warning)
Directive: warn > ~14, never block. Implement as a UI/analytics warning
computed from active enrollment count vs a constant
`RECOMMENDED_GROUP_SIZE = 14`. **No DB constraint.** Current code has no
hard cap on group assignment (roster add just sets `group_id`), so this
is additive only.

---

## 8. Effect on report approvals

Current chain (`reports/actions.ts` `NEXT_STAGE`):
```
draft → submitted_manager      (by group_supervisor)
submitted_manager → submitted_supervisor   (by program_manager)
submitted_supervisor → submitted_executive (by program_supervisor)
submitted_executive → approved (by executive)
```
This 4-step chain assumes the legacy trio as distinct approvers. Under
the new model the middle two approvers both become **Manager**. Options:
- **8a (recommended):** collapse to 3 stages —
  `draft → submitted_manager (group_supervisor) → submitted_executive
  (manager) → approved (executive/founder)`. Fewer hops matches the new
  flatter hierarchy. Requires a `report_stage` enum addition only if new
  stage names are introduced; can reuse existing stages by treating
  `submitted_supervisor` as skipped.
- **8b:** keep 4 stages, map both middle transitions to `manager`.
  Zero enum change; `NEXT_STAGE` role values become `manager` for both.

Deferred to migration; **[WAIT-MIGRATION]**. Report *content* and RLS
(`is_group_staff`) are unaffected.

## 9. Effect on program / group / session staffing
- `program_staff` / `group_staff` membership model is unchanged and
  already role-string-agnostic in RLS. New roles slot in as membership
  rows. **Low risk.**
- Manager shift assignment is *new* data (`manager_shifts`), additive.
- Group requires: name, color, Group Supervisor, optional assistants,
  roster, schedule — all exist except **division** (new) and the
  **soft size warning** (new, additive).

## 10. Effect on analytics / dashboards
- Analytics aggregates by attendance/quotient/feedback — role-agnostic.
  Adds: shift filter (manager), division comparison, group-size warning
  surfacing. Additive; **[WAIT-MIGRATION]** for shift/division cuts.
- Supervisor home already has pending-action widgets (missing phone,
  next event). Manager home should gain shift-scoped "my groups today".

## 11. Effect on chat / safeguarding
- Two-adult rule (`createDmAction` auto-CC + `is_staff_student`) is
  preserved and must remain. **[NEW constraint to enforce]:** the
  directive forbids unrestricted adult↔student private messaging and
  exposure of student personal phone/socials/off-platform contact.
  - Verified: students have **no phone/social columns** — `students`
    stores `full_name_*`, `dob`, `age_grp`, medical, emergency
    contacts, photo_consent. Emergency contacts are the *parents'*
    contacts, not the student's. So there is no student personal phone
    to leak today. **[FIX-NOW audit item]:** confirm no UI renders a
    student contact and that `ParentContact` is only ever fed *parent*
    data (it is — roster/attendance/pickup pass parent fields).
  - **[WAIT-MIGRATION / policy]:** consider gating staff↔student DM
    creation behind management approval, and making group chat the only
    student-visible channel. Current `createDmAction` already requires
    staff + two-adult CC; tightening to "manager-approved only" is a
    policy addition.
- Group Supervisor ↔ parent communication via approved channels
  (group/program chat + consented photos) is already the model. No
  change needed beyond keeping parent write-lock (`parents_can_post`).

## 12. Forward-only migration & rollback plan
1. **M-a (enum add, standalone):** `alter type app_role add value if
   not exists 'founder'; …'manager';` — own migration, committed alone
   (enum values can't be used in the same tx they're added).
2. **M-b (helpers + staffing/shift/division/assignment tables +
   size-warning constant):** `is_founder()`, broaden `is_executive()`
   to include founder (or add `is_management()` and repoint policies),
   `manager_shifts`, `groups.division`, `session_assistant_assignments`.
3. **M-c (report chain):** repoint `NEXT_STAGE` + any stage enum.
4. **App:** centralize role gates (`lib/roles.ts`), extend
   `effectiveRole` (trio + `manager` → `manager`; `founder` distinct),
   `ROLE_LABELS`, `AppRole` union, nav, seed (+founder, remap planner
   trio → manager).
Rollback: because every step is additive and legacy enum values are
retained, rollback = revert the app commits; the added enum values and
tables are inert if unused. No `drop type`, no data loss. Old accounts
keep working throughout (compat aliases).

## 13. Tests to prove no unintended access
Extend the psql RLS probe harness (already used in Phase 1) with:
- Founder: full read/write parity with Executive (positive) + can do
  everything Executive can.
- Manager: can plan/publish/staff within assigned program; **cannot**
  read another program's students/payments (negative).
- Manager shift scoping (once enforced): morning manager sees morning
  groups; not a hard security boundary but an operational filter —
  test as filter, not RLS.
- Assistant (group vs station assignment): identical table access
  (proves single-role decision); station assignment grants no extra
  read.
- Group Supervisor: **cannot** read any student personal contact
  (there is none) and cannot create an unrestricted 1:1 student DM
  (two-adult CC always present).
- Parent/Student: unchanged negatives from Phase 1 harness still pass.
- Legacy accounts (`program_supervisor`/`program_manager`) continue to
  resolve to management power via compat path.

---

## Verdict / sequencing

- The enum change is **low-risk at the DB layer** (RLS is membership-
  driven, not role-string-driven) but **touches 15 app files** whose
  gate arrays are already inconsistent.
- **Do first, model-independent [FIX-NOW]:** centralize the role gates
  and repair the `program_planner`-omission bug (latent auth defect).
- **Defer to approved migration [WAIT-MIGRATION]:** enum add, Founder,
  Manager, shifts, divisions, assistant assignments, report-chain
  collapse, group-size warning surfacing.
- Phase 2 proceeds now against the **current** architecture, tagging
  observations with the legend above.
