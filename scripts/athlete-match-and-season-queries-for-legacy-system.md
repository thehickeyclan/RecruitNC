# Athlete Match Data and Season Records Queries for Legacy NC Data System

## Database Location

Athlete match data and season records are stored in two main places:

### 1. `matches` Table (Primary Storage)
Stores season-by-season match data with individual match details.

### 2. `athletes` Table (Summary Data)
Stores career record summary in `careerRecord` field (TEXT format like "120-15").

---

## Matches Table Structure

### Key Fields:
- **`athlete_id`** (TEXT) - Links to `athletes.id` (may be NULL for unlinked records)
- **`wrestler_id`** (TEXT) - Unique identifier per season (e.g., "liam_hickey_2024-25")
- **`first_name`** (TEXT) - Athlete's first name
- **`last_name`** (TEXT) - Athlete's last name
- **`season`** (TEXT) - Season identifier (e.g., "2024-25", "2023-24")
- **`grade`** (TEXT) - Grade level (e.g., "Freshman", "Sophomore", "Junior", "Senior", or "9", "10", "11", "12")
- **`high_school`** (TEXT) - High school name

### Season Summary Stats (per row):
- **`total_matches`** (INTEGER) - Total matches in season
- **`wins`** (INTEGER) - Wins in season
- **`losses`** (INTEGER) - Losses in season
- **`pins`** (INTEGER) - Pins in season
- **`tech_falls`** (INTEGER) - Tech falls in season
- **`decisions`** (INTEGER) - Decisions in season
- **`major_decisions`** (INTEGER) - Major decisions in season
- **`forfeits_won`** (INTEGER) - Forfeits won
- **`pin_percentage`** (DECIMAL) - Pin percentage
- **`tf_percentage`** (DECIMAL) - Tech fall percentage
- **`finishing_percentage`** (DECIMAL) - Finishing percentage

### Individual Matches (JSONB):
- **`matches`** (JSONB) - Array of individual match objects

### Individual Match Object Structure:
```json
{
  "date": "2024-12-01",
  "weight": 157,
  "opponent": "John Smith",
  "opponent_name": "John Smith",
  "opponent_school": "Test High School",
  "result": "Win",
  "method": "Pin",
  "time": "2:15",
  "venue": "Cardinal Gibbons Duals",
  "tournament": "Regional Tournament",
  "win_loss": "W",
  "opponent_percentage": "75.5%"
}
```

---

## Query Examples

### Query 1: "What was Tobin McNair's record as a freshman?"

```sql
-- Get season record for a specific grade/year
SELECT 
  first_name,
  last_name,
  season,
  grade,
  high_school,
  wins,
  losses,
  total_matches,
  CASE 
    WHEN total_matches > 0 
    THEN ROUND((wins::DECIMAL / total_matches) * 100, 1) 
    ELSE 0 
  END as win_percentage,
  pins,
  tech_falls,
  decisions,
  major_decisions
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%tobin%mcnair%'
  AND LOWER(grade) IN ('freshman', '9', 'fr')
ORDER BY season DESC
LIMIT 1;
```

### Query 2: "What losses did Liam Hickey have in his high school career?"

```sql
-- Get all losses from individual matches across all seasons
SELECT 
  m.first_name,
  m.last_name,
  m.season,
  m.grade,
  m.high_school,
  match->>'date' as match_date,
  match->>'weight' as weight,
  match->>'opponent' as opponent,
  match->>'opponent_name' as opponent_name,
  match->>'opponent_school' as opponent_school,
  match->>'method' as method,
  match->>'venue' as venue,
  match->>'tournament' as tournament,
  match->>'opponent_percentage' as opponent_percentage
FROM matches m,
  jsonb_array_elements(m.matches) as match
WHERE LOWER(TRIM(m.first_name || ' ' || m.last_name)) LIKE '%liam%hickey%'
  AND (match->>'win_loss' = 'L' OR match->>'result' ILIKE '%loss%')
ORDER BY 
  m.season DESC,
  (match->>'date') DESC;
```

