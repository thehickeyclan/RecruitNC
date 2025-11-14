-- Find Colton Palmer and update his school_id to NC United Wrestling
UPDATE user_profiles
SET school_id = '7332bb01-288a-4033-ad66-e67f73edab4f'
WHERE email = 'cpalmer@goldgroupinc.com';

-- Verify the fix
SELECT 
  up.user_id,
  up.email,
  up.full_name,
  up.school_id,
  s.name as school_name,
  COUNT(ccs.athlete_id) as can_see_athletes
FROM user_profiles up
LEFT JOIN schools s ON s.id = up.school_id
LEFT JOIN user_profiles up2 ON up2.school_id = up.school_id
LEFT JOIN college_coach_stars ccs ON ccs.coach_user_id = up2.user_id
WHERE up.email = 'cpalmer@goldgroupinc.com'
GROUP BY up.user_id, up.email, up.full_name, up.school_id, s.name;
