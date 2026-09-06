-- National rankings from outside outlets — the only path to a 5-star rating.
--
-- Five stars is not ours to award on results alone. It means an independent national outlet
-- ranks the wrestler, which is a claim we can point at rather than defend. Matt supplies
-- FloWrestling, Sports Illustrated and MatScouts monthly.
--
-- Three months are retained and older editions are deleted. A ranking is a current statement
-- about a wrestler; a two-year-old one says nothing about who they are now, and keeping an
-- archive of stale placements on minors earns nothing.

CREATE TABLE IF NOT EXISTS national_rankings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /* 'flowrestling' | 'sports_illustrated' | 'matscouts' */
  source         text NOT NULL,
  /* First of the month the edition was published — the retention key. */
  ranking_month  date NOT NULL,
  athlete_id     uuid REFERENCES athletes(id) ON DELETE CASCADE,
  athlete_name   text NOT NULL,
  rank           integer NOT NULL,
  /* 'weight' (ranked at a weight), 'class' (ranked in a grad year), 'pound_for_pound'. */
  scope          text NOT NULL DEFAULT 'weight',
  weight_class   text,
  class_year     integer,
  high_school    text,
  state          text,
  source_url     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, ranking_month, scope, athlete_name, weight_class)
);

CREATE INDEX IF NOT EXISTS national_rankings_athlete_idx ON national_rankings (athlete_id, ranking_month DESC);
CREATE INDEX IF NOT EXISTS national_rankings_month_idx   ON national_rankings (ranking_month DESC);
CREATE INDEX IF NOT EXISTS national_rankings_name_idx    ON national_rankings (lower(athlete_name));

COMMENT ON TABLE national_rankings IS
  'National rankings from FloWrestling / Sports Illustrated / MatScouts. Three months retained, older editions deleted. Gates the 5-star rating.';

ALTER TABLE national_rankings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS national_rankings_public_read ON national_rankings;
CREATE POLICY national_rankings_public_read ON national_rankings
  FOR SELECT TO anon, authenticated USING (true);

-- Retention: keep the three most recent editions, drop the rest. Called after each import
-- so the window enforces itself rather than depending on somebody remembering.
CREATE OR REPLACE FUNCTION prune_national_rankings() RETURNS integer AS $$
DECLARE
  removed integer;
BEGIN
  WITH keep AS (
    SELECT DISTINCT ranking_month
    FROM national_rankings
    ORDER BY ranking_month DESC
    LIMIT 3
  )
  DELETE FROM national_rankings
  WHERE ranking_month NOT IN (SELECT ranking_month FROM keep);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$ LANGUAGE plpgsql;
