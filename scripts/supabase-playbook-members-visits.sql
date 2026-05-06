-- =============================================================================
-- NC United — gated playbook (/fundraising/playbook/members) visit log
-- Run in Supabase SQL Editor once.
-- =============================================================================

CREATE TABLE IF NOT EXISTS playbook_members_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now(),
  referrer text,
  user_name text,
  user_email text,
  user_role text
);

CREATE INDEX IF NOT EXISTS playbook_members_visits_user_id_idx
  ON playbook_members_visits (user_id);

CREATE INDEX IF NOT EXISTS playbook_members_visits_visited_at_idx
  ON playbook_members_visits (visited_at DESC);

ALTER TABLE playbook_members_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS playbook_members_visits_insert_own ON playbook_members_visits;
CREATE POLICY playbook_members_visits_insert_own
  ON playbook_members_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE playbook_members_visits IS 'Visit log for login-gated playbook at /fundraising/playbook/members';
