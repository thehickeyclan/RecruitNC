# NHSCA 2025 Bulk Placement Data - Import & Matching Guide

## Overview

This guide explains how to import and use bulk NHSCA 2025 placement data for all kids who placed, and integrate it into athlete profiles, rankings, and displays.

## Architecture

### Two-Phase Approach

1. **Bulk Import Table** (`nhsca_placements`)
   - Stores all placements before matching
   - Allows bulk CSV import
   - Supports matching algorithms
   - Tracks match status and confidence

2. **Athlete Profiles** (`athletes.nhsca_results` JSONB)
   - Final destination for matched data
   - Used in profiles, rankings, displays
   - Already integrated into existing system

## Step 1: Create the Table

Run this SQL in Supabase SQL Editor:

```sql
-- See: scripts/create-nhsca-placements-table.sql
```

This creates:
- `nhsca_placements` table for bulk data
- Indexes for fast matching
- Triggers for timestamps

## Step 2: Prepare Your Data

Your CSV should have these columns:

| Column | Required | Example | Notes |
|--------|----------|---------|-------|
| athlete_name | Yes | "John Smith" | Full name as it appears |
| high_school | No | "Cardinal Gibbons" | Helps with matching |
| placement | Yes | 1, 2, 3, 4, 5, 6, 7, 8 | Numeric placement |
| weight_class | Yes | "157" | Weight class |
| division | Yes | "Senior" | Freshman, Sophomore, Junior, Senior |
| record | No | "5-1" | Tournament record |
| state | No | "NC" | Defaults to "NC" |

## Step 3: Import Data

### Option A: Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard → Table Editor
2. Select `nhsca_placements` table
3. Click "Insert" → "Import data from CSV"
4. Upload your CSV file
5. Map columns to table fields
6. Import

### Option B: SQL Insert (For Programmatic Import)

```sql
INSERT INTO nhsca_placements (
  year,
  athlete_name,
  high_school,
  placement,
  weight_class,
  division,
  record,
  state
) VALUES
  (2025, 'John Smith', 'Cardinal Gibbons', 1, '157', 'Senior', '6-0', 'NC'),
  (2025, 'Jane Doe', 'Cary High', 3, '120', 'Junior', '5-1', 'NC'),
  -- ... more rows
;
```

### Option C: API Endpoint (For Automated Import)

Use the bulk import API endpoint (to be created):
```
POST /api/admin/nhsca-placements/bulk-import
```

## Step 4: Match Placements to Athletes

### Automatic Matching

Run this SQL to attempt automatic matching:

```sql
-- Match by exact name
UPDATE nhsca_placements np
SET 
  athlete_id = a.id,
  match_status = 'auto_matched',
  match_confidence = 1.0,
  match_method = 'exact_name',
  matched_at = NOW()
FROM athletes a
WHERE LOWER(TRIM(np.athlete_name)) = LOWER(TRIM(a.name))
  AND np.match_status = 'unmatched'
  AND np.year = 2025;
```

### Match by Name + School (Higher Confidence)

```sql
UPDATE nhsca_placements np
SET 
  athlete_id = a.id,
  match_status = 'auto_matched',
  match_confidence = 0.95,
  match_method = 'name_school',
  matched_at = NOW()
FROM athletes a
WHERE LOWER(TRIM(np.athlete_name)) = LOWER(TRIM(a.name))
  AND LOWER(TRIM(np.high_school)) = LOWER(TRIM(a.highschool))
  AND np.match_status = 'unmatched'
  AND np.year = 2025;
```

### Match by Name + Weight Class (For Ambiguous Names)

```sql
UPDATE nhsca_placements np
SET 
  athlete_id = a.id,
  match_status = 'auto_matched',
  match_confidence = 0.85,
  match_method = 'name_weight',
  matched_at = NOW()
FROM athletes a
WHERE LOWER(TRIM(np.athlete_name)) = LOWER(TRIM(a.name))
  AND np.weight_class = a.weightclass
  AND np.match_status = 'unmatched'
  AND np.year = 2025;
```

## Step 5: Review Unmatched Placements

Check what couldn't be automatically matched:

```sql
SELECT 
  athlete_name,
  high_school,
  placement,
  weight_class,
  division,
  record
FROM nhsca_placements
WHERE match_status = 'unmatched'
  AND year = 2025
ORDER BY placement, weight_class;
```

