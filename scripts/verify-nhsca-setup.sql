-- Verification Script: Check NHSCA Setup
-- Run this to verify everything is set up correctly

-- 1. Check if nhsca_placements table exists
SELECT 
  'Table exists' as check_type,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nhsca_placements')
    THEN '✅ nhsca_placements table exists'
    ELSE '❌ nhsca_placements table missing'
  END as status;

-- 2. Check table columns
SELECT 
  'Table columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'nhsca_placements'
ORDER BY ordinal_position;

-- 3. Check indexes
SELECT 
  'Indexes' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'nhsca_placements'
ORDER BY indexname;

-- 4. Check if matching functions exist
SELECT 
  'Functions' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'match_nhsca_exact_name',
    'match_nhsca_name_school',
    'match_nhsca_name_weight',
    'merge_nhsca_to_profiles',
    'mark_nhsca_merged',
    'update_nhsca_placements_updated_at'
  )
ORDER BY routine_name;

-- 5. Check if trigger exists
SELECT 
  'Trigger' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'nhsca_placements';

-- 6. Check if athletes.nhsca_results column exists
SELECT 
  'Athletes column' as check_type,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'athletes' 
  AND column_name = 'nhsca_results';

-- 7. Count any existing data
SELECT 
  'Data count' as check_type,
  COUNT(*) as total_placements,
  COUNT(DISTINCT year) as years_imported,
  COUNT(placement) as placers,
  COUNT(*) - COUNT(placement) as non_placers
FROM nhsca_placements;

