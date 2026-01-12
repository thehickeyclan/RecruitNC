# College Commitment Data Queries for Legacy NC Data System

## Database Location

College commitment data is stored in the **`athletes`** table with the following key fields:

### Key Fields:
- **`name`** (TEXT) - Athlete's full name
- **`college`** (TEXT) - College/university name they committed to
- **`division`** (TEXT) - Division level (e.g., 'NCAA DI', 'NCAA DII', 'NCAA DIII', 'NAIA', 'NJCAA')
- **`graduationyear`** (INTEGER) - High school graduation year (2025, 2026, 2027, etc.)
- **`recruiting_status`** (TEXT) - Status: "Committed", "Signed", "College Athlete", etc.
- **`commitmentdate`** (DATE) - Date they committed
- **`weightclass`** (TEXT) - High school weight class
- **`college_weight_class`** (TEXT) - Projected college weight class
- **`gender`** (TEXT) - 'Male' or 'Female'

## Query Logic: Determining Current College Status

The system should be smart enough to know:
- If an athlete's `graduationyear` is **2025 or earlier** (and current year is 2025+), they are **currently at** the college they committed to
- If an athlete's `graduationyear` is **2026 or later**, they are **committed but not yet attending**

## Example Query: "What college does Liam Hickey wrestle for?"

```sql
-- Find current college for an athlete by name
-- This query handles both current college athletes and future commitments
SELECT 
  name,
  college,
  division,
  graduationyear,
  recruiting_status,
  commitmentdate,
  weightclass,
  college_weight_class,
  gender,
  CASE 
    WHEN graduationyear <= EXTRACT(YEAR FROM CURRENT_DATE) 
      THEN 'Currently Attending'
    ELSE 'Committed (Future)'
  END as current_status
FROM athletes
WHERE LOWER(TRIM(name)) LIKE '%liam%hickey%'
  AND college IS NOT NULL
  AND college != ''
ORDER BY graduationyear DESC, commitmentdate DESC
LIMIT 1;
```

## Query: Get All Current College Athletes (2025 and earlier)

```sql
-- Athletes who are currently in college (graduated 2025 or earlier)
SELECT 
  name,
  college,
  division,
  graduationyear,
  recruiting_status,
  weightclass,
  college_weight_class,
  gender
FROM athletes
WHERE graduationyear <= EXTRACT(YEAR FROM CURRENT_DATE)
  AND college IS NOT NULL
  AND college != ''
  AND recruiting_status IN ('Committed', 'Signed', 'College Athlete')
ORDER BY college, name;
```

## Query: Get All Future Commitments (2026 and later)

```sql
-- Athletes who have committed but haven't started college yet
SELECT 
  name,
  college,
  division,
  graduationyear,
  recruiting_status,
  commitmentdate,
  weightclass,
  college_weight_class,
  gender
FROM athletes
WHERE graduationyear > EXTRACT(YEAR FROM CURRENT_DATE)
  AND college IS NOT NULL
  AND college != ''
  AND recruiting_status IN ('Committed', 'Signed')
ORDER BY graduationyear, college, name;
```

## Query: Get All Commitments by Year

```sql
-- Get all commitments for a specific graduation year
SELECT 
  name,
  college,
  division,
  graduationyear,
  recruiting_status,
  commitmentdate,
  weightclass,
  college_weight_class,
  gender
FROM athletes
WHERE graduationyear = 2025
  AND college IS NOT NULL
  AND college != ''
ORDER BY college, name;
```

## Query: Get All Commitments by College

```sql
-- Get all athletes committed to a specific college
SELECT 
  name,
  college,
  division,
  graduationyear,
  recruiting_status,
  commitmentdate,
  weightclass,
  college_weight_class,
  gender,
  CASE 
    WHEN graduationyear <= EXTRACT(YEAR FROM CURRENT_DATE) 
      THEN 'Currently Attending'
    ELSE 'Committed (Future)'
  END as current_status
FROM athletes
WHERE LOWER(college) LIKE '%north carolina state%'
  AND college IS NOT NULL
  AND college != ''
ORDER BY graduationyear DESC, name;
```

## Query: Get All Commitments by Division

```sql
-- Get all commitments for a specific division
SELECT 
  name,
  college,
  division,
  graduationyear,
  recruiting_status,
  commitmentdate,
  weightclass,
  college_weight_class,
  gender
FROM athletes
WHERE division = 'NCAA DI'
  AND college IS NOT NULL
  AND college != ''
ORDER BY graduationyear DESC, college, name;
```

## Smart Query: Answer "Where does [Athlete] wrestle in college?"

This query intelligently determines if the athlete is currently in college or committed for the future:

```sql
-- Smart query that determines current vs future status
SELECT 
  name,
  college,
  division,
  graduationyear,
  recruiting_status,
  commitmentdate,
  weightclass,
  college_weight_class,
  gender,
  CASE 
    WHEN graduationyear < EXTRACT(YEAR FROM CURRENT_DATE) 
      THEN 'Currently Attending'
    WHEN graduationyear = EXTRACT(YEAR FROM CURRENT_DATE) 
      THEN 'Starting This Year'
    ELSE 'Committed (Starts ' || graduationyear::TEXT || ')'
  END as status_description
FROM athletes
WHERE LOWER(TRIM(name)) LIKE '%athlete_name%'
  AND college IS NOT NULL
  AND college != ''
ORDER BY graduationyear DESC, commitmentdate DESC;
```

## Summary Statistics Query

```sql
-- Get commitment statistics by year and division
SELECT 
  graduationyear,
  division,
  COUNT(*) as total_commitments,
  COUNT(CASE WHEN graduationyear <= EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) as current_athletes,
  COUNT(CASE WHEN graduationyear > EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) as future_commitments
FROM athletes
WHERE college IS NOT NULL
  AND college != ''
GROUP BY graduationyear, division
ORDER BY graduationyear DESC, division;
```

## Notes for Legacy System Integration

1. **Current Year Logic**: Use `EXTRACT(YEAR FROM CURRENT_DATE)` to get the current year and compare with `graduationyear`
2. **Name Matching**: Use `LOWER(TRIM(name)) LIKE '%name%'` for flexible name matching
3. **Status Filtering**: Filter by `recruiting_status IN ('Committed', 'Signed', 'College Athlete')` to get active commitments
4. **Null Handling**: Always check `college IS NOT NULL AND college != ''` to exclude athletes without commitments

## Indexes Available for Performance

- `idx_athletes_graduationyear` - Fast filtering by year
- `idx_athletes_commitmentdate` - Fast sorting by commitment date
- Indexes on `college`, `division`, `gender` for filtering




