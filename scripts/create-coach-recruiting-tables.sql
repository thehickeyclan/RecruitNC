-- Create college_coach_stars table (standalone, no foreign key dependencies)
CREATE TABLE IF NOT EXISTS college_coach_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id UUID,
  athlete_id UUID,
  notes TEXT,
  interest_level TEXT,
  pipeline_stage TEXT,
  starred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted TIMESTAMP WITH TIME ZONE,
  athlete_instagram TEXT,
  athlete_email TEXT,
  athlete_cell TEXT,
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_college_coach_stars_coach ON college_coach_stars(coach_user_id);
CREATE INDEX IF NOT EXISTS idx_college_coach_stars_athlete ON college_coach_stars(athlete_id);
CREATE INDEX IF NOT EXISTS idx_college_coach_stars_pipeline ON college_coach_stars(pipeline_stage);

-- Enable RLS
ALTER TABLE college_coach_stars ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can view their own stars" ON college_coach_stars;
DROP POLICY IF EXISTS "Coaches can insert their own stars" ON college_coach_stars;
DROP POLICY IF EXISTS "Coaches can update their own stars" ON college_coach_stars;
DROP POLICY IF EXISTS "Coaches can delete their own stars" ON college_coach_stars;

-- RLS Policies for college_coach_stars
CREATE POLICY "Coaches can view their own stars"
  ON college_coach_stars FOR SELECT
  USING (auth.uid() = coach_user_id);

CREATE POLICY "Coaches can insert their own stars"
  ON college_coach_stars FOR INSERT
  WITH CHECK (auth.uid() = coach_user_id);

CREATE POLICY "Coaches can update their own stars"
  ON college_coach_stars FOR UPDATE
  USING (auth.uid() = coach_user_id);

CREATE POLICY "Coaches can delete their own stars"
  ON college_coach_stars FOR DELETE
  USING (auth.uid() = coach_user_id);
