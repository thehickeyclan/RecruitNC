-- Create wrestling achievements cache table
CREATE TABLE IF NOT EXISTS wrestling_achievements_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_name TEXT NOT NULL,
  achievement_title TEXT NOT NULL,
  achievement_type TEXT NOT NULL, -- 'state_champion', 'state_placer', 'all_american', 'national_champion'
  year INTEGER NOT NULL,
  placement INTEGER,
  weight_class TEXT,
  classification TEXT, -- For NCHSAA (3A, 2A, etc)
  division TEXT, -- For NHSCA
  source_table TEXT NOT NULL, -- 'nchsaa' or 'nhsca'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_wrestling_cache_athlete_name ON wrestling_achievements_cache(athlete_name);
CREATE INDEX IF NOT EXISTS idx_wrestling_cache_year ON wrestling_achievements_cache(year);
CREATE INDEX IF NOT EXISTS idx_wrestling_cache_type ON wrestling_achievements_cache(achievement_type);
