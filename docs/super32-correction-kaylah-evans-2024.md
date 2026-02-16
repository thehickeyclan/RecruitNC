# Super32 correction: Kaylah Evans 2024

**Issue:** Data Dawg (and profiles) show Kaylah Evans as Super32 2024 **Champion**; she actually placed **7th** in 2024.

**Cause:** The row in `super32_results` for Kaylah Evans, year 2024, has `placement` = 1. It should be 7.

**Fix:** Run in Supabase SQL Editor:

```sql
-- Correct Kaylah Evans Super32 2024: Champion → 7th place
UPDATE super32_results
SET placement = 7
WHERE year = 2024
  AND athlete_name ILIKE '%Kaylah%Evans%';
```

If your table uses a different column name (e.g. `place` instead of `placement`), use:

```sql
UPDATE super32_results
SET place = 7
WHERE year = 2024
  AND athlete_name ILIKE '%Kaylah%Evans%';
```

After running, Data Dawg and athlete profiles will show "7th All-American" for her 2024 Super32 result.
