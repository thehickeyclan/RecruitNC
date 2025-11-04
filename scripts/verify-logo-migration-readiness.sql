-- Phase 1: Verify Logo Migration Readiness
-- Check if we can safely migrate from media_items to logo_mappings

-- Step 1: Count total records in each table
SELECT 'media_items count' as check_name, COUNT(*) as count FROM media_items WHERE is_active = true;
SELECT 'logo_mappings count' as check_name, COUNT(*) as count FROM logo_mappings;

-- Step 2: Check for logos in media_items that might not be in logo_mappings
SELECT 
  'Logos potentially missing from logo_mappings' as check_name,
  COUNT(*) as count
FROM media_items mi
WHERE mi.is_active = true
  AND mi.category IN ('logo', 'college_logo', 'highschool_logo', 'club_logo')
  AND NOT EXISTS (
    SELECT 1 FROM logo_mappings lm 
    WHERE lm.logo_url = mi.url
  );

-- Step 3: Sample of media_items that might be missing
SELECT 
  mi.id,
  mi.filename,
  mi.original_name,
  mi.category,
  mi.url,
  'Missing from logo_mappings' as status
FROM media_items mi
WHERE mi.is_active = true
  AND mi.category IN ('logo', 'college_logo', 'highschool_logo', 'club_logo')
  AND NOT EXISTS (
    SELECT 1 FROM logo_mappings lm 
    WHERE lm.logo_url = mi.url
  )
LIMIT 20;

-- Step 4: Check for non-logo media items (things we should NOT migrate)
SELECT 
  category,
  COUNT(*) as count,
  ARRAY_AGG(DISTINCT original_name ORDER BY original_name) FILTER (WHERE original_name IS NOT NULL) as sample_names
FROM media_items
WHERE is_active = true
  AND category NOT IN ('logo', 'college_logo', 'highschool_logo', 'club_logo')
GROUP BY category;

-- Step 5: Verify logo_mappings coverage by entity type
SELECT 
  entity_type,
  COUNT(*) as total_mappings,
  COUNT(DISTINCT entity_name) as unique_entities,
  COUNT(CASE WHEN logo_url IS NOT NULL THEN 1 END) as with_logo_url
FROM logo_mappings
GROUP BY entity_type
ORDER BY entity_type;

-- Step 6: Check for duplicate mappings (same entity with multiple logos)
SELECT 
  entity_type,
  entity_name,
  COUNT(*) as mapping_count,
  ARRAY_AGG(logo_url) as logo_urls
FROM logo_mappings
GROUP BY entity_type, entity_name
HAVING COUNT(*) > 1
ORDER BY mapping_count DESC
LIMIT 10;

-- Step 7: Check all columns in media_items to see what's available
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'media_items'
ORDER BY ordinal_position;

