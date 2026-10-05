-- National rankings: boys and girls editions, and a freshness record per source.
-- Run once in the Supabase SQL editor (safe to re-run).

ALTER TABLE national_rankings
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'M';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'national_rankings_gender_check') THEN
    ALTER TABLE national_rankings ADD CONSTRAINT national_rankings_gender_check CHECK (gender IN ('M', 'F'));
  END IF;
END $$;

-- The old one-edition-row key ignored gender; a girls and a boys list share weights.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'national_rankings'::regclass AND contype = 'u' AND conname <> 'national_rankings_edition_row_key'
  LOOP
    EXECUTE format('ALTER TABLE national_rankings DROP CONSTRAINT %I', c);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'national_rankings_edition_row_key') THEN
    ALTER TABLE national_rankings
      ADD CONSTRAINT national_rankings_edition_row_key UNIQUE (source, gender, ranking_month, scope, athlete_name, weight_class);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS national_rankings_source_gender_month_idx
  ON national_rankings (source, gender, ranking_month DESC);

-- One row per source and gender: when it was last checked, and when a new edition last landed.
CREATE TABLE IF NOT EXISTS ranking_source_status (
  source          text NOT NULL,
  gender          text NOT NULL CHECK (gender IN ('M', 'F')),
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  published       date,
  edition_url     text,
  row_count       integer,
  nc_matched      integer,
  fingerprint     text,
  checked_by      text,
  PRIMARY KEY (source, gender)
);

ALTER TABLE ranking_source_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ranking_source_status_public_read ON ranking_source_status;
CREATE POLICY ranking_source_status_public_read ON ranking_source_status
  FOR SELECT TO anon, authenticated USING (true);
