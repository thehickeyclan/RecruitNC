# LegacyNC NHSCA Data Integration Guide

## ✅ Yes, LegacyNC Can Access All NHSCA Data

Since LegacyNC and Recruit-NC share the same Supabase database, **all NHSCA placement data is immediately available** to LegacyNC once it's imported and merged.

---

## How LegacyNC Can Access NHSCA Data

### Option 1: From `athletes` Table (Recommended)

Once placements are merged into athlete profiles, LegacyNC automatically gets the data when querying athletes:

```typescript
// LegacyNC code - this already works!
const { data: athlete } = await supabase
  .from("athletes")
  .select("*")
  .eq("id", athleteId)
  .single()

// athlete.nhsca_results contains:
// [
//   {
//     "year": 2025,
//     "placement": "Champion",
//     "record": "6-0",
//     "weight": "157",
//     "division": "Senior",
//     "notes": ""
//   }
// ]
```

**No code changes needed** - the data is already in the `athletes` table that LegacyNC queries.

---

### Option 2: Query `nhsca_placements` Table Directly

If LegacyNC wants to query placements directly (e.g., for leaderboards, filters, etc.):

```typescript
// Get all 2025 NHSCA placements
const { data: placements } = await supabase
  .from("nhsca_placements")
  .select("*")
  .eq("year", 2025)
  .order("placement", { ascending: true })
  .order("weight_class", { ascending: true })

// Get placements for a specific athlete
const { data: athletePlacements } = await supabase
  .from("nhsca_placements")
  .select("*")
  .eq("athlete_id", athleteId)
  .eq("year", 2025)

// Get all champions
const { data: champions } = await supabase
  .from("nhsca_placements")
  .select(`
    *,
    athletes!inner(name, highschool)
  `)
  .eq("year", 2025)
  .eq("placement", 1)
```

---

### Option 3: Use Existing Tournament Utilities

LegacyNC can use the same tournament utilities that Recruit-NC uses:

```typescript
import { getNhscaResults, getLatestNhscaResult } from '@/lib/tournament-utils'

// In LegacyNC athlete display component
const nhscaResults = getNhscaResults(athlete)
const latestResult = getLatestNhscaResult(athlete)

// Display in UI
{latestResult && (
  <div>
    <span>NHSCA {latestResult.placement}</span>
    <span>{latestResult.record}</span>
  </div>
)}
```

---

## Data Flow for LegacyNC

```
Recruit-NC Admin:
  1. Imports NHSCA 2025 placements → nhsca_placements table
  2. Matches to athletes → nhsca_placements.athlete_id
  3. Merges to profiles → athletes.nhsca_results JSONB

LegacyNC (Automatic):
  ✅ Queries athletes table → Gets nhsca_results automatically
  ✅ Can query nhsca_placements table directly
  ✅ Can use tournament utility functions
```

---

## Example: Display NHSCA Data in LegacyNC

### In an Athlete Profile Component:

