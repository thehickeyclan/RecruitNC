# Fix Jackson D'Ettore — one name everywhere

Run this in **Supabase → SQL Editor**. That's it.

```sql
UPDATE wrestling_nchsaa_results SET wrestler_name = 'Jackson D''Ettore' WHERE wrestler_name IN ('Jackson Dettore', 'Jackson D''Ettore') OR wrestler_name = 'Jackson D' || CHR(2019) || 'Ettore';
UPDATE nhsca_placements SET athlete_name = 'Jackson D''Ettore' WHERE athlete_name IN ('Jackson Dettore', 'Jackson D''Ettore') OR athlete_name = 'Jackson D' || CHR(2019) || 'Ettore';
UPDATE wrestling_nhsca_results SET athlete_name = 'Jackson D''Ettore' WHERE athlete_name IN ('Jackson Dettore', 'Jackson D''Ettore') OR athlete_name = 'Jackson D' || CHR(2019) || 'Ettore';
UPDATE super32_results SET athlete_name = 'Jackson D''Ettore' WHERE athlete_name IN ('Jackson Dettore', 'Jackson D''Ettore') OR athlete_name = 'Jackson D' || CHR(2019) || 'Ettore';
```

(CHR(2019) = curly apostrophe, so "Jackson D'Ettore" from imports gets fixed too.)
