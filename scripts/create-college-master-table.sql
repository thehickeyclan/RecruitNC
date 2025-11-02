-- Create the master college table with aliases and divisions
CREATE TABLE IF NOT EXISTS college_master (
  id SERIAL PRIMARY KEY,
  canonical_name VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  division VARCHAR(50),
  state VARCHAR(100) DEFAULT 'North Carolina',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create college aliases table
CREATE TABLE IF NOT EXISTS college_aliases (
  id SERIAL PRIMARY KEY,
  college_master_id INTEGER REFERENCES college_master(id) ON DELETE CASCADE,
  alias_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_college_master_canonical ON college_master(canonical_name);
CREATE INDEX IF NOT EXISTS idx_college_aliases_name ON college_aliases(alias_name);
CREATE INDEX IF NOT EXISTS idx_college_aliases_master_id ON college_aliases(college_master_id);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE college_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_aliases ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on college_master" ON college_master FOR ALL USING (true);
CREATE POLICY "Allow all operations on college_aliases" ON college_aliases FOR ALL USING (true);

-- Insert initial data with proper aliases
INSERT INTO college_master (canonical_name, display_name, division) VALUES
  ('UNC Chapel Hill', 'UNC Chapel Hill', 'Division I'),
  ('NC State', 'NC State', 'Division I'),
  ('Duke', 'Duke University', 'Division I'),
  ('Appalachian State', 'Appalachian State', 'Division I'),
  ('UNC Pembroke', 'UNC Pembroke', 'Division II'),
  ('Mount Olive', 'Mount Olive University', 'Division II'),
  ('Belmont Abbey', 'Belmont Abbey College', 'Division II'),
  ('Greensboro College', 'Greensboro College', 'Division III'),
  ('Guilford College', 'Guilford College', 'Division III'),
  ('Montreat', 'Montreat College', 'NAIA'),
  ('St. Andrews', 'St. Andrews University', 'NAIA'),
  ('Wake Tech', 'Wake Technical Community College', 'NJCAA'),
  ('Louisburg College', 'Louisburg College', 'NJCAA')
ON CONFLICT (canonical_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  division = EXCLUDED.division,
  updated_at = NOW();

-- Insert aliases for UNC Chapel Hill
INSERT INTO college_aliases (college_master_id, alias_name)
SELECT id, unnest(ARRAY[
  'UNC',
  'University of North Carolina',
  'University of North Carolina at Chapel Hill',
  'University of North Carolina Chapel Hill',
  'UNC-Chapel Hill',
  'North Carolina'
]) FROM college_master WHERE canonical_name = 'UNC Chapel Hill'
ON CONFLICT DO NOTHING;

-- Insert aliases for NC State
INSERT INTO college_aliases (college_master_id, alias_name)
SELECT id, unnest(ARRAY[
  'North Carolina State',
  'North Carolina State University',
  'NC State University',
  'NCSU'
]) FROM college_master WHERE canonical_name = 'NC State'
ON CONFLICT DO NOTHING;

-- Insert aliases for Appalachian State
INSERT INTO college_aliases (college_master_id, alias_name)
SELECT id, unnest(ARRAY[
  'App State',
  'Appalachian',
  'Appalachian State University',
  'ASU'
]) FROM college_master WHERE canonical_name = 'Appalachian State'
ON CONFLICT DO NOTHING;

-- Insert aliases for UNC Pembroke
INSERT INTO college_aliases (college_master_id, alias_name)
SELECT id, unnest(ARRAY[
  'University of North Carolina at Pembroke',
  'UNC-Pembroke',
  'UNCP'
]) FROM college_master WHERE canonical_name = 'UNC Pembroke'
ON CONFLICT DO NOTHING;

-- Insert aliases for Montreat
INSERT INTO college_aliases (college_master_id, alias_name)
SELECT id, unnest(ARRAY[
  'Montreat College'
]) FROM college_master WHERE canonical_name = 'Montreat'
ON CONFLICT DO NOTHING;

-- Insert aliases for Mount Olive
INSERT INTO college_aliases (college_master_id, alias_name)
SELECT id, unnest(ARRAY[
  'Mount Olive University',
  'University of Mount Olive',
  'UMO'
]) FROM college_master WHERE canonical_name = 'Mount Olive'
ON CONFLICT DO NOTHING;

-- Insert aliases for Belmont Abbey
INSERT INTO college_aliases (college_master_id, alias_name)
SELECT id, unnest(ARRAY[
  'Belmont Abbey College'
]) FROM college_master WHERE canonical_name = 'Belmont Abbey'
ON CONFLICT DO NOTHING;
