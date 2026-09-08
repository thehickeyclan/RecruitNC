-- Following a college team: one action that both filters the calendar and turns on its alerts.
--
-- Deliberately device-scoped, not account-scoped. `push_devices` is anonymous and keyed on the
-- Expo token, which is what let push work without a login — a follow should not be the thing that
-- suddenly demands a sign-up. A `user_id` can be added later for web follows without moving this.
--
-- This is why college alerts can default ON where blanket practice reminders default OFF: a
-- follow is an explicit choice of one team, so the alerts are only ever about something the user
-- asked for. `alert_events` fires for every event on the calendar, which is why it ships off.

CREATE TABLE IF NOT EXISTS college_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_college_follows_college ON college_follows(college_id);
CREATE INDEX IF NOT EXISTS idx_college_follows_device ON college_follows(device_id);

-- A sixth alert category, so college reminders toggle separately from practice reminders.
ALTER TABLE push_devices ADD COLUMN IF NOT EXISTS alert_college BOOLEAN NOT NULL DEFAULT true;

/*
 * Keyed on the team as well as the meet, not the meet alone.
 *
 * `push_sent_events` is keyed on the event because those go to everybody at once. A college
 * reminder goes only to one team's followers, and a Duke-NC State dual has to reach both
 * fanbases — two different audiences, one row in `college_schedules`. Keyed on the meet alone,
 * the second fanbase would be silently skipped.
 */
CREATE TABLE IF NOT EXISTS push_sent_college_events (
  schedule_id UUID NOT NULL REFERENCES college_schedules(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (schedule_id, college_id)
);

ALTER TABLE college_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_sent_college_events ENABLE ROW LEVEL SECURITY;

-- Follows are written by the app through the web API on the service role, same as push_devices.
DROP POLICY IF EXISTS "college follows are service write" ON college_follows;
CREATE POLICY "college follows are service write" ON college_follows
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sent college events are service write" ON push_sent_college_events;
CREATE POLICY "sent college events are service write" ON push_sent_college_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
