# Legacy NC Data Integration Summary

This document provides a quick reference for integrating with the Recruit NC database to answer common questions about athletes, their college commitments, and match records.

## Quick Reference

### College Commitment Questions
**Location**: `athletes` table  
**Documentation**: `college-commitment-queries-for-legacy-system.md`  
**SQL File**: `query-athlete-college-commitment.sql`

**Example Questions**:
- "What college does Liam Hickey wrestle for?"
- "Where did the 2025 class commit?"
- "What D1 commitments do we have?"

### Match & Season Record Questions
**Location**: `matches` table  
**Documentation**: `athlete-match-and-season-queries-for-legacy-system.md`  
**SQL File**: `query-athlete-match-records.sql`

**Example Questions**:
- "What was Tobin McNair's record as a freshman?"
- "What losses did Liam Hickey have in his high school career?"
- "What was Colt Campbell's HS career record?"

---

## Database Tables Overview

### 1. `athletes` Table
**Purpose**: Athlete profiles and college commitments

**Key Fields for Commitments**:
- `name` - Athlete full name
- `college` - College name
- `division` - Division level (NCAA DI, DII, DIII, NAIA, NJCAA)
- `graduationyear` - Graduation year (2025, 2026, etc.)
- `recruiting_status` - "Committed", "Signed", "College Athlete"
- `commitmentdate` - Date committed
- `careerRecord` - Career record summary (e.g., "120-15")

### 2. `matches` Table
**Purpose**: Season-by-season match data and individual match history

**Key Fields**:
- `athlete_id` - Links to athletes.id (may be NULL)
- `wrestler_id` - Unique season identifier
- `first_name`, `last_name` - Athlete name
- `season` - Season (e.g., "2024-25")
- `grade` - Grade level (Freshman, Sophomore, etc.)
- `wins`, `losses`, `total_matches` - Season stats
- `matches` - JSONB array of individual matches

---

## Common Query Patterns

### Pattern 1: Find Current College Status
```sql
-- Uses graduationyear to determine if athlete is currently in college
SELECT name, college, division, graduationyear,
  CASE 
    WHEN graduationyear <= EXTRACT(YEAR FROM CURRENT_DATE) 
      THEN 'Currently Attending'
    ELSE 'Committed (Starts ' || graduationyear::TEXT || ')'
  END as status
FROM athletes
WHERE LOWER(TRIM(name)) LIKE '%athlete_name%'
  AND college IS NOT NULL AND college != '';
```

### Pattern 2: Get Season Record by Grade
```sql
-- Get record for specific grade level
SELECT season, grade, wins, losses, wins || '-' || losses as record
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%athlete_name%'
  AND LOWER(grade) IN ('freshman', '9', 'fr')
ORDER BY season;
```

### Pattern 3: Get Career Totals
```sql
-- Sum across all seasons for career stats
SELECT 
  SUM(wins) || '-' || SUM(losses) as career_record,
  SUM(wins) as career_wins,
  SUM(losses) as career_losses
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%athlete_name%'
GROUP BY first_name, last_name;
```

### Pattern 4: Extract Individual Matches from JSONB
```sql
-- Query individual matches stored in JSONB array
SELECT 
  m.season,
  match->>'date' as match_date,
  match->>'opponent' as opponent,
  match->>'win_loss' as result
FROM matches m,
  jsonb_array_elements(m.matches) as match
WHERE LOWER(TRIM(m.first_name || ' ' || m.last_name)) LIKE '%athlete_name%'
  AND match->>'win_loss' = 'L'  -- Get losses
ORDER BY (match->>'date') DESC;
```

---

## Name Matching Best Practices

1. **Use Case-Insensitive Matching**:
   ```sql
   LOWER(TRIM(name)) LIKE '%athlete_name%'
   ```

2. **Handle Name Variations**:
   - Check both `first_name || ' ' || last_name` and `name` fields
   - Some records may have middle names or initials

3. **Flexible Matching**:
   ```sql
   WHERE (
     LOWER(TRIM(name)) LIKE '%liam%hickey%'
     OR LOWER(TRIM(name)) LIKE '%hickey%liam%'
   )
   ```

---

## Grade Level Handling

The `grade` field can be stored in multiple formats:
- **Text**: "Freshman", "Sophomore", "Junior", "Senior"
- **Numeric**: "9", "10", "11", "12"
- **Abbreviated**: "Fr", "So", "Jr", "Sr"

**Always check multiple formats**:
```sql
WHERE LOWER(grade) IN ('freshman', '9', 'fr')
```

---

## Season Format

Seasons are typically stored as:
- **Format**: "YYYY-YY" (e.g., "2024-25", "2023-24")
- **Order**: Sort by season DESC for most recent first

---

## Win/Loss Indicators

Individual matches use different fields:
- `win_loss`: 'W' or 'L'
- `result`: 'Win' or 'Loss'

**Check both**:
```sql
WHERE (
  match->>'win_loss' = 'L' 
  OR match->>'result' ILIKE '%loss%'
)
```

---

## Linking Tables

### Matches to Athletes
- **Primary**: `matches.athlete_id` → `athletes.id`
- **Fallback**: Match by name if `athlete_id` is NULL

### Example Join:
```sql
SELECT a.name, m.season, m.wins, m.losses
FROM matches m
JOIN athletes a ON a.id = m.athlete_id
WHERE LOWER(TRIM(a.name)) LIKE '%athlete_name%';
```

---

## Performance Tips

1. **Use Indexes**: 
   - `idx_athletes_graduationyear` for year filtering
   - `idx_matches_name_season` for name/season queries
   - `idx_matches_grade` for grade filtering

2. **Filter Early**: Apply name/season filters before JSONB extraction

3. **Limit Results**: Use `LIMIT` when you only need one result

---

## Example Use Cases

### Use Case 1: "What college does [Athlete] wrestle for?"
**Table**: `athletes`  
**Query**: See `query-athlete-college-commitment.sql` - Query 1

### Use Case 2: "What was [Athlete]'s record as a [Grade]?"
**Table**: `matches`  
**Query**: See `query-athlete-match-records.sql` - Query 1

### Use Case 3: "What losses did [Athlete] have?"
**Table**: `matches` (JSONB field)  
**Query**: See `query-athlete-match-records.sql` - Query 2

### Use Case 4: "What was [Athlete]'s career record?"
**Table**: `matches` (sum across seasons)  
**Query**: See `query-athlete-match-records.sql` - Query 3

---

## Files Reference

1. **`college-commitment-queries-for-legacy-system.md`**
   - Complete documentation for college commitment queries
   - Includes all field descriptions and query patterns

2. **`query-athlete-college-commitment.sql`**
   - Ready-to-use SQL queries for college commitments
   - Includes examples for current vs future status

3. **`athlete-match-and-season-queries-for-legacy-system.md`**
   - Complete documentation for match and season data
   - Includes JSONB query patterns

4. **`query-athlete-match-records.sql`**
   - Ready-to-use SQL queries for match records
   - Includes examples for season records, career totals, and individual matches

---

## Quick Start

1. **For College Questions**: Open `query-athlete-college-commitment.sql`
2. **For Match Questions**: Open `query-athlete-match-records.sql`
3. **Replace `'%athlete_name%'`** with the athlete you're querying
4. **Adjust filters** (grade, season, etc.) as needed
5. **Run the query**

---

## Support

For detailed field descriptions and advanced query patterns, refer to the individual documentation files listed above.





