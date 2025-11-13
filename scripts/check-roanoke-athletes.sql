-- Check Roanoke College athletes status

-- First, check what the school name is in the schools table
SELECT id, name FROM schools WHERE name ILIKE '%Roanoke%';

-- Then check all athletes with Roanoke in their college field
SELECT 
  a.id,
  a.name,
  a.graduationyear,
  a.recruiting_status,
  a.college,
  a.highschool,
  a.location
FROM athletes a
WHERE a.college ILIKE '%Roanoke%'
ORDER BY a.graduationyear DESC, a.name;

-- Check if any are in college_coach_stars
SELECT 
  a.name,
  a.graduationyear,
  a.recruiting_status,
  a.college,
  ccs.pipeline_stage,
  ccs.notes
FROM athletes a
LEFT JOIN college_coach_stars ccs ON ccs.athlete_id = a.id
WHERE a.college ILIKE '%Roanoke%'
ORDER BY a.graduationyear DESC;
