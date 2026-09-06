-- Coach verification audit + scouting report access log.
--
-- `verified_coach` unlocks a minor's cell, email, GPA and test scores. Until now it was
-- granted two ways that looked identical in the data: auto-approved on a .edu address, or
-- confirmed by a human against the program's public staff directory. 33 of 36 came through
-- the automatic path and recorded nothing, so "how do we know these people are coaches?"
-- had no answer the database could give.
--
-- These columns make the difference legible, so the portable scouting report — which leaves
-- the platform the moment it is saved — can require the human-confirmed grant.

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS verified_method text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS verified_source_url text;

COMMENT ON COLUMN user_profiles.verified_method IS
  'How verified_coach was granted: edu_auto (.edu address, no human) or staff_directory (confirmed against the program''s public roster).';
COMMENT ON COLUMN user_profiles.verified_source_url IS
  'The staff-directory page the coach was confirmed against. Makes annual re-verification a query rather than a project.';

-- Backfill what is already known: a recorded human check means staff_directory, otherwise
-- the .edu rule granted it.
UPDATE user_profiles
SET verified_method = CASE WHEN verified_by IS NOT NULL THEN 'staff_directory' ELSE 'edu_auto' END
WHERE verified_coach = true AND verified_method IS NULL;

-- Who pulled a report on whom. Coaches behave differently when their name is on it, and a
-- parent seeing "3 college coaches viewed this" reads the product as a service to them.
CREATE TABLE IF NOT EXISTS scouting_report_access (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id        uuid REFERENCES athletes(id) ON DELETE CASCADE,
  viewer_user_id    uuid,
  viewer_name       text,
  viewer_email      text,
  viewer_institution text,
  /* Which field set was released: "full" includes contact and academics. */
  access_tier       text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scouting_report_access_athlete_idx ON scouting_report_access (athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scouting_report_access_viewer_idx  ON scouting_report_access (viewer_user_id, created_at DESC);

ALTER TABLE scouting_report_access ENABLE ROW LEVEL SECURITY;
