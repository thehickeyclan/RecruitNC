-- Setup Montreat College in the NC Wrestling United Portal
-- School: Montreat College
-- Division: NAIA
-- Location: Buncombe County, North Carolina
-- Brand Colors: Blue and Gold

-- Step 1: Insert Montreat College into schools table (only name field)
INSERT INTO schools (name)
VALUES ('Montreat College')
ON CONFLICT (name) DO NOTHING;

-- Step 2a: Add logo mapping for "Montreat" (as it appears in athlete records)
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
  'Montreat',
  'college',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/QS-jExE_V4gnRb3SrkmUP-Montreat.png',
  'NAIA',
  '{"Montreat College", "Montreat University", "Mountaineers"}',
  NOW(),
  NOW()
)
ON CONFLICT (entity_name, entity_type) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  division = EXCLUDED.division,
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Step 2b: Also add logo mapping for "Montreat College" (full name)
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
  'Montreat College',
  'college',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/QS-jExE_V4gnRb3SrkmUP-Montreat.png',
  'NAIA',
  '{"Montreat", "Montreat University", "Mountaineers"}',
  NOW(),
  NOW()
)
ON CONFLICT (entity_name, entity_type) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  division = EXCLUDED.division,
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Step 3: Verify the setup
SELECT 
  s.id,
  s.name,
  lm.logo_url,
  lm.division,
  'Setup complete' as status
FROM schools s
LEFT JOIN logo_mappings lm ON lm.entity_name = s.name AND lm.entity_type = 'college'
WHERE s.name = 'Montreat College';

-- Step 4: Check if any athletes are already committed to Montreat
SELECT 
  id,
  name,
  graduationyear,
  college,
  recruiting_status
FROM athletes
WHERE college ILIKE '%Montreat%'
ORDER BY graduationyear;

-- Step 5: Instructions for creating the branded portal page
-- After running this script, create the portal page at:
-- app/recruiting-portal/montreat-college/page.tsx
-- Use the template from other school portals (lynchburg, etc.)
-- Brand colors: Blue (#0047AB or similar) and Gold (#FFD700)

