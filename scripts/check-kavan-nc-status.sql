-- Check if Kavan is marked as an NC athlete (required for Committed Recruits section)

SELECT 
    'Kavan NC Status' as check_type,
    a.name,
    a.college,
    a.recruiting_status,
    a.state,
    a.location,
    a.highschool,
    CASE 
        WHEN a.state ILIKE '%NC%' OR a.state ILIKE '%North Carolina%' THEN '✅ Has NC state'
        WHEN a.location ILIKE '%NC%' OR a.location ILIKE '%North Carolina%' THEN '✅ Has NC in location'
        WHEN a.highschool ILIKE '%NC%' THEN '✅ Has NC in highschool'
        ELSE '❌ No NC indicator'
    END as nc_status
FROM athletes a
WHERE a.name ILIKE '%Kavan%Wilson%';




