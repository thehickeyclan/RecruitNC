-- NC United fundraising: playbook acknowledgment + activation requests
-- Run once in Supabase SQL Editor (RLS enabled for user-facing tables).

-- -----------------------------------------------------------------------------
-- Playbook acknowledgment (one row per user; app upserts onConflict user_id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fundraising_playbook_acks (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'members',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fundraising_playbook_acks IS 'User acknowledged fundraising playbook (members or public guide) before requesting activation.';

CREATE INDEX IF NOT EXISTS fundraising_playbook_acks_acknowledged_at_idx
  ON fundraising_playbook_acks (acknowledged_at DESC);

ALTER TABLE fundraising_playbook_acks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fundraising_playbook_acks_select_own ON fundraising_playbook_acks;
CREATE POLICY fundraising_playbook_acks_select_own
  ON fundraising_playbook_acks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fundraising_playbook_acks_insert_own ON fundraising_playbook_acks;
CREATE POLICY fundraising_playbook_acks_insert_own
  ON fundraising_playbook_acks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fundraising_playbook_acks_update_own ON fundraising_playbook_acks;
CREATE POLICY fundraising_playbook_acks_update_own
  ON fundraising_playbook_acks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Activation requests (families request wiring after playbook ack)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fundraising_activation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES athletes (id) ON DELETE SET NULL,
  fundraising_slug text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  admin_note text
);

COMMENT ON TABLE fundraising_activation_requests IS 'Family requests NC United staff to wire fundraising access after playbook acknowledgment.';

CREATE INDEX IF NOT EXISTS fundraising_activation_requests_user_slug_created_idx
  ON fundraising_activation_requests (user_id, fundraising_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS fundraising_activation_requests_pending_idx
  ON fundraising_activation_requests (created_at DESC)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS fundraising_activation_requests_one_pending_per_slug
  ON fundraising_activation_requests (user_id, fundraising_slug)
  WHERE status = 'pending';

ALTER TABLE fundraising_activation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fundraising_activation_requests_select_own ON fundraising_activation_requests;
CREATE POLICY fundraising_activation_requests_select_own
  ON fundraising_activation_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fundraising_activation_requests_insert_own ON fundraising_activation_requests;
CREATE POLICY fundraising_activation_requests_insert_own
  ON fundraising_activation_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin updates use service role (bypasses RLS).
