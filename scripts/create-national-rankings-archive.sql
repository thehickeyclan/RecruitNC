-- Every edition of the SI / MatScouts / Flo national rankings, kept for good.
--
-- national_rankings holds the newest editions only: it answers "is this wrestler ranked now",
-- for profiles and the 5-star rule, and it stays that way. This archive answers a different
-- question - "was the opponent ranked on the day they wrestled" - so a December win over a
-- ranked senior still counts after he graduates and drops off the lists (Matt, 8 October 2026).
--
-- Private: no public read policy. These are past placements on minors; they are looked up by the
-- server when an opponent is judged, never shown as history on anyone's profile.

CREATE TABLE IF NOT EXISTS national_rankings_archive (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source             text NOT NULL,                 -- 'flowrestling' | 'sports_illustrated' | 'matscouts'
  gender             text NOT NULL,                 -- 'M' | 'F'
  published_on       date NOT NULL,                 -- the edition's own date; a bout uses the newest edition on or before it
  ranking_month      date NOT NULL,                 -- first of that month, as national_rankings keys it
  scope              text NOT NULL DEFAULT 'weight',-- 'weight' | 'p4p' | 'big_board'
  edition_class_year integer NOT NULL DEFAULT 0,    -- the class a big board covers; 0 for an all-class list
  rank_basis         text NOT NULL DEFAULT 'weight',
  rank               integer NOT NULL,
  athlete_name       text NOT NULL,
  athlete_id         uuid,                          -- our profile, when the import matched one (no FK: history outlives profiles)
  weight_class       text,
  class_year         integer,
  high_school        text,
  state              text,
  source_url         text,
  source_file        text NOT NULL DEFAULT 'live',  -- the backfill file an edition came from; 'live' for the monthly feed
  created_at         timestamptz NOT NULL DEFAULT now()
);
-- No unique key: an edition (source, gender, published_on, scope, edition_class_year, source_file)
-- is replaced whole on re-import. Flo published two different girls' lists on 27 July 2026.

CREATE INDEX IF NOT EXISTS national_rankings_archive_name_idx ON national_rankings_archive (lower(athlete_name), published_on DESC);
CREATE INDEX IF NOT EXISTS national_rankings_archive_edition_idx ON national_rankings_archive (source, gender, scope, published_on DESC);

COMMENT ON TABLE national_rankings_archive IS
  'Every SI / MatScouts / Flo edition, never pruned. Server-only: judges whether an opponent was ranked when they wrestled. Not shown on profiles.';

ALTER TABLE national_rankings_archive ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role reads or writes it.
