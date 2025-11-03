-- Verify all required columns exist in college_coach_stars

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'college_coach_stars'
AND column_name IN (
  'financial_efc',
  'financial_aid_needs',
  'scholarship_requirements',
  'ability_to_pay',
  'financial_notes',
  'merit_scholarship_eligible',
  'need_based_aid_eligible',
  'aid_application_status',
  'financial_concerns',
  'roster_status',
  'roster_notes'
)
ORDER BY column_name;

-- This should return 11 rows (9 financial + 2 roster)

