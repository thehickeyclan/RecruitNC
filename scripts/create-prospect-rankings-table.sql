-- First, check if the table exists
CREATE TABLE IF NOT EXISTS prospect_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL,
  graduation_year INT NOT NULL,
  overall_rank INT NOT NULL,
  weight_class VARCHAR(255) NOT NULL,
  region VARCHAR(255),
  folkstyle_rank INT,
  freestyle_rank INT,
  greco_rank INT,
  ranking_notes TEXT,
  verified BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add foreign key constraint
  CONSTRAINT fk_athlete
    FOREIGN KEY(athlete_id)
    REFERENCES athletes(id)
    ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_prospect_rankings_graduation_year ON prospect_rankings(graduation_year);
CREATE INDEX IF NOT EXISTS idx_prospect_rankings_overall_rank ON prospect_rankings(overall_rank);
CREATE INDEX IF NOT EXISTS idx_prospect_rankings_athlete_id ON prospect_rankings(athlete_id);

-- Add additional fields to athletes table for prospect profiles
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS academic_info JSONB;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS physical_metrics JSONB;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS technical_assessment TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS tournament_history JSONB[];
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS verified_achievements BOOLEAN[] DEFAULT '{}';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS coach_endorsements JSONB[] DEFAULT '{}';
