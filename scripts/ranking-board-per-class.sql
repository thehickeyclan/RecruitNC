-- A board per recruiting class is its own list.
--
-- MatScouts publishes a Senior and a Junior girls Big Board on the same day. An edition was
-- identified by (source, gender, ranking_month, scope), which those two share exactly, so
-- importing the junior board would have deleted all 95 rows of the senior board - and
-- ranking_source_status, keyed on (source, gender, scope), would have reported one freshness
-- date for both.
--
-- rank_basis records what a rank counts within. The senior board carries each wrestler's rank
-- inside her weight class (the 155 lb seniors are 1,2,3,4,5,6,8,15,18 - the gaps are the juniors
-- ranked above them), so "#8" needs "at 155" to mean anything. The junior board is one list of
-- 90, where printing a weight beside the rank would instead invent a claim.
--
-- Run once in the Supabase SQL editor (safe to re-run).

ALTER TABLE national_rankings
  ADD COLUMN IF NOT EXISTS edition_class_year int NOT NULL DEFAULT 0;
ALTER TABLE national_rankings
  ADD COLUMN IF NOT EXISTS rank_basis text NOT NULL DEFAULT 'weight';
ALTER TABLE ranking_source_status
  ADD COLUMN IF NOT EXISTS edition_class_year int NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'national_rankings_rank_basis_check') THEN
    ALTER TABLE national_rankings
      ADD CONSTRAINT national_rankings_rank_basis_check CHECK (rank_basis IN ('weight', 'overall'));
  END IF;
END $$;

-- Every wrestler on a board is in the class it covers, so the rows name it.
UPDATE national_rankings SET edition_class_year = class_year
 WHERE scope = 'big_board' AND edition_class_year = 0 AND class_year IS NOT NULL;

-- rank_basis must agree with what the importer computes, or the next import changes it. The
-- column default assumed every board ranked within weight; MatScouts' boys board is one list of
-- 200 with no weights at all, so the rule is applied per edition rather than per scope.
UPDATE national_rankings SET rank_basis = 'overall'
 WHERE scope = 'p4p' AND rank_basis <> 'overall';

WITH e AS (
  SELECT source, gender, ranking_month, scope, edition_class_year,
         CASE WHEN count(*) = count(DISTINCT rank) THEN 'overall' ELSE 'weight' END AS basis
    FROM national_rankings
   WHERE scope = 'big_board'
   GROUP BY 1, 2, 3, 4, 5
)
UPDATE national_rankings r SET rank_basis = e.basis
  FROM e
 WHERE r.scope = 'big_board'
   AND r.source = e.source AND r.gender = e.gender AND r.ranking_month = e.ranking_month
   AND r.scope = e.scope AND r.edition_class_year = e.edition_class_year
   AND r.rank_basis <> e.basis;

UPDATE ranking_source_status s SET edition_class_year = b.cy
  FROM (SELECT source, gender, scope, max(edition_class_year) AS cy
          FROM national_rankings WHERE scope = 'big_board' GROUP BY 1, 2, 3) b
 WHERE s.source = b.source AND s.gender = b.gender AND s.scope = b.scope
   AND s.scope = 'big_board' AND s.edition_class_year = 0;

-- The old keys are what made two boards one edition.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'national_rankings'::regclass AND contype = 'u'
       AND conname <> 'national_rankings_edition_row_key_v2'
  LOOP EXECUTE format('ALTER TABLE national_rankings DROP CONSTRAINT %I', c); END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'national_rankings_edition_row_key_v2') THEN
    ALTER TABLE national_rankings ADD CONSTRAINT national_rankings_edition_row_key_v2
      UNIQUE (source, gender, ranking_month, scope, edition_class_year, athlete_name, weight_class);
  END IF;
END $$;

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'ranking_source_status'::regclass AND contype = 'u'
       AND conname <> 'ranking_source_status_list_key'
  LOOP EXECUTE format('ALTER TABLE ranking_source_status DROP CONSTRAINT %I', c); END LOOP;

  -- A unique index with no constraint behind it would block the second board just as well.
  FOR c IN
    SELECT indexname FROM pg_indexes
     WHERE tablename = 'ranking_source_status' AND indexdef LIKE 'CREATE UNIQUE%'
       AND indexname <> 'ranking_source_status_list_key'
       AND indexname NOT IN (SELECT conname FROM pg_constraint WHERE conrelid = 'ranking_source_status'::regclass)
  LOOP EXECUTE format('DROP INDEX %I', c); END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ranking_source_status_list_key') THEN
    ALTER TABLE ranking_source_status ADD CONSTRAINT ranking_source_status_list_key
      UNIQUE (source, gender, scope, edition_class_year);
  END IF;
END $$;