### Query 3: "What was Colt Campbell's HS career record?" (All 4 years)

```sql
-- Get career totals across all seasons
SELECT 
  first_name,
  last_name,
  high_school,
  COUNT(DISTINCT season) as seasons_competed,
  SUM(wins) as career_wins,
  SUM(losses) as career_losses,
  SUM(total_matches) as career_total_matches,
  SUM(pins) as career_pins,
  SUM(tech_falls) as career_tech_falls,
  SUM(decisions) as career_decisions,
  SUM(major_decisions) as career_major_decisions,
  CASE 
    WHEN SUM(total_matches) > 0 
    THEN ROUND((SUM(wins)::DECIMAL / SUM(total_matches)) * 100, 1) 
    ELSE 0 
  END as career_win_percentage,
  CASE 
    WHEN SUM(total_matches) > 0 
    THEN ROUND((SUM(pins)::DECIMAL / SUM(total_matches)) * 100, 1) 
    ELSE 0 
  END as career_pin_percentage,
  -- Individual season breakdown
  jsonb_agg(
    jsonb_build_object(
      'season', season,
      'grade', grade,
      'wins', wins,
      'losses', losses,
      'total_matches', total_matches,
      'record', wins || '-' || losses
    ) ORDER BY season
  ) as season_breakdown
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%colt%campbell%'
GROUP BY first_name, last_name, high_school
ORDER BY first_name, last_name;
```

### Query 4: Get All Seasons for an Athlete (Detailed)

```sql
-- Get all seasons with detailed stats
SELECT 
  season,
  grade,
  high_school,
  wins,
  losses,
  total_matches,
  wins || '-' || losses as record,
  CASE 
    WHEN total_matches > 0 
    THEN ROUND((wins::DECIMAL / total_matches) * 100, 1) 
    ELSE 0 
  END as win_percentage,
  pins,
  tech_falls,
  decisions,
  major_decisions,
  pin_percentage,
  tf_percentage,
  finishing_percentage
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%athlete_name%'
ORDER BY 
  CASE grade
    WHEN 'Freshman' THEN 1
    WHEN '9' THEN 1
    WHEN 'Sophomore' THEN 2
    WHEN '10' THEN 2
    WHEN 'Junior' THEN 3
    WHEN '11' THEN 3
    WHEN 'Senior' THEN 4
    WHEN '12' THEN 4
    ELSE 0
  END,
  season;
```

### Query 5: Get All Wins for an Athlete

```sql
-- Get all wins from individual matches
SELECT 
  m.first_name,
  m.last_name,
  m.season,
  m.grade,
  match->>'date' as match_date,
  match->>'weight' as weight,
  match->>'opponent' as opponent,
  match->>'opponent_school' as opponent_school,
  match->>'method' as method,
  match->>'venue' as venue,
  match->>'tournament' as tournament
FROM matches m,
  jsonb_array_elements(m.matches) as match
WHERE LOWER(TRIM(m.first_name || ' ' || m.last_name)) LIKE '%athlete_name%'
  AND (match->>'win_loss' = 'W' OR match->>'result' ILIKE '%win%')
ORDER BY 
  m.season DESC,
  (match->>'date') DESC;
```

### Query 6: Get Career Record Summary (Simple)

```sql
-- Simple career record query
SELECT 
  first_name,
  last_name,
  high_school,
  SUM(wins) || '-' || SUM(losses) as career_record,
  SUM(wins) as career_wins,
  SUM(losses) as career_losses,
  SUM(total_matches) as career_matches
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%athlete_name%'
GROUP BY first_name, last_name, high_school;
```

### Query 7: Get Record by Specific Season

