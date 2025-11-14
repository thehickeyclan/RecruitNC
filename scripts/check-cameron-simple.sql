-- Simple check for Cameron Gue's status
SELECT 
  a.id as athlete_id,
  a.name,
  a.graduationyear,
  a.location,
  a.highschool,
  a.college as athlete_college_field,
  ccs.id as star_id,
  ccs.pipeline_stage,
  ccs.notes,
  up.email as coach_email,
  up.is_admin,
  up.role,
  s.name as school_name,
  CASE 
    WHEN a.location ILIKE '%NC%' OR a.location ILIKE '%North Carolina%' THEN 'YES'
    WHEN a.highschool ILIKE '%NC%' OR a.highschool ILIKE '%North Carolina%' THEN 'YES'
    WHEN a.highschool ILIKE '%Charlotte%' OR a.highschool ILIKE '%Raleigh%' THEN 'YES'
    ELSE 'NO'
  END as is_nc_athlete,
  CASE 
    WHEN ccs.pipeline_stage IN ('Committed', 'Signed', 'committed', 'signed') THEN 'YES'
    ELSE 'NO'
  END as is_committed_signed,
  CASE 
    WHEN ccs.notes ILIKE '%Lynchburg%' THEN 'YES'
    ELSE 'NO'
  END as notes_mention_lynchburg
FROM athletes a
JOIN college_coach_stars ccs ON ccs.athlete_id = a.id
LEFT JOIN user_profiles up ON up.user_id = ccs.coach_user_id
LEFT JOIN schools s ON s.id = up.school_id
WHERE (
  a.name ILIKE '%Cameron%Gue%' OR
  a.name ILIKE '%Cameron Gue%' OR
  (a."firstName" ILIKE '%Cameron%' AND a."lastName" ILIKE '%Gue%')
)
AND a.graduationyear = 2026;
