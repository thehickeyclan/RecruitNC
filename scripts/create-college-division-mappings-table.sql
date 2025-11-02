-- Create the college division mappings table
CREATE TABLE IF NOT EXISTS college_division_mappings (
  id SERIAL PRIMARY KEY,
  college_name TEXT NOT NULL UNIQUE,
  division TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_college_division_mappings_college_name 
ON college_division_mappings(college_name);

-- Insert some initial data
INSERT INTO college_division_mappings (college_name, division)
VALUES
  ('UNC Chapel Hill', 'Division I'),
  ('NC State', 'Division I'),
  ('Duke', 'Division I'),
  ('UNC Pembroke', 'Division II'),
  ('Mount Olive', 'Division II'),
  ('Belmont Abbey', 'Division II'),
  ('Greensboro College', 'Division III'),
  ('Guilford College', 'Division III'),
  ('Montreat College', 'NAIA'),
  ('St. Andrews University', 'NAIA'),
  ('Wake Tech', 'NJCAA'),
  ('Louisburg College', 'NJCAA')
ON CONFLICT (college_name) DO NOTHING;
