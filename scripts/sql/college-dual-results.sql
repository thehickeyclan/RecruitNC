-- Dual meet results on the college calendar, and the record of which ones followers were told.
--
-- The importer already read W/L and both team scores off every Sidearm page and dropped them on
-- the floor. These columns keep them.
ALTER TABLE college_schedules ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('W', 'L'));
ALTER TABLE college_schedules ADD COLUMN IF NOT EXISTS team_score NUMERIC;
ALTER TABLE college_schedules ADD COLUMN IF NOT EXISTS opponent_score NUMERIC;

-- Keyed on the meet itself, not the schedule row id: the importer replaces a school's whole season
-- every run, so row ids change daily and a marker on the row would be gone by the next import.
CREATE TABLE IF NOT EXISTS push_sent_college_results (
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  opponent TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (college_id, event_date, opponent)
);

ALTER TABLE push_sent_college_results ENABLE ROW LEVEL SECURITY;
