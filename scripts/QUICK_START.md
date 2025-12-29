# NHSCA Setup - Quick Start

## ✅ Setup Complete Checklist

Run this verification script to confirm everything is ready:

```sql
-- See: scripts/verify-nhsca-setup.sql
```

## Next Steps

### 1. Import Your 2025 JSON Data

**Option A: Via API (Recommended)**
```bash
POST /api/admin/nhsca-placements/bulk-import
Content-Type: application/json

{
  "year": 2025,
  "placements": [
    // Your JSON array here
  ]
}
```

**Option B: Via Supabase Dashboard**
1. Go to Table Editor → `nhsca_placements`
2. Click "Insert" → "Import data from CSV"
3. Convert JSON to CSV first

### 2. Match Placements to Athletes

**Via SQL:**
```sql
SELECT * FROM match_nhsca_exact_name(2025);
SELECT * FROM match_nhsca_name_school(2025);
SELECT * FROM match_nhsca_name_weight(2025);
```

**Via API:**
```
POST /api/admin/nhsca-placements/match
{
  "year": 2025,
  "method": "all"
}
```

### 3. Merge into Profiles

**Via SQL:**
```sql
SELECT * FROM merge_nhsca_to_profiles(2025);
SELECT * FROM mark_nhsca_merged(2025);
```

**Via API:**
```
POST /api/admin/nhsca-placements/merge
{
  "year": 2025
}
```

### 4. View Analytics

Go to: `/admin/nhsca-analytics`

## What's Ready

✅ `nhsca_placements` table - for bulk import
✅ Matching functions - auto-match to athletes
✅ Merge functions - populate athlete profiles
✅ Auto-fetch - pulls data when profiles are created
✅ Analytics dashboard - win %, participants, best years
✅ API endpoints - bulk import, matching, merging

## Test It

1. Import a few test records
2. Run matching
3. Check `/admin/nhsca-analytics` to see stats
4. Create a test profile - should auto-fetch NHSCA data

