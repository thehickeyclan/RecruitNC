-- Check exact Roanoke College school name

-- What's the EXACT name in schools table?
SELECT 
  id, 
  name, 
  primary_color, 
  secondary_color,
  logo_url
FROM schools 
WHERE name ILIKE '%Roanoke%';

-- Now let's see if the API query would work
-- Simulating what the API does:
-- 1. Get school by name
-- 2. Search athletes by that school's name

-- If school name is "Roanoke College", does it match athletes with "Roanoke"?
SELECT 
  a.id,
  a.name,
  a.college,
  a.recruiting_status,
  a.graduationyear,
  CASE 
    WHEN a.college ILIKE '%Roanoke College%' THEN 'Matches "Roanoke College"'
    WHEN a.college ILIKE '%Roanoke%' THEN 'Matches "Roanoke"'
    ELSE 'No match'
  END as match_type
FROM athletes a
WHERE a.recruiting_status = 'College Athlete'
AND a.graduationyear = 2025
AND a.college ILIKE '%Roanoke%'
ORDER BY a.name;

