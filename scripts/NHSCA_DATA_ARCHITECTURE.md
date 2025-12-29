# NHSCA Data Architecture: LegacyNC vs Recruit-NC

## Current State

### LegacyNC
- **Has:** NHSCA placement data (top 8 placers) from 1990+
- **Stored in:** `athletes.nhsca_results` JSONB column (or old year-specific columns)
- **Format:** `[{year, placement, record, weight, division, notes}]`
- **Example:** `[{"year": 2025, "placement": "3rd", "record": "5-1", ...}]`

### Recruit-NC
- **Has:** New `nhsca_placements` table for bulk import
- **Purpose:** Store ALL participants (placers AND non-placers) before matching
- **Auto-fetch:** Pulls from `nhsca_placements` → merges into `athletes.nhsca_results`

## Answer: Do It in Recruit-NC ✅

### Why Recruit-NC?

1. **Infrastructure Already Built**
   - `nhsca_placements` table created
   - Bulk import API ready
   - Auto-fetch logic implemented
   - Matching functions ready
   - Analytics dashboard created

2. **Shared Database**
   - Both apps use the same Supabase database
   - Data imported in Recruit-NC is immediately available to LegacyNC
   - No duplication needed

3. **Unified Data Flow**
   ```
   Import JSON → nhsca_placements table → Match to athletes → Merge into athletes.nhsca_results
                                                                         ↑
                                                              Both apps read from here
   ```

4. **Complements Existing Data**
   - LegacyNC has placers (top 8)
   - New system adds participation records (non-placers)
   - Both merge into same `athletes.nhsca_results` column

## How It Works

### Step 1: Import Participation Data (Recruit-NC)
```bash
POST /api/admin/nhsca-placements/bulk-import
{
  "year": 2025,
  "placements": [
    {"athlete_name": "John Doe", "placement": null, "record": "2-2", ...},  // Non-placer
    {"athlete_name": "Jane Smith", "placement": 3, "record": "5-1", ...}     // Placer
  ]
}
```

### Step 2: Auto-Match (Recruit-NC)
```bash
POST /api/admin/nhsca-placements/match
```
- Matches placements to existing athlete profiles
- Uses name, school, weight class matching

### Step 3: Merge into Profiles (Recruit-NC)
```bash
POST /api/admin/nhsca-placements/merge
```
- Merges matched data into `athletes.nhsca_results`
- Updates existing entries or adds new ones

### Step 4: Use in Both Apps
**Recruit-NC:**
```typescript
const { data: athlete } = await supabase
  .from("athletes")
  .select("*")
  .eq("id", athleteId)
  .single()

// athlete.nhsca_results contains all data (placers + participants)
```

**LegacyNC:**
```typescript
// Same query - data is already there!
const { data: athlete } = await supabase
  .from("athletes")
  .select("*")
  .eq("id", athleteId)
  .single()

// athlete.nhsca_results contains all data
```

## Data Structure

### `nhsca_placements` Table (Bulk Import)
- **Purpose:** Staging area for imported data
- **Contains:** All participants (placers + non-placers)
- **Fields:** `athlete_name`, `placement` (1-8 or NULL), `record`, `weight_class`, `division`, `year`
- **Status:** `unmatched` → `matched` → `merged`

### `athletes.nhsca_results` JSONB (Final Destination)
- **Purpose:** Profile data used by both apps
- **Contains:** All NHSCA data for each athlete
- **Format:** `[{year, placement, record, weight, division, notes}]`
- **Access:** Both LegacyNC and Recruit-NC read from here

## Benefits

1. **Single Source of Truth**
   - All NHSCA data in one place (`athletes.nhsca_results`)
   - No duplication between apps

2. **Complete History**
   - LegacyNC placers (1990+)
   - New participation records (2022-2025)
   - All merged into profiles

3. **Automatic Updates**
   - Import in Recruit-NC
   - LegacyNC sees it immediately (shared database)

4. **Rankings & Profiles**
   - Use participation data for rankings
   - Show complete tournament history on profiles
   - Both apps benefit

## Next Steps

1. **Import 2025 data** via Recruit-NC bulk import API
2. **Match placements** to existing athlete profiles
3. **Merge into profiles** - updates `athletes.nhsca_results`
4. **Verify in LegacyNC** - query `athletes` table, check `nhsca_results` column

## Summary

✅ **Do it in Recruit-NC** - infrastructure is ready  
✅ **LegacyNC gets it automatically** - shared database  
✅ **No duplication** - single source of truth  
✅ **Complete data** - placers + participants  

The new participation data supplements LegacyNC's existing placement data, and both merge into the same `athletes.nhsca_results` column that both apps already use.

