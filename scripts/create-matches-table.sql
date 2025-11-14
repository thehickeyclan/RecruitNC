-- Create matches table for wrestling match history
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wrestler_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  season TEXT NOT NULL,
  grade TEXT NOT NULL,
  high_school TEXT NOT NULL,
  
  -- Season summary
  total_matches INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  losses INTEGER NOT NULL,
  pins INTEGER NOT NULL,
  tech_falls INTEGER NOT NULL,
  decisions INTEGER NOT NULL,
  major_decisions INTEGER NOT NULL,
  forfeits_won INTEGER NOT NULL,
  pin_percentage DECIMAL(5,2) NOT NULL,
  tf_percentage DECIMAL(5,2) NOT NULL,
  finishing_percentage DECIMAL(5,2) NOT NULL,
  
  -- Individual matches stored as JSONB
  matches JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_matches_wrestler_id ON matches(wrestler_id);
CREATE INDEX IF NOT EXISTS idx_matches_name_season ON matches(first_name, last_name, season);
CREATE INDEX IF NOT EXISTS idx_matches_high_school ON matches(high_school);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);
CREATE INDEX IF NOT EXISTS idx_matches_grade ON matches(grade);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_matches_updated_at_trigger ON matches;
CREATE TRIGGER update_matches_updated_at_trigger
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_matches_updated_at();

-- Add some sample data for testing (optional)
-- INSERT INTO matches (wrestler_id, first_name, last_name, season, grade, high_school, total_matches, wins, losses, pins, tech_falls, decisions, major_decisions, forfeits_won, pin_percentage, tf_percentage, finishing_percentage, matches) 
-- VALUES ('Test_Wrestler_2021-22', 'Test', 'Wrestler', '2021-22', 'Freshman', 'Test High School', 1, 1, 0, 1, 0, 0, 0, 0, 100.0, 0.0, 100.0, '[{"date": "2021-11-20", "weight": 120, "opponent": "Test Opponent", "opponent_school": "Test School", "result": "Fall", "venue": "Test Tournament", "win_loss": "W", "opponent_percentage": "0.00%"}]'::jsonb);
