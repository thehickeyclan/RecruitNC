-- Fix Kavan's NC status so he appears in Committed Recruits section

-- Update Kavan's location to include NC
UPDATE athletes
SET location = CASE 
    WHEN location IS NULL OR location = '' THEN 'North Carolina'
    WHEN location NOT ILIKE '%NC%' AND location NOT ILIKE '%North Carolina%' THEN location || ', NC'
    ELSE location
END
WHERE name ILIKE '%Kavan%Wilson%';

-- Verify the update
SELECT 
    'Updated Kavan' as status,
    name,
    college,
    recruiting_status,
    state,
    location,
    highschool,
    CASE 
        WHEN state ILIKE '%NC%' OR state ILIKE '%North Carolina%' THEN '✅ Has NC state'
        WHEN location ILIKE '%NC%' OR location ILIKE '%North Carolina%' THEN '✅ Has NC in location'
        WHEN highschool ILIKE '%NC%' THEN '✅ Has NC in highschool'
        ELSE '❌ No NC indicator'
    END as nc_status
FROM athletes
WHERE name ILIKE '%Kavan%Wilson%';

