-- Create or update the colleges table to include athlete count
CREATE TABLE IF NOT EXISTS colleges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  location VARCHAR(255),
  division VARCHAR(50),
  conference VARCHAR(255),
  logo_url VARCHAR(255),
  athlete_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create or update the high_schools table to include athlete count
CREATE TABLE IF NOT EXISTS high_schools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  location VARCHAR(255),
  conference VARCHAR(255),
  logo_url VARCHAR(255),
  athlete_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create or update the wrestling_clubs table to include athlete count
CREATE TABLE IF NOT EXISTS wrestling_clubs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  location VARCHAR(255),
  logo_url VARCHAR(255),
  athlete_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for AI-generated insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- 'trend', 'recognition', or 'shoutout'
  text TEXT NOT NULL,
  filters JSONB, -- Store filters as JSON (e.g., {"gender": "female", "division": "D1"})
  icon VARCHAR(50),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_athletes_graduationyear ON athletes(graduationyear);
CREATE INDEX IF NOT EXISTS idx_athletes_division ON athletes(division);
CREATE INDEX IF NOT EXISTS idx_athletes_gender ON athletes(gender);
CREATE INDEX IF NOT EXISTS idx_athletes_team_affiliation ON athletes(team_affiliation);
CREATE INDEX IF NOT EXISTS idx_athletes_commitmentdate ON athletes(commitmentdate);

-- Create a function to update athlete counts
CREATE OR REPLACE FUNCTION update_entity_athlete_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update college athlete count
  IF NEW.college IS NOT NULL AND NEW.college <> '' THEN
    INSERT INTO colleges (name, athlete_count)
    VALUES (NEW.college, 1)
    ON CONFLICT (name)
    DO UPDATE SET athlete_count = (
      SELECT COUNT(*) FROM athletes WHERE college = NEW.college
    );
  END IF;
  
  -- Update high school athlete count
  IF NEW.highschool IS NOT NULL AND NEW.highschool <> '' THEN
    INSERT INTO high_schools (name, athlete_count)
    VALUES (NEW.highschool, 1)
    ON CONFLICT (name)
    DO UPDATE SET athlete_count = (
      SELECT COUNT(*) FROM athletes WHERE highschool = NEW.highschool
    );
  END IF;
  
  -- Update wrestling club athlete count
  IF NEW.wrestlingclub IS NOT NULL AND NEW.wrestlingclub <> '' THEN
    INSERT INTO wrestling_clubs (name, athlete_count)
    VALUES (NEW.wrestlingclub, 1)
    ON CONFLICT (name)
    DO UPDATE SET athlete_count = (
      SELECT COUNT(*) FROM athletes WHERE wrestlingclub = NEW.wrestlingclub
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update athlete counts
DROP TRIGGER IF EXISTS update_athlete_counts_trigger ON athletes;
CREATE TRIGGER update_athlete_counts_trigger
AFTER INSERT OR UPDATE ON athletes
FOR EACH ROW
EXECUTE FUNCTION update_entity_athlete_count();
