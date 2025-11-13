-- Check Randolph Class of 2025 athletes status

SELECT 
  a.id,
  a.name,
  a.graduationyear,
  a.recruiting_status,
  a.college,
  a.highschool,
  ccs.pipeline_stage,
  ccs.notes
FROM athletes a
LEFT JOIN college_coach_stars ccs ON ccs.athlete_id = a.id
WHERE a.graduationyear = 2025
AND (
  a.name ILIKE '%Leviathan%Haynes%' OR
  a.name ILIKE '%Adrian%Fox%' OR
  a.name ILIKE '%Eli%Frizzell%'
)
ORDER BY a.name;
