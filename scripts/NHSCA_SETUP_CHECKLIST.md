# NHSCA Setup Checklist

## Step 1: Create the Placements Table

Run this SQL in Supabase SQL Editor:

```sql
-- Create NHSCA Placements table for bulk import and matching
-- This table stores all NHSCA placements before they're matched to athlete profiles

CREATE TABLE IF NOT EXISTS nhsca_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Tournament Information
  year INTEGER NOT NULL,
  tournament_name TEXT DEFAULT 'NHSCA National Championship',
  
  -- Athlete Information (from import)
  athlete_name TEXT NOT NULL,
  high_school TEXT,
  state TEXT DEFAULT 'NC',
  
  -- Placement Details
  placement INTEGER, -- 1, 2, 3, 4, 5, 6, 7, 8 (NULL for participants who didn't place)
  weight_class TEXT NOT NULL,
  division TEXT NOT NULL, -- Freshman, Sophomore, Junior, Senior
  record TEXT, -- e.g., "5-1", "6-0"
  
  -- Matching Status
  athlete_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  match_status TEXT DEFAULT 'unmatched', -- 'unmatched', 'auto_matched', 'manually_matched', 'merged'
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00
  match_method TEXT, -- 'exact_name', 'name_school', 'name_weight', 'manual'
  
  -- Metadata
  notes TEXT,
  source TEXT DEFAULT 'bulk_import_2025',
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  matched_at TIMESTAMP WITH TIME ZONE,
  merged_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_year ON nhsca_placements(year);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_athlete_name ON nhsca_placements(athlete_name);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_athlete_id ON nhsca_placements(athlete_id);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_match_status ON nhsca_placements(match_status);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_division_weight ON nhsca_placements(division, weight_class);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_placement ON nhsca_placements(placement);

-- Full text search index for name matching (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_name_trgm ON nhsca_placements USING gin(athlete_name gin_trgm_ops);

-- Add helpful comments
COMMENT ON TABLE nhsca_placements IS 'Bulk NHSCA tournament placements - used for import, matching, and merging into athlete profiles';
COMMENT ON COLUMN nhsca_placements.match_status IS 'unmatched: not yet linked, auto_matched: automatically matched, manually_matched: admin matched, merged: data merged into athlete profile';
COMMENT ON COLUMN nhsca_placements.match_confidence IS 'Confidence score 0.00-1.00 for automatic matching';
COMMENT ON COLUMN nhsca_placements.match_method IS 'How the match was made: exact_name, name_school, name_weight, manual';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_nhsca_placements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nhsca_placements_updated_at
  BEFORE UPDATE ON nhsca_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_nhsca_placements_updated_at();
```

---

## Step 2: Create Matching Functions

Run this SQL in Supabase SQL Editor:

```sql
-- SQL Functions for NHSCA Placement Matching
-- These functions handle automatic matching of placements to athlete profiles

-- Function 1: Match by exact name
CREATE OR REPLACE FUNCTION match_nhsca_exact_name(tournament_year INTEGER)
RETURNS TABLE(matched_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH matched AS (
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
      AND np.year = tournament_year
    RETURNING np.id
  )
  SELECT COUNT(*)::INTEGER FROM matched;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Match by name + school
CREATE OR REPLACE FUNCTION match_nhsca_name_school(tournament_year INTEGER)
RETURNS TABLE(matched_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH matched AS (
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
      AND np.year = tournament_year
    RETURNING np.id
  )
  SELECT COUNT(*)::INTEGER FROM matched;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Match by name + weight class
CREATE OR REPLACE FUNCTION match_nhsca_name_weight(tournament_year INTEGER)
RETURNS TABLE(matched_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH matched AS (
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
      AND np.year = tournament_year
    RETURNING np.id
  )
  SELECT COUNT(*)::INTEGER FROM matched;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Merge matched placements into athlete profiles
CREATE OR REPLACE FUNCTION merge_nhsca_to_profiles(tournament_year INTEGER)
RETURNS TABLE(merged_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH merged AS (
    UPDATE athletes a
    SET nhsca_results = (
      SELECT COALESCE(
        jsonb_agg(
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
                ELSE 'Participated'
              END,
            'record', COALESCE(np.record, ''),
            'weight', np.weight_class,
            'division', np.division,
            'notes', COALESCE(np.notes, '')
          ) ORDER BY np.year DESC
        ),
        '[]'::jsonb
      )
      FROM nhsca_placements np
      WHERE np.athlete_id = a.id
        AND np.match_status IN ('auto_matched', 'manually_matched')
        AND np.merged_at IS NULL
        AND np.year = tournament_year
    )
    WHERE EXISTS (
      SELECT 1 FROM nhsca_placements np
      WHERE np.athlete_id = a.id
        AND np.match_status IN ('auto_matched', 'manually_matched')
        AND np.merged_at IS NULL
        AND np.year = tournament_year
    )
    RETURNING a.id
  )
  SELECT COUNT(*)::INTEGER FROM merged;
END;
$$ LANGUAGE plpgsql;

-- Function 5: Mark merged placements
CREATE OR REPLACE FUNCTION mark_nhsca_merged(tournament_year INTEGER)
RETURNS TABLE(marked_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH marked AS (
    UPDATE nhsca_placements
    SET merged_at = NOW()
    WHERE match_status IN ('auto_matched', 'manually_matched')
      AND merged_at IS NULL
      AND year = tournament_year
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER FROM marked;
END;
$$ LANGUAGE plpgsql;
```

