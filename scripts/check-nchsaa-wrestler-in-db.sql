-- Check NCHSAA state rows (Supabase → SQL Editor → paste → Run)
-- Table: public.wrestling_nchsaa_results (place = 0 → SQ; 1–8 → placers)

-- ---------------------------------------------------------------------------
-- 1) Elias Marquez / Flores — both tokens hit common NCHSAA spellings
-- ---------------------------------------------------------------------------
SELECT year,
       wrestler_name,
       place,
       classification,
       weight_class,
       school
FROM public.wrestling_nchsaa_results
WHERE year IN (2025, 2026)
  AND wrestler_name ILIKE '%Elias%'
  AND (
    wrestler_name ILIKE '%Flores%'
    OR wrestler_name ILIKE '%Marquez%'
  )
ORDER BY year DESC, classification, weight_class;

-- ---------------------------------------------------------------------------
-- 2) Every row with "Elias" in 2026 — confirms exact wrestler_name in DB
-- ---------------------------------------------------------------------------
SELECT year,
       wrestler_name,
       place,
       classification,
       weight_class,
       school
FROM public.wrestling_nchsaa_results
WHERE year = 2026
  AND wrestler_name ILIKE '%Elias%'
ORDER BY classification, weight_class;

-- ---------------------------------------------------------------------------
-- 3) Optional: West Forsyth row counts by year
-- ---------------------------------------------------------------------------
SELECT year,
       COUNT(*) AS row_count
FROM public.wrestling_nchsaa_results
WHERE school ILIKE '%West Forsyth%'
  AND year >= 2024
GROUP BY year
ORDER BY year DESC;
