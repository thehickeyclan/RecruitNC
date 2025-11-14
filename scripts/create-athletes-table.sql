-- Create athletes table if it doesn't exist
CREATE TABLE IF NOT EXISTS athletes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  highschool TEXT NOT NULL,
  college TEXT NOT NULL,
  division TEXT DEFAULT 'NCAA DI',
  weightclass TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  commitment_date DATE NOT NULL,
  photo_url TEXT,
  achievements TEXT[], -- Array of achievement strings
  bio TEXT,
  wrestling_club TEXT,
  location TEXT,
  career_record TEXT,
  contact_email TEXT,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_athletes_featured ON athletes(featured);
CREATE INDEX IF NOT EXISTS idx_athletes_graduation_year ON athletes(graduation_year);
CREATE INDEX IF NOT EXISTS idx_athletes_commitment_date ON athletes(commitment_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_athletes_updated_at 
    BEFORE UPDATE ON athletes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
