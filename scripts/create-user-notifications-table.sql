-- Run in Supabase SQL Editor.
-- In-app notifications (e.g. "You were added to [group]"). Bell icon in navbar shows list; mobile app can use same table for push later.

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read_created ON user_notifications(user_id, read_at, created_at DESC);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Idempotent: drop first so re-running this script does not error
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications (mark read)" ON user_notifications;

CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications (mark read)"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_notifications IS 'In-app notifications (bell). Backend inserts via service role; RLS lets users read/update own.';
