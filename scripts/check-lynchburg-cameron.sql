-- Check Lynchburg College ID and Cameron Gue's pipeline status

-- Find Lynchburg College
SELECT id, name, logo_url 
FROM schools 
WHERE name ILIKE '%Lynchburg%';

-- Find Cameron Gue
SELECT id, name, graduationyear 
FROM athletes 
WHERE (
  name ILIKE '%Cameron%Gue%' OR 
  name ILIKE '%Cameron Gue%' OR
  ("firstName" ILIKE '%Cameron%' AND "lastName" ILIKE '%Gue%')
)
AND graduationyear = 2026;

-- Check if Cameron is in the pipeline and who he's associated with
SELECT 
  ccs.id,
  ccs.pipeline_stage,
  ccs.coach_user_id,
  up.email,
  up.school_id,
  s.name as school_name
FROM college_coach_stars ccs
JOIN athletes a ON a.id = ccs.athlete_id
LEFT JOIN user_profiles up ON up.user_id = ccs.coach_user_id
LEFT JOIN schools s ON s.id = up.school_id
WHERE (
  a.name ILIKE '%Cameron%Gue%' OR 
  a.name ILIKE '%Cameron Gue%' OR
  (a."firstName" ILIKE '%Cameron%' AND a."lastName" ILIKE '%Gue%')
)
AND a.graduationyear = 2026;

