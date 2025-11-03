-- Check Cameron Gue's current status

SELECT 
  a.id,
  a.name,
  a.graduationyear,
  a.recruiting_status,
  a.college,
  a.highschool,
  a.location,
  ccs.pipeline_stage,
  ccs.coach_user_id,
  up.email as coach_email,
  up.school_id as coach_school_id,
  s.name as school_name
FROM athletes a
LEFT JOIN college_coach_stars ccs ON ccs.athlete_id = a.id
LEFT JOIN user_profiles up ON up.user_id = ccs.coach_user_id
LEFT JOIN schools s ON s.id = up.school_id
WHERE (
  a.name ILIKE '%Cameron%Gue%' OR
  a.name ILIKE '%Cameron Gue%' OR
  (a."firstName" ILIKE '%Cameron%' AND a."lastName" ILIKE '%Gue%')
)
AND a.graduationyear = 2026;

