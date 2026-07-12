-- ════════════════════════════════════════════════════════════════
--  0019_age_groups_add.sql — the program has exactly three age groups.
--
--  Definitive age groups (per program leadership):
--    children — أطفال بين ٥–٦ سنوات   / Children 5–6
--    boys     — للأولاد بين ٧–١٣ سنة  / Boys 7–13
--    youth    — للشباب بين ١٤–١٧ سنة  / Youth 14–17
--
--  The prior four kid bands (baraem 5–6, nashia 7–9, fityan 10–14,
--  shabab 15–18) and the legacy university/parents values do not map
--  1:1 onto the new ranges, so we ADD three self-documenting values
--  rather than relabel. Forward-only: no enum value is removed — old
--  values stay valid so historical rows still render, but only the
--  three new ones are ever selectable (enforced in the app + 0020
--  retires the rest from pickers).
--
--  ALTER TYPE ... ADD VALUE cannot be used in the same transaction
--  that references the new value, so the data remap lives in 0020.
-- ════════════════════════════════════════════════════════════════

alter type age_group add value if not exists 'children';
alter type age_group add value if not exists 'boys';
alter type age_group add value if not exists 'youth';
