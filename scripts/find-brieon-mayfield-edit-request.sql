-- Find Brieon Mayfield's approved edit request from Jan 12, 2025
-- This query searches for approved edit requests for the athlete "Brieon Mayfield"

SELECT 
    er.id,
    er.athlete_id,
    a.name as athlete_name,
    er.request_type,
    er.status,
    er.request_data::text as request_data_json,
    er.admin_notes,
    er.created_at,
    er.reviewed_at,
    u.email as requester_email
FROM edit_requests er
LEFT JOIN athletes a ON er.athlete_id::uuid = a.id
LEFT JOIN auth.users u ON er.user_id = u.id
WHERE 
    er.status = 'approved'
    AND er.reviewed_at >= '2025-01-12 00:00:00'
    AND er.reviewed_at < '2025-01-13 00:00:00'
    AND (
        LOWER(a.name) LIKE '%brieon%mayfield%'
        OR LOWER(a.name) LIKE '%mayfield%brieon%'
        OR LOWER(a.name) LIKE '%brieon%'
    )
ORDER BY er.reviewed_at DESC;

-- Alternative query if the above doesn't find it - search more broadly
-- This searches for any approved requests from today that might be related
SELECT 
    er.id,
    er.athlete_id,
    a.name as athlete_name,
    er.request_type,
    er.status,
    er.request_data::text as request_data_json,
    er.admin_notes,
    er.created_at,
    er.reviewed_at,
    u.email as requester_email
FROM edit_requests er
LEFT JOIN athletes a ON er.athlete_id::uuid = a.id
LEFT JOIN auth.users u ON er.user_id = u.id
WHERE 
    er.status = 'approved'
    AND er.reviewed_at >= '2025-01-12 00:00:00'
    AND er.reviewed_at < '2025-01-13 00:00:00'
ORDER BY er.reviewed_at DESC
LIMIT 20;

-- Detailed view of request_data structure for easier reading
-- This query extracts specific fields from the request_data JSONB
SELECT 
    er.id,
    a.name as athlete_name,
    er.request_type,
    er.status,
    er.request_data->>'description' as description,
    er.request_data->'currentData'->>'bio' as bio_data,
    er.request_data->'currentData'->>'achievements' as achievements_data,
    er.request_data->'currentData'->>'academics' as academics_data,
    er.request_data->'currentData'->>'other' as other_data,
    er.request_data::text as full_request_data,
    er.admin_notes,
    er.reviewed_at
FROM edit_requests er
LEFT JOIN athletes a ON er.athlete_id::uuid = a.id
WHERE 
    er.status = 'approved'
    AND er.reviewed_at >= '2025-01-12 00:00:00'
    AND er.reviewed_at < '2025-01-13 00:00:00'
    AND (
        LOWER(a.name) LIKE '%brieon%mayfield%'
        OR LOWER(a.name) LIKE '%mayfield%brieon%'
        OR LOWER(a.name) LIKE '%brieon%'
    )
ORDER BY er.reviewed_at DESC;

