# College Commitment Data Structure

## Primary Storage: `athletes` Table

College commitment data is stored in the **`athletes`** table with the following key fields:

### Key Fields for Commitments:

1. **`college`** (TEXT)
   - The college/university name the athlete committed to
   - Example: "North Carolina State University", "Appalachian State"

2. **`division`** (TEXT, default: 'NCAA DI')
   - The division level
   - Values: 'NCAA DI', 'NCAA DII', 'NCAA DIII', 'NAIA', 'NJCAA', etc.

3. **`graduationyear`** (INTEGER)
   - The athlete's high school graduation year
   - Used to group commitments by class (2025, 2026, 2027, etc.)

4. **`commitmentdate`** (DATE)
   - The date the athlete committed
   - Used for sorting by most recent commitments

5. **`recruiting_status`** (TEXT)
   - Current status in the recruiting process
   - Values: "Committed", "Signed", "College Athlete", etc.
   - Used to filter active commitments vs. past commitments

6. **`weightclass`** (TEXT)
   - High school weight class

7. **`college_weight_class`** (TEXT)
   - Projected college weight class

8. **`gender`** (TEXT)
   - 'Male' or 'Female'

### Example Query:

```sql
-- Get all committed athletes by year, college, and division
SELECT 
  name,
  college,
  division,
  graduationyear,
  commitmentdate,
  weightclass,
  college_weight_class,
  gender
FROM athletes
WHERE college IS NOT NULL
  AND college != ''
  AND recruiting_status IN ('Committed', 'Signed', 'College Athlete')
ORDER BY graduationyear, college, commitmentdate DESC;
```

### Filtering by Year:

```sql
-- Get all 2025 commitments
SELECT * FROM athletes
WHERE graduationyear = 2025
  AND college IS NOT NULL
  AND college != '';
```

### Filtering by Division:

```sql
-- Get all D1 commitments
SELECT * FROM athletes
WHERE division = 'NCAA DI'
  AND college IS NOT NULL
  AND college != '';
```

### Filtering by College:

```sql
-- Get all athletes committed to a specific college
SELECT * FROM athletes
WHERE LOWER(college) LIKE '%north carolina state%'
  AND college IS NOT NULL;
```

## Secondary Storage: `commitment_submissions` Table

Pending commitment submissions (before approval) are stored in **`commitment_submissions`**:

- `first_name`, `last_name`
- `graduation_year`
- `college`
- `high_school`
- `status` (default: 'pending')
- `submitted_at`

Once approved, this data is moved to the `athletes` table.

## Indexes for Performance:

- `idx_athletes_graduation_year` - Fast filtering by year
- `idx_athletes_commitment_date` - Fast sorting by commitment date
- Indexes on `college`, `division`, `gender` for filtering

## Common Queries:

### Get commitments by year:
```sql
SELECT college, division, COUNT(*) as count
FROM athletes
WHERE graduationyear = 2025
  AND college IS NOT NULL
  AND college != ''
GROUP BY college, division
ORDER BY count DESC;
```

### Get commitments by division:
```sql
SELECT division, COUNT(*) as count
FROM athletes
WHERE college IS NOT NULL
  AND college != ''
GROUP BY division
ORDER BY count DESC;
```

### Get commitments by college:
```sql
SELECT college, division, COUNT(*) as count
FROM athletes
WHERE college IS NOT NULL
  AND college != ''
GROUP BY college, division
ORDER BY college, division;
```

