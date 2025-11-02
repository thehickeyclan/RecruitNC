-- Drop the table if it exists to start fresh
DROP TABLE IF EXISTS college_division_mappings CASCADE;

-- Create the college_division_mappings table
CREATE TABLE college_division_mappings (
    id SERIAL PRIMARY KEY,
    college_name TEXT NOT NULL UNIQUE,
    division TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_college_division_mappings_college_name ON college_division_mappings(college_name);

-- Insert initial data
INSERT INTO college_division_mappings (college_name, division) VALUES
('Roanoke College', 'Division III'),
('UNC Chapel Hill', 'Division I'),
('NC State', 'Division I'),
('Duke', 'Division I'),
('Appalachian State', 'Division I'),
('Campbell', 'Division I'),
('Davidson', 'Division I'),
('Elon', 'Division I'),
('Gardner-Webb', 'Division I'),
('High Point', 'Division I'),
('UNC Pembroke', 'Division II'),
('Mount Olive', 'Division II'),
('Belmont Abbey', 'Division II'),
('Queens University', 'Division II'),
('Barton', 'Division II'),
('Catawba', 'Division II'),
('Lenoir-Rhyne', 'Division II'),
('Mars Hill', 'Division II'),
('Wingate', 'Division II'),
('Greensboro College', 'Division III'),
('Guilford College', 'Division III'),
('Methodist', 'Division III'),
('North Carolina Wesleyan', 'Division III'),
('Montreat College', 'NAIA'),
('St. Andrews University', 'NAIA'),
('Wake Tech', 'NJCAA'),
('Louisburg College', 'NJCAA')
ON CONFLICT (college_name) DO UPDATE SET
    division = EXCLUDED.division,
    updated_at = NOW();

-- Verify the data was inserted
SELECT * FROM college_division_mappings ORDER BY college_name;
