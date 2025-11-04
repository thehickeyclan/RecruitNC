-- Setup Mount Olive University in the NC Wrestling United Portal
-- School: Mount Olive University (UMO)
-- Division: NCAA Division II
-- Location: North Carolina
-- Brand Colors: Green and White

-- Step 1: Insert Mount Olive University into schools table
INSERT INTO schools (name)
VALUES ('Mount Olive University')
ON CONFLICT (name) DO NOTHING;

-- Step 2a: Add logo mapping for "Mount Olive University" (full name)
INSERT INTO logo_mappings (
  entity_name,
  entity_type,
  logo_url,
  division,
  aliases,
  created_at,
  updated_at
)
VALUES (
  'Mount Olive University',
  'college',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/cwjgktar-1745958885613.png',
  'NCAA Division II',
  '{"UMO", "Mount Olive", "University of Mount Olive", "Trojans"}',
  NOW(),
  NOW()
)
ON CONFLICT (entity_name, entity_type) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  division = EXCLUDED.division,
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Step 2b: Add logo mapping for "UMO" (common abbreviation)
INSERT INTO logo_mappings (
  entity_name,
  entity_type,
  logo_url,
  division,
  aliases,
  created_at,
  updated_at
)
VALUES (
  'UMO',
  'college',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/cwjgktar-1745958885613.png',
  'NCAA Division II',
  '{"Mount Olive University", "Mount Olive", "University of Mount Olive", "Trojans"}',
  NOW(),
  NOW()
)
ON CONFLICT (entity_name, entity_type) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  division = EXCLUDED.division,
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Step 2c: Add logo mapping for "Mount Olive" (shortened version)
INSERT INTO logo_mappings (
  entity_name,
  entity_type,
  logo_url,
  division,
  aliases,
  created_at,
  updated_at
)
VALUES (
  'Mount Olive',
  'college',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/cwjgktar-1745958885613.png',
  'NCAA Division II',
  '{"Mount Olive University", "UMO", "University of Mount Olive", "Trojans"}',
  NOW(),
  NOW()
)
ON CONFLICT (entity_name, entity_type) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  division = EXCLUDED.division,
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Step 3: Update schools table with logo and brand colors
UPDATE schools
SET 
  logo_url = 'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/cwjgktar-1745958885613.png',
  primary_color = '#006341',  -- Green
  secondary_color = '#FFFFFF'  -- White
WHERE name = 'Mount Olive University';

-- Step 4: Verify the setup
SELECT 
  s.id,
  s.name,
  s.logo_url,
  s.primary_color,
  s.secondary_color
FROM schools s
WHERE name = 'Mount Olive University';

-- Step 5: Check logo mappings
SELECT 
  entity_name,
  entity_type,
  logo_url,
  division,
  aliases
FROM logo_mappings
WHERE entity_name IN ('Mount Olive University', 'UMO', 'Mount Olive')
  AND entity_type = 'college'
ORDER BY entity_name;

-- Step 6: Check if any athletes are already committed to Mount Olive/UMO
SELECT 
  id,
  name,
  graduationyear,
  college,
  recruiting_status
FROM athletes
WHERE college ILIKE '%mount olive%' OR college ILIKE '%UMO%'
ORDER BY graduationyear, name;

