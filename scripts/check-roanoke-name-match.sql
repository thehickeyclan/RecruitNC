-- Check for Roanoke name mismatch

-- 1. What's the exact school name in schools table?
SELECT id, name, logo_url FROM schools WHERE name ILIKE '%Roanoke%';

-- 2. What are the exact college field values for Class of 2025 College Athletes?
SELECT DISTINCT 
  a.college,
  COUNT(*) as athlete_count
FROM athletes a
WHERE a.recruiting_status = 'College Athlete'
AND a.graduationyear = 2025
AND a.college ILIKE '%Roanoke%'
GROUP BY a.college
ORDER BY athlete_count DESC;

-- 3. Show all the athletes
SELECT 
  a.id,
  a.name,
  a.graduationyear,
  a.recruiting_status,
  a.college,
  a.highschool
FROM athletes a
WHERE a.recruiting_status = 'College Athlete'
AND a.graduationyear = 2025
AND a.college ILIKE '%Roanoke%'
ORDER BY a.name;