## Step 6: Manual Matching (Admin UI)

For unmatched placements, create an admin interface at:
- `/admin/nhsca-placements/match`

This will allow:
- View unmatched placements
- Search for athletes
- Manually link placements to profiles
- Bulk approve high-confidence matches

## Step 7: Merge into Athlete Profiles

Once matched, merge the data into `athletes.nhsca_results`:

```sql
-- Merge matched placements into athlete profiles
UPDATE athletes a
SET nhsca_results = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'year', np.year,
      'placement', 
        CASE np.placement
          WHEN 1 THEN 'Champion'
          WHEN 2 THEN 'Finalist'
          WHEN 3 THEN '3rd'
          WHEN 4 THEN '4th'
          WHEN 5 THEN '5th'
          WHEN 6 THEN '6th'
          WHEN 7 THEN '7th'
          WHEN 8 THEN '8th'
          ELSE np.placement::text
        END,
      'record', COALESCE(np.record, ''),
      'weight', np.weight_class,
      'division', np.division,
      'notes', COALESCE(np.notes, '')
    ) ORDER BY np.year DESC
  )
  FROM nhsca_placements np
  WHERE np.athlete_id = a.id
    AND np.match_status IN ('auto_matched', 'manually_matched')
    AND np.merged_at IS NULL
)
WHERE EXISTS (
  SELECT 1 FROM nhsca_placements np
  WHERE np.athlete_id = a.id
    AND np.match_status IN ('auto_matched', 'manually_matched')
    AND np.merged_at IS NULL
);

-- Mark as merged
UPDATE nhsca_placements
SET merged_at = NOW()
WHERE match_status IN ('auto_matched', 'manually_matched')
  AND merged_at IS NULL;
```

**Note:** This merges with existing `nhsca_results` - it doesn't overwrite. If an athlete already has 2025 NHSCA data, you may want to update instead of merge.

## Step 8: Use in Rankings & Profiles

Once merged, the data automatically appears in:

### Athlete Profiles
- `/athletes/[id]` - Shows NHSCA results
- `/unified-profile/[id]` - Tournament results section
- Prospect cards - Latest NHSCA placement badge

### Rankings
- Used in ranking calculations
- Filter by "NHSCA All-American"
- Sort by placement

### API Endpoints
- `GET /api/athletes/[id]` - Includes `nhsca_results`
- `GET /api/prospects` - Includes tournament data
- `GET /api/wrestling-achievements?athleteName=...` - Returns NHSCA data

## Data Flow Summary

```
CSV Import
    ↓
nhsca_placements table (unmatched)
    ↓
Automatic Matching (SQL or API)
    ↓
nhsca_placements table (matched)
    ↓
Manual Review (Admin UI)
    ↓
Merge to athletes.nhsca_results (JSONB)
    ↓
Display in Profiles, Rankings, Cards
```

## Benefits

1. **Bulk Import** - Import all 2025 placements at once
2. **Smart Matching** - Automatic matching with confidence scores
3. **Manual Review** - Admin can verify and fix matches
4. **No Duplicates** - Track what's been merged
5. **Audit Trail** - Know when/how data was matched
6. **Flexible** - Works with existing JSONB system
7. **Rankings Ready** - Data immediately available for calculations

## Example Queries

### Find All Champions
```sql
SELECT athlete_name, weight_class, division
FROM nhsca_placements
WHERE year = 2025 AND placement = 1
ORDER BY weight_class;
```

### Check Match Rate
```sql
SELECT 
  match_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM nhsca_placements
WHERE year = 2025
GROUP BY match_status;
```

### Find High-Confidence Unmatched (Potential Issues)
```sql
SELECT athlete_name, high_school, placement, weight_class
FROM nhsca_placements
WHERE match_status = 'unmatched'
  AND year = 2025
  AND high_school IS NOT NULL
ORDER BY placement;
```

## Next Steps

1. ✅ Create `nhsca_placements` table
2. ⏳ Create bulk import API endpoint
3. ⏳ Create admin matching UI
4. ⏳ Create merge script/endpoint
5. ⏳ Test with sample data
6. ⏳ Import full 2025 dataset

