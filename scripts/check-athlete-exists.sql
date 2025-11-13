-- Check if the athlete with ID 6334fc1c-ae94-4e0f-96a5-4cb5d9ca66f4 exists

SELECT 
  id,
  name,
  graduationyear,
  weightclass,
  highschool,
  location,
  "contactEmail",
  phone,
  created_at
FROM athletes
WHERE id = '6334fc1c-ae94-4e0f-96a5-4cb5d9ca66f4';

-- Also check if there's a star record for this athlete
SELECT 
  ccs.id,
  ccs.athlete_id,
  ccs.coach_user_id,
  ccs.pipeline_stage,
  ccs.starred_at,
  ccs.notes,
  up.full_name as coach_name,
  up.email as coach_email
FROM college_coach_stars ccs
LEFT JOIN user_profiles up ON up.user_id = ccs.coach_user_id
WHERE ccs.athlete_id = '6334fc1c-ae94-4e0f-96a5-4cb5d9ca66f4';
