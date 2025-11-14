-- Update all existing athletes to have "committed" recruiting status
-- This distinguishes current committed athletes from future uncommitted prospects

UPDATE athletes 
SET recruiting_status = 'committed'
WHERE recruiting_status IS NULL 
   OR recruiting_status = '' 
   OR recruiting_status != 'committed';

-- Show count of athletes by recruiting status after update
SELECT 
    recruiting_status,
    COUNT(*) as athlete_count
FROM athletes 
GROUP BY recruiting_status
ORDER BY athlete_count DESC;

-- Show total athletes updated
SELECT COUNT(*) as total_athletes_now_committed
FROM athletes 
WHERE recruiting_status = 'committed';
