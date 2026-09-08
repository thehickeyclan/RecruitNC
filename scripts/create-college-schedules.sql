-- College wrestling schedules for the calendar's team filter.
--
-- Deliberately NOT rows in `events`. That table is built to answer "can my kid go, and how do I
-- sign them up" — entry_fee, max_participants, registration_deadline, max_drop_ins, rsvp_required.
-- A college dual answers "when do I watch", and every one of those columns would be null on it.
-- Keeping them apart also keeps the day-before push reminders, which fire on every calendar event,
-- from waking families up about duals nobody registered for.
--
-- Hidden by default. Nothing here reaches the calendar until a user picks a team from the filter.

CREATE TABLE IF NOT EXISTS college_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The programs already on file for the commitments flow; the filter dropdown is a query on this.
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,

  -- "2026-27". Kept as text because that is how everyone says it, and it lets a whole season be
  -- replaced in one statement when a schedule is reissued.
  season TEXT NOT NULL,

  event_date DATE NOT NULL,
  -- Null when a start time has not been announced, which is most of them until the week before.
  start_time TIME,

  -- 'dual' is one team; 'tournament' is an open or an invitational; 'multi' is a tri or a quad.
  event_type TEXT NOT NULL DEFAULT 'dual' CHECK (event_type IN ('dual', 'tournament', 'multi')),

  -- For a dual: who they wrestle. For a tournament: null, and event_name carries it.
  opponent TEXT,
  -- Set only when the opponent is itself an NC program, so a Duke-NC State dual can appear on both
  -- teams' schedules from one row's worth of truth.
  opponent_college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,

  -- "Southern Conference Championships", "Wolfpack Open".
  event_name TEXT,

  home_away TEXT NOT NULL DEFAULT 'home' CHECK (home_away IN ('home', 'away', 'neutral')),
  location TEXT,

  -- ACCN, FloWrestling, ESPN+. A watch link is the whole point of following a team.
  stream_url TEXT,
  notes TEXT,

  -- Schedules move. A cancelled meet stays on the row so the calendar can say so rather than
  -- silently dropping a date somebody planned around.
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'postponed', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The only query the calendar makes: one team, in date order.
CREATE INDEX IF NOT EXISTS idx_college_schedules_team_date ON college_schedules(college_id, event_date);
CREATE INDEX IF NOT EXISTS idx_college_schedules_season ON college_schedules(season);
CREATE INDEX IF NOT EXISTS idx_college_schedules_date ON college_schedules(event_date);

-- One row per team per date per opponent: re-running an import must not double a schedule.
CREATE UNIQUE INDEX IF NOT EXISTS uq_college_schedules_row
  ON college_schedules(college_id, event_date, COALESCE(opponent, ''), COALESCE(event_name, ''));

ALTER TABLE college_schedules ENABLE ROW LEVEL SECURITY;

-- A published schedule is public information; there is nothing private on this table.
DROP POLICY IF EXISTS "college schedules are public" ON college_schedules;
CREATE POLICY "college schedules are public" ON college_schedules
  FOR SELECT USING (true);

-- Writes go through the service role from the admin import, never from a browser.
DROP POLICY IF EXISTS "college schedules are admin write" ON college_schedules;
CREATE POLICY "college schedules are admin write" ON college_schedules
  FOR ALL TO service_role USING (true) WITH CHECK (true);