```typescript
// LegacyNC athlete profile page
export default function AthleteProfile({ athleteId }) {
  const { data: athlete } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", athleteId)
    .single()

  // Parse NHSCA results
  const nhscaResults = athlete?.nhsca_results || []
  const latestNHSCA = nhscaResults
    .filter(r => r.year === 2025)
    .sort((a, b) => b.year - a.year)[0]

  return (
    <div>
      <h2>{athlete.name}</h2>
      
      {latestNHSCA && (
        <div className="nhsca-badge">
          <span>2025 NHSCA {latestNHSCA.placement}</span>
          <span>{latestNHSCA.division} - {latestNHSCA.weight}lbs</span>
          {latestNHSCA.record && <span>Record: {latestNHSCA.record}</span>}
        </div>
      )}

      {/* All NHSCA Results */}
      {nhscaResults.length > 0 && (
        <div>
          <h3>NHSCA Tournament History</h3>
          {nhscaResults.map(result => (
            <div key={result.year}>
              <strong>{result.year}:</strong> {result.placement}
              {result.division && ` (${result.division})`}
              {result.weight && ` - ${result.weight}lbs`}
              {result.record && ` - ${result.record}`}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Example: Filter Athletes by NHSCA Performance

```typescript
// LegacyNC search/filter page
export async function getNHSCAAllAmericans(year = 2025) {
  // Option 1: Query placements table
  const { data: placements } = await supabase
    .from("nhsca_placements")
    .select(`
      *,
      athletes!inner(id, name, highschool, weightclass)
    `)
    .eq("year", year)
    .lte("placement", 8) // Top 8 = All-American
    .order("placement", { ascending: true })

  // Option 2: Query athletes with JSONB filter
  const { data: athletes } = await supabase
    .from("athletes")
    .select("*")
    .contains("nhsca_results", [
      { year: year, placement: "Champion" },
      { year: year, placement: "Finalist" },
      { year: year, placement: "3rd" },
      // ... etc
    ])

  return placements || []
}
```

---

## Example: NHSCA Leaderboard Page

```typescript
// LegacyNC NHSCA leaderboard
export default async function NHSCALeaderboard() {
  const { data: champions } = await supabase
    .from("nhsca_placements")
    .select(`
      *,
      athletes!inner(name, highschool, weightclass)
    `)
    .eq("year", 2025)
    .eq("placement", 1)
    .order("weight_class", { ascending: true })

  return (
    <div>
      <h1>2025 NHSCA Champions</h1>
      {champions?.map(placement => (
        <div key={placement.id}>
          <strong>{placement.athletes.name}</strong>
          <span>{placement.weight_class}lbs - {placement.division}</span>
          <span>{placement.athletes.highschool}</span>
        </div>
      ))}
    </div>
  )
}
```

---

## Database Tables Available to LegacyNC

### 1. `athletes` Table
- **Column:** `nhsca_results` (JSONB)
- **Contains:** All merged NHSCA tournament data
- **Format:** `[{year, placement, record, weight, division, notes}]`
- **Access:** Automatic when querying athletes

### 2. `nhsca_placements` Table
- **Contains:** All imported placements (matched and unmatched)
- **Use Cases:** 
  - Leaderboards
  - Statistics
  - Filtering
  - Admin matching UI
- **Columns:**
  - `athlete_name`, `placement`, `weight_class`, `division`
  - `athlete_id` (if matched)
  - `match_status`, `match_confidence`

---

## Benefits for LegacyNC

1. **No Import Needed** - Data is already in shared database
2. **Automatic Updates** - When Recruit-NC merges data, LegacyNC sees it immediately
3. **Rich Data** - Access to placement, record, weight, division, year
4. **Flexible Queries** - Can query by year, placement, weight class, division
5. **No Code Changes Required** - Works with existing athlete queries

---

## Testing in LegacyNC

After Recruit-NC imports and merges NHSCA 2025 data:

1. **Check an athlete profile:**
   ```sql
   SELECT name, nhsca_results 
   FROM athletes 
   WHERE nhsca_results IS NOT NULL 
   LIMIT 5;
   ```

2. **Check placements table:**
   ```sql
   SELECT athlete_name, placement, weight_class, division, match_status
   FROM nhsca_placements
   WHERE year = 2025
   LIMIT 10;
   ```

3. **View in LegacyNC UI:**
   - Navigate to any athlete profile
   - Check if `nhsca_results` appears in the data
   - Display in UI components

---

## Summary

✅ **LegacyNC automatically has access** to all NHSCA data once it's imported and merged in Recruit-NC

✅ **No additional setup needed** - just query the `athletes` table as usual

✅ **Can also query `nhsca_placements`** for advanced features like leaderboards

✅ **Data is shared in real-time** - both apps see updates immediately

---

**Questions?** The data structure is the same for both apps since they share the database. LegacyNC can use the exact same queries and utilities that Recruit-NC uses.

