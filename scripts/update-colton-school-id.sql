-- Update Colton Palmer's school_id to NC United Wrestling
UPDATE user_profiles
SET school_id = '7332bb01-288a-4033-ad66-e67f73edab4f',
    updated_at = NOW()
WHERE email = 'cpalmer@goldgroupinc.com';

-- Verify the update
SELECT 
  up.user_id,
  up.email,
  up.full_name,
  up.school_id,
  s.name as school_name,
  COUNT(ccs.id) as total_stars
FROM user_profiles up
LEFT JOIN schools s ON s.id = up.school_id
LEFT JOIN college_coach_stars ccs ON ccs.coach_user_id = up.user_id
WHERE up.school_id = '7332bb01-288a-4033-ad66-e67f73edab4f'
GROUP BY up.user_id, up.email, up.full_name, up.school_id, s.name
ORDER BY up.email;
