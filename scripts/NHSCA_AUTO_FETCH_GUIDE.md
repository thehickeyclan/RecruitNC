# NHSCA Auto-Fetch for New Profiles

## Overview

When users create new athlete profiles, the system **automatically pulls in their NHSCA tournament records** from the last 4 years, just like it does for NCHSAA state tournament data.

---

## How It Works

### 1. Profile Creation Triggers Auto-Fetch

When a new athlete profile is created through any of these endpoints:
- `/api/admin/profile-submissions/review` (approving submissions)
- `/api/complete-add-athlete` (admin creating athletes)
- `/api/coaches/create-prospect` (coaches creating prospects)

The system automatically:
1. Queries the `nhsca_placements` table
2. Searches by athlete name (case-insensitive, partial match)
3. Gets placements from the last 4 years
4. Populates `athletes.nhsca_results` JSONB field

### 2. Data Source

The auto-fetch queries the `nhsca_placements` table that you populate with bulk NHSCA data:
- 2025 placements (when imported)
- 2024 placements (when imported)
- 2023 placements (when imported)
- 2022 placements (when imported)

**Year Range:** Last 4 years from graduation year (or current year if no graduation year)

---

## Example Flow

### User Creates Profile

```
User submits profile:
  Name: "John Smith"
  Graduation Year: 2025
  High School: "Cardinal Gibbons"
```

### System Auto-Fetches

```typescript
// Automatically queries:
SELECT * FROM nhsca_placements
WHERE athlete_name ILIKE '%John Smith%'
  AND year >= 2021  // (2025 - 4)
  AND year <= 2025
ORDER BY year DESC, placement ASC
```

### Result

```json
{
  "nhsca_results": [
    {
      "year": 2025,
      "placement": "Champion",
      "record": "6-0",
      "weight": "157",
      "division": "Senior",
      "notes": ""
    },
    {
      "year": 2024,
      "placement": "3rd",
      "record": "5-1",
      "weight": "152",
      "division": "Junior",
      "notes": ""
    }
  ]
}
```

---

## Implementation Details

### Helper Function

**File:** `lib/nhsca-auto-fetch.ts`

```typescript
import { autoFetchNHSCAForProfile } from "@/lib/nhsca-auto-fetch"

// In profile creation endpoint:
const nhscaResults = await autoFetchNHSCAForProfile(
  supabase,
  athleteName,
  graduationYear
)

// Then include in athlete data:
{
  nhsca_results: nhscaResults.length > 0 ? nhscaResults : null
}
```

### Matching Logic

- **Name Matching:** Case-insensitive, partial match (`ILIKE '%name%'`)
- **Year Range:** Last 4 years from graduation year
- **Multiple Results:** All matching placements are included
- **No Match:** Returns empty array, `nhsca_results` set to `null`

---

## Integration Points

### 1. Profile Submissions (Admin Approval)

**File:** `app/api/admin/profile-submissions/review/route.ts`

When admin approves a profile submission:
- Auto-fetches NHSCA data using submitted name
- Includes in athlete creation

### 2. Direct Athlete Creation

**File:** `app/api/complete-add-athlete/route.ts`

When admin creates athlete directly:
- Auto-fetches NHSCA data
- Merges with any manually entered NHSCA data

### 3. Coach Prospect Creation

**File:** `app/api/coaches/create-prospect/route.ts`

When coach creates a prospect:
- Auto-fetches NHSCA data
- Includes in prospect profile

---

## Benefits

1. **Automatic** - No manual data entry needed
2. **Complete** - Gets all 4 years of history
3. **Accurate** - Uses bulk imported tournament data
4. **Consistent** - Same format as NCHSAA auto-fetch
5. **User-Friendly** - Profiles are populated automatically

---

## Requirements

### Database Setup

1. **`nhsca_placements` table must exist**
   - Run: `scripts/create-nhsca-placements-table.sql`

2. **Data must be imported**
   - Import last 4 years of NHSCA placements
   - Use bulk import API or Supabase dashboard

3. **Matching is name-based**
   - Names in `nhsca_placements.athlete_name` should match profile names
   - Case-insensitive matching handles variations

---

## Matching Examples

### Exact Match
```
Profile Name: "John Smith"
Placement Name: "John Smith"
✅ Matches
```

### Case Variation
```
Profile Name: "john smith"
Placement Name: "John Smith"
✅ Matches (case-insensitive)
```

### Partial Match
```
Profile Name: "John Michael Smith"
Placement Name: "John Smith"
✅ Matches (partial match)
```

### No Match
```
Profile Name: "John Smith"
Placement Name: "Johnny Smith"
❌ No match (too different)
```

---

## Data Format

### Input (nhsca_placements table)
```sql
{
  athlete_name: "John Smith",
  year: 2025,
  placement: 1,
  weight_class: "157",
  division: "Senior",
  record: "6-0"
}
```

### Output (athletes.nhsca_results JSONB)
```json
[
  {
    "year": 2025,
    "placement": "Champion",
    "record": "6-0",
    "weight": "157",
    "division": "Senior",
    "notes": ""
  }
]
```

---

## Troubleshooting

### No NHSCA Data Found

**Possible Causes:**
1. Name doesn't match (check spelling variations)
2. Data not imported yet
3. Year range doesn't include athlete's years

**Solution:**
- Check `nhsca_placements` table for similar names
- Verify data import completed
- Manually add if needed

### Wrong Data Matched

**Possible Causes:**
1. Name too common (multiple "John Smith")
2. Partial match too broad

**Solution:**
- Use more specific matching (name + school)
- Manually verify and correct after creation

---

## Future Enhancements

1. **Fuzzy Matching** - Handle name variations better
2. **School + Name Matching** - More accurate for common names
3. **Weight Class Matching** - Additional validation
4. **Confidence Scores** - Flag uncertain matches for review

---

## Summary

✅ **Automatic** - NHSCA data pulls in automatically when profiles are created

✅ **Last 4 Years** - Gets complete tournament history

✅ **Same as NCHSAA** - Consistent with existing auto-fetch pattern

✅ **No User Action** - Happens behind the scenes

✅ **Uses Bulk Data** - Leverages imported `nhsca_placements` table

---

**Status:** ✅ Implemented and Ready

**Next Step:** Import last 4 years of NHSCA placement data into `nhsca_placements` table

