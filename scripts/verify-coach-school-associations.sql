-- Verification script to check all coach-school associations
-- Run this to see the current state of the system

-- 1. Show all schools with their coach counts
SELECT 
  s.id,
  s.name,
  s.logo_url,
  s.primary_color,
  s.secondary_color,
  COUNT(up.id) as coach_count
FROM schools s
LEFT JOIN user_profiles up ON s.id = up.school_id
GROUP BY s.id, s.name, s.logo_url, s.primary_color, s.secondary_color
ORDER BY s.name;

-- 2. Show all coaches with their school assignments
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.verified_coach,
  up.verification_status,
  up.institution,
  up.coaching_position,
  s.name as assigned_school,
  s.primary_color,
  s.secondary_color,
  up.created_at,
  up.verified_at
FROM user_profiles up
LEFT JOIN schools s ON up.school_id = s.id
WHERE up.role IN ('coach', 'college-coach', 'college_coach')
   OR up.profile_type IN ('coach', 'college-coach', 'college_coach')
ORDER BY s.name NULLS LAST, up.full_name;

-- 3. Show coaches without school assignments (need assignment)
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.verified_coach,
  up.verification_status,
  up.institution,
  up.coaching_position
FROM user_profiles up
WHERE (up.role IN ('coach', 'college-coach', 'college_coach')
   OR up.profile_type IN ('coach', 'college-coach', 'college_coach'))
  AND up.school_id IS NULL
ORDER BY up.created_at DESC;

-- 4. Show Roanoke College specifically with all its coaches
SELECT 
  s.name as school_name,
  s.logo_url,
  s.primary_color,
  s.secondary_color,
  json_agg(
    json_build_object(
      'id', up.id,
      'email', up.email,
      'full_name', up.full_name,
      'coaching_position', up.coaching_position,
      'verified_coach', up.verified_coach,
      'verified_at', up.verified_at
    )
  ) FILTER (WHERE up.id IS NOT NULL) as coaches
FROM schools s
LEFT JOIN user_profiles up ON s.id = up.school_id
WHERE s.name = 'Roanoke College'
GROUP BY s.id, s.name, s.logo_url, s.primary_color, s.secondary_color;
