-- Check Cameron Gue's college field and recruiting_status in athletes table
SELECT 
  a.id,
  a.name,
  a.graduationyear,
  a.college as athlete_college_field,
  a.recruiting_status,
  a.location,
  a.highschool,
  CASE 
    WHEN a.college ILIKE '%Lynchburg%' THEN '✅ MATCHES LYNCHBURG'
    WHEN a.college IS NULL OR a.college = '' THEN '❌ NO COLLEGE SET'
    ELSE '❌ DOES NOT MATCH: ' || a.college
  END as college_match_status,
  CASE 
    WHEN a.recruiting_status IN ('Committed', 'Signed', 'committed', 'signed') THEN '✅ COMMITTED/SIGNED'
    WHEN a.recruiting_status IS NULL OR a.recruiting_status = '' THEN '❌ NO STATUS'
    ELSE '❌ NOT COMMITTED: ' || a.recruiting_status
  END as status_check,
  CASE 
    WHEN a.location ILIKE '%NC%' OR a.location ILIKE '%North Carolina%' THEN '✅ NC LOCATION'
    WHEN a.highschool ILIKE '%NC%' OR a.highschool ILIKE '%North Carolina%' OR a.highschool ILIKE '%Mount Pleasant%' THEN '✅ NC HIGH SCHOOL'
    ELSE '❓ MAYBE NOT NC'
  END as nc_check
FROM athletes a
WHERE (
  a.name ILIKE '%Cameron%Gue%' OR
  a.name ILIKE '%Cameron Gue%' OR
  (a."firstName" ILIKE '%Cameron%' AND a."lastName" ILIKE '%Gue%')
)
AND a.graduationyear = 2026;

