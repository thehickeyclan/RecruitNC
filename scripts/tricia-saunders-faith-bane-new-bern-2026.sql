-- Tricia Saunders High School Excellence Award — NC state winner row.
-- Run in Supabase SQL Editor (shared DB for RecruitNC, LegacyNC athlete search, Data Dawg).
--
-- Updates automatically:
--   - /tricia-saunders-award (reads tricia_saunders_award)
--   - Legacy athletes search (components/athletes-legacy-search-content.tsx)
--   - Data Dawg (LegacyNC /api/ai/chat queries same DB)
--
-- If your table has no `city` column, remove the city column and value from the INSERT.
-- If the award year should be different (e.g. 2025), change `year` below.

INSERT INTO public.tricia_saunders_award (year, name, high_school, city, college)
SELECT
  2026,
  'Faith Bane',
  'New Bern High School',
  'New Bern',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tricia_saunders_award
  WHERE year = 2026
    AND name = 'Faith Bane'
    AND high_school = 'New Bern High School'
);

-- Verify
SELECT id, year, name, high_school, city, college
FROM public.tricia_saunders_award
WHERE name ILIKE '%Faith Bane%'
ORDER BY year DESC;
