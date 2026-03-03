# Fix Jackson D'Ettore — one name everywhere

Run this in **Supabase → SQL Editor**. That's it.

```sql
UPDATE wrestling_nchsaa_results SET wrestler_name = 'Jackson D''Ettore' WHERE wrestler_name IN ('Jackson Dettore', 'Jackson D''Ettore') OR wrestler_name = 'Jackson D' || CHR(2019) || 'Ettore';
UPDATE nhsca_placements SET athlete_name = 'Jackson D''Ettore' WHERE athlete_name IN ('Jackson Dettore', 'Jackson D''Ettore') OR athlete_name = 'Jackson D' || CHR(2019) || 'Ettore';
UPDATE wrestling_nhsca_results SET athlete_name = 'Jackson D''Ettore' WHERE athlete_name IN ('Jackson Dettore', 'Jackson D''Ettore') OR athlete_name = 'Jackson D' || CHR(2019) || 'Ettore';
UPDATE super32_results SET athlete_name = 'Jackson D''Ettore' WHERE athlete_name IN ('Jackson Dettore', 'Jackson D''Ettore') OR athlete_name = 'Jackson D' || CHR(2019) || 'Ettore';
```

(CHR(2019) = curly apostrophe, so "Jackson D'Ettore" from imports gets fixed too.)

---

**If that profile still shows no results:** the app only looks up tournaments by the athlete’s `name` (same as the 500 that work). If this row has `name` or `wrestling_name` null/empty, you get no results. Check and fix in Supabase:

```sql
-- See what’s stored
SELECT id, name, wrestling_name, graduationyear FROM athletes WHERE id = '2be076e9-5400-4238-a245-b4e4fb640d48';

-- If name is empty, set it so lookups work like everyone else
UPDATE athletes SET name = 'Jackson D''Ettore', wrestling_name = 'Jackson D''Ettore' WHERE id = '2be076e9-5400-4238-a245-b4e4fb640d48' AND (name IS NULL OR name = '' OR wrestling_name IS NULL OR wrestling_name = '');
```
