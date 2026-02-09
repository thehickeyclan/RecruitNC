# NC United Blue Members – All Years (SQL)

Run in **Supabase → SQL Editor**. Returns all athletes marked as NC United Blue (any graduation year).

---

## Use this query (column is `"ncUnitedTeam"` in your DB)

```sql
SELECT
  id,
  name,
  graduationyear,
  highschool,
  weightclass,
  "ncUnitedTeam" AS team_value
FROM athletes
WHERE LOWER(TRIM(COALESCE("ncUnitedTeam"::text, ''))) IN ('blue', 'blue team', 'both')
   OR LOWER(TRIM(COALESCE("ncUnitedTeam"::text, ''))) LIKE '%blue%'
ORDER BY graduationyear ASC, name ASC;
```

If Supabase applies a limit (e.g. 100), choose **No limit** and run again to get all rows.

---

## Other column names (if your DB differs)

### Column is lowercase `ncunitedteam`

```sql
SELECT id, name, graduationyear, highschool, weightclass, ncunitedteam AS team_value
FROM athletes
WHERE LOWER(TRIM(COALESCE(ncunitedteam::text, ''))) IN ('blue', 'blue team', 'both')
   OR LOWER(TRIM(COALESCE(ncunitedteam::text, ''))) LIKE '%blue%'
ORDER BY graduationyear ASC, name ASC;
```

### Column is snake_case `nc_united_team`

```sql
SELECT
  id,
  name,
  graduationyear,
  highschool,
  weightclass,
  nc_united_team AS team_value
FROM athletes
WHERE LOWER(TRIM(COALESCE(nc_united_team::text, ''))) IN ('blue', 'blue team', 'both')
   OR LOWER(TRIM(COALESCE(nc_united_team::text, ''))) LIKE '%blue%'
ORDER BY graduationyear ASC, name ASC;
```

---

**To see your actual column name:** GET `/api/debug/athletes-schema` (when app is running) and check `columnsFromRow` or `columnsFromSchema` for the team column.