---

## Step 3: Verify Tables Exist

Run this to verify the `athletes` table has the `nhsca_results` column:

```sql
-- Check if nhsca_results column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'athletes' 
AND column_name = 'nhsca_results';

-- If it doesn't exist, create it:
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS nhsca_results JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN athletes.nhsca_results IS 'JSON array of NHSCA tournament results: [{year, placement, record, weight, division, notes}]';
```

---

## Step 4: Import Your Data

### Option A: Via API (Recommended)

Use the bulk import endpoint:
```
POST /api/admin/nhsca-placements/bulk-import
```

With your JSON data:
```json
{
  "year": 2025,
  "placements": [
    // Your JSON array here
  ]
}
```

### Option B: Via Supabase Dashboard

1. Go to Supabase Dashboard → Table Editor
2. Select `nhsca_placements` table
3. Click "Insert" → "Import data from CSV"
4. Convert your JSON to CSV first (or use SQL insert)

---

## Step 5: Match Placements to Athletes

After importing, run matching:

```sql
-- Match by exact name
SELECT * FROM match_nhsca_exact_name(2025);

-- Match by name + school (for remaining unmatched)
SELECT * FROM match_nhsca_name_school(2025);

-- Match by name + weight (for remaining unmatched)
SELECT * FROM match_nhsca_name_weight(2025);
```

Or use the API:
```
POST /api/admin/nhsca-placements/match
{
  "year": 2025,
  "method": "all"
}
```

---

## Step 6: Merge into Athlete Profiles

Once matched, merge the data:

```sql
-- Merge matched placements into athlete profiles
SELECT * FROM merge_nhsca_to_profiles(2025);

-- Mark as merged
SELECT * FROM mark_nhsca_merged(2025);
```

Or use the API:
```
POST /api/admin/nhsca-placements/merge
{
  "year": 2025
}
```

---

## Quick Verification Queries

```sql
-- Check how many placements imported
SELECT year, COUNT(*) as count, COUNT(placement) as placers
FROM nhsca_placements
GROUP BY year
ORDER BY year DESC;

-- Check match status
SELECT match_status, COUNT(*) as count
FROM nhsca_placements
WHERE year = 2025
GROUP BY match_status;

-- Check unmatched (need manual review)
SELECT athlete_name, high_school, placement, weight_class, division
FROM nhsca_placements
WHERE year = 2025 AND match_status = 'unmatched'
ORDER BY placement NULLS LAST, weight_class
LIMIT 20;
```

---

## Summary

**Run these scripts in order:**
1. ✅ `create-nhsca-placements-table.sql` (Step 1)
2. ✅ `create-nhsca-matching-functions.sql` (Step 2)
3. ✅ Verify `athletes.nhsca_results` column exists (Step 3)
4. ⏳ Import your JSON data (Step 4)
5. ⏳ Match placements to athletes (Step 5)
6. ⏳ Merge into profiles (Step 6)

**Files to reference:**
- `scripts/create-nhsca-placements-table.sql`
- `scripts/create-nhsca-matching-functions.sql`
- `scripts/nhsca-2025-bulk-import-guide.md` (full guide)

