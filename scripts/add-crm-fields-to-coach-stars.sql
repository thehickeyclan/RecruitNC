-- Add parent contact fields and other CRM data to college_coach_stars table
ALTER TABLE college_coach_stars
ADD COLUMN IF NOT EXISTS parent_name TEXT,
ADD COLUMN IF NOT EXISTS parent_phone TEXT,
ADD COLUMN IF NOT EXISTS parent_email TEXT,
ADD COLUMN IF NOT EXISTS athlete_cell TEXT,
ADD COLUMN IF NOT EXISTS athlete_email TEXT,
ADD COLUMN IF NOT EXISTS athlete_instagram TEXT;

-- Create recruiting_actions table for tracking all interactions
CREATE TABLE IF NOT EXISTS recruiting_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('call', 'text', 'email', 'visit', 'event', 'note', 'other')),
  action_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL,
  outcome TEXT,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_recruiting_actions_coach ON recruiting_actions(coach_user_id);
CREATE INDEX IF NOT EXISTS idx_recruiting_actions_athlete ON recruiting_actions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_recruiting_actions_date ON recruiting_actions(action_date DESC);

COMMENT ON TABLE recruiting_actions IS 'Tracks all recruiting interactions and actions taken by coaches';
COMMENT ON COLUMN recruiting_actions.action_type IS 'Type of interaction: call, text, email, visit, event, note, other';
COMMENT ON COLUMN recruiting_actions.follow_up_date IS 'Optional date for follow-up reminder';
