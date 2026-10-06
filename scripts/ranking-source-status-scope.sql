-- Freshness is recorded per list type, not per source.
--
-- ranking_source_status was keyed on (source, gender), which assumed every outlet publishes one
-- list per gender. MatScouts publishes a girls recruiting-class Big Board and no girls weight
-- list, so the board rode along with a weight row that never existed: its published date was never
-- stamped, and a board posted that morning reported as "no new edition in ever".
--
-- One row per (source, gender, scope) lets each list answer for itself.
-- Run once in the Supabase SQL editor (safe to re-run).

ALTER TABLE ranking_source_status
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'weight';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ranking_source_status_scope_check') THEN
    ALTER TABLE ranking_source_status
      ADD CONSTRAINT ranking_source_status_scope_check CHECK (scope IN ('weight', 'p4p', 'big_board'));
  END IF;
END $$;

UPDATE ranking_source_status SET scope = 'weight' WHERE scope IS NULL OR scope = '';

-- Drop whatever unique key the table carried before (it ignored scope), then key on all three.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'ranking_source_status'::regclass
      AND contype = 'u'
      AND conname <> 'ranking_source_status_source_gender_scope_key'
  LOOP
    EXECUTE format('ALTER TABLE ranking_source_status DROP CONSTRAINT %I', c);
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ranking_source_status_source_gender_scope_key') THEN
    ALTER TABLE ranking_source_status
      ADD CONSTRAINT ranking_source_status_source_gender_scope_key UNIQUE (source, gender, scope);
  END IF;
END $$;

-- A status row for a list an outlet does not publish is a permanent false staleness alert.
DELETE FROM ranking_source_status
WHERE source = 'matscouts' AND gender = 'F' AND scope = 'weight' AND published IS NULL;
