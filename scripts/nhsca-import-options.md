# NHSCA 2025 Import Options

## Data Overview

You have:
- **Total entries:** ~500+ participants
- **Placers only:** 24 (entries with `placement` field: 1-8)
- **Non-placers:** ~476+ (entries without `placement` field)

## Import Options

### Option 1: Import Only Placers (Recommended)

**Why:** 
- Only 24 placers = All-Americans
- These are the most important for rankings/profiles
- Cleaner data set
- Matches your statement: "We only had 24 placers"

**What gets imported:**
- Only entries with `placement: 1-8`
- These are the All-Americans

**How:**
```bash
# Filter JSON to only placers, then import
node scripts/import-nhsca-2025.js
# Then use the filtered JSON file
```

### Option 2: Import All Participants

**Why:**
- Complete tournament history
- Shows who competed even if they didn't place
- Useful for statistics/participation data

**What gets imported:**
- All entries
- `placement` = `null` for non-placers
- `placement` = `1-8` for placers

**How:**
```bash
# Import the full JSON as-is
# API will handle null placements automatically
```

## Recommendation

**Import only placers (Option 1)** because:
1. You said "we only had 24 placers" - suggests you want just those
2. Placers are what matter for rankings/profiles
3. Non-placers can be added later if needed
4. Cleaner, more focused dataset

## Next Steps

1. **Save your JSON** to `scripts/nhsca-2025-data.json`
2. **Run filter script:** `node scripts/import-nhsca-2025.js`
3. **Import placers only** via API or SQL

Or if you want all participants:
- Just import the full JSON as-is (placement will be null for non-placers)

