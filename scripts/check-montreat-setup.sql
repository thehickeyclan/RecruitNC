-- All-in-one diagnostic for Montreat coaches

WITH montreat_school AS (
  SELECT id, name 
  FROM schools 
  WHERE name ILIKE '%montreat%'
  LIMIT 1
),
montreat_coaches AS (
  SELECT 
    up.id,
    up.user_id,
    up.full_name,
    up.email,
    up.school_id,
    up.role,
    up.verified_coach
  FROM user_profiles up
  CROSS JOIN montreat_school ms
  WHERE up.school_id = ms.id
)
SELECT 
  '=== MONTREAT COACHES ===' as section,
  mc.full_name as coach_name,
  mc.email,
  mc.school_id,
  mc.verified_coach,
  mc.role,
  COUNT(DISTINCT ccs.athlete_id) as athletes_starred
FROM montreat_coaches mc
LEFT JOIN college_coach_stars ccs ON ccs.coach_user_id = mc.user_id
GROUP BY mc.id, mc.full_name, mc.email, mc.school_id, mc.verified_coach, mc.role
ORDER BY mc.full_name;

-- Also check if school_id is actually set
SELECT 
  '=== SCHOOL INFO ===' as section,
  id as school_id,
  name as school_name
FROM schools 
WHERE name ILIKE '%montreat%';