```sql
-- Get record for a specific season
SELECT 
  first_name,
  last_name,
  season,
  grade,
  high_school,
  wins || '-' || losses as record,
  wins,
  losses,
  total_matches,
  pins,
  tech_falls
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%athlete_name%'
  AND season = '2024-25'  -- Replace with desired season
ORDER BY season DESC;
```

### Query 8: Get All Matches (Wins and Losses) for an Athlete

```sql
-- Get complete match history
SELECT 
  m.first_name,
  m.last_name,
  m.season,
  m.grade,
  match->>'date' as match_date,
  match->>'weight' as weight,
  match->>'opponent' as opponent,
  match->>'opponent_school' as opponent_school,
  match->>'win_loss' as result,
  match->>'method' as method,
  match->>'venue' as venue,
  match->>'tournament' as tournament,
  match->>'opponent_percentage' as opponent_percentage
FROM matches m,
  jsonb_array_elements(m.matches) as match
WHERE LOWER(TRIM(m.first_name || ' ' || m.last_name)) LIKE '%athlete_name%'
ORDER BY 
  m.season DESC,
  (match->>'date') DESC;
```

### Query 9: Get Record by Grade Level (All Athletes)

```sql
-- Get all freshman records, for example
SELECT 
  first_name,
  last_name,
  high_school,
  season,
  wins || '-' || losses as record,
  wins,
  losses,
  total_matches
FROM matches
WHERE LOWER(grade) IN ('freshman', '9', 'fr')
ORDER BY wins DESC, losses ASC;
```

### Query 10: Link Matches to Athlete Profile (if athlete_id exists)

```sql
-- Get matches linked to athlete profile
SELECT 
  a.name as athlete_name,
  a.graduationyear,
  m.season,
  m.grade,
  m.wins,
  m.losses,
  m.total_matches,
  m.wins || '-' || m.losses as record
FROM matches m
JOIN athletes a ON a.id = m.athlete_id
WHERE LOWER(TRIM(a.name)) LIKE '%athlete_name%'
ORDER BY 
  CASE m.grade
    WHEN 'Freshman' THEN 1
    WHEN '9' THEN 1
    WHEN 'Sophomore' THEN 2
    WHEN '10' THEN 2
    WHEN 'Junior' THEN 3
    WHEN '11' THEN 3
    WHEN 'Senior' THEN 4
    WHEN '12' THEN 4
    ELSE 0
  END;
```

---

## Grade Level Mapping

The `grade` field can be stored in different formats:
- **Text**: "Freshman", "Sophomore", "Junior", "Senior"
- **Numeric**: "9", "10", "11", "12"
- **Abbreviated**: "Fr", "So", "Jr", "Sr"

When querying, use case-insensitive matching with multiple formats:
```sql
WHERE LOWER(grade) IN ('freshman', '9', 'fr')
```

---

## Name Matching Tips

1. **Flexible Name Matching**: Use `LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%name%'`
2. **Handle Variations**: Some records may have middle names or initials
3. **Check Both Tables**: If `athlete_id` is NULL, match by name from `matches` table

---

## Indexes Available for Performance

- `idx_matches_wrestler_id` - Fast lookup by wrestler_id
- `idx_matches_name_season` - Fast lookup by name and season
- `idx_matches_high_school` - Fast lookup by school
- `idx_matches_season` - Fast filtering by season
- `idx_matches_grade` - Fast filtering by grade

---

## Notes for Legacy System Integration

1. **JSONB Queries**: Use `jsonb_array_elements()` to extract individual matches from the JSONB array
2. **Grade Variations**: Always check multiple grade formats (text, numeric, abbreviated)
3. **Season Format**: Seasons are typically stored as "YYYY-YY" (e.g., "2024-25")
4. **Win/Loss Indicators**: Check both `win_loss` field ('W'/'L') and `result` field ('Win'/'Loss')
5. **Career Totals**: Sum across all seasons for career statistics
6. **Athlete Linking**: If `athlete_id` exists, join with `athletes` table for additional profile data





