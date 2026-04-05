-- Map NHSCA-style primary/secondary weights to nearest AAU Scholastic class for rows with AAU interest.
-- App logic (ties → lighter class): 145→144, 152→150, 160→157, 170→165, 182→175, 195→190, 220→215.
-- Run PREVIEW first; then the UPDATE. Adjust the WHERE clause if tournament_interest is text[] instead of jsonb.

-- ── PREVIEW (jsonb array, e.g. ["nhsca","aau"]) ─────────────────────────────
-- SELECT id, first_name, last_name, primary_weight, secondary_weight, tournament_interest
-- FROM national_team_interest_forms
-- WHERE EXISTS (
--   SELECT 1 FROM jsonb_array_elements_text(tournament_interest::jsonb) AS t(v) WHERE v = 'aau'
-- )
-- AND trim(primary_weight) IN ('145','152','160','170','182','195','220');

-- ── UPDATE (jsonb tournament_interest) ─────────────────────────────────────
UPDATE national_team_interest_forms AS n
SET
  primary_weight = CASE trim(both from n.primary_weight)
    WHEN '145' THEN '144'
    WHEN '152' THEN '150'
    WHEN '160' THEN '157'
    WHEN '170' THEN '165'
    WHEN '182' THEN '175'
    WHEN '195' THEN '190'
    WHEN '220' THEN '215'
    ELSE n.primary_weight
  END,
  secondary_weight = CASE
    WHEN n.secondary_weight IS NULL OR trim(both from n.secondary_weight) = '' THEN NULL
    ELSE CASE trim(both from n.secondary_weight)
      WHEN '145' THEN '144'
      WHEN '152' THEN '150'
      WHEN '160' THEN '157'
      WHEN '170' THEN '165'
      WHEN '182' THEN '175'
      WHEN '195' THEN '190'
      WHEN '220' THEN '215'
      ELSE n.secondary_weight
    END
  END,
  updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements_text(n.tournament_interest::jsonb) AS t(v) WHERE v = 'aau'
)
AND trim(n.primary_weight) IN ('145', '152', '160', '170', '182', '195', '220');

-- If secondary equals primary after map, clear secondary
UPDATE national_team_interest_forms
SET secondary_weight = NULL, updated_at = now()
WHERE primary_weight = secondary_weight
  AND secondary_weight IS NOT NULL;

-- ── Alternate WHERE if tournament_interest is text[] ───────────────────────
-- Replace the EXISTS clause with:
-- WHERE 'aau' = ANY(tournament_interest)
--   AND trim(primary_weight) IN ('145','152','160','170','182','195','220');
