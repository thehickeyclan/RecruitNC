# Bentley Sly Tournament Data - Example Migration

## Current Structure (What You Have Now)

**Separate columns for each year:**
\`\`\`
nhsca_2025_placement: "3rd"
nhsca_2025_record: "5-1"
nhsca_2024_placement: "5th"
nhsca_2024_record: "4-2"
nhsca_2023_placement: null
nhsca_2023_record: null

super_32_2025_placement: "Champion"
super_32_2025_record: "6-0"
super_32_2024_placement: "Finalist"
super_32_2024_record: "5-1"
super_32_2023_placement: null
super_32_2023_record: null
\`\`\`

**Problems:**
- Need new columns every year (what about 2026, 2027?)
- Can't easily add metadata (weight class, division, notes)
- Hard to query "show all years"

---

## New JSON Structure (Proposed)

**Two JSON columns:**

### `nhsca_results` (JSONB column)
\`\`\`json
[
  {
    "year": 2025,
    "placement": "3rd",
    "record": "5-1",
    "weight": "157",
    "division": "Senior",
    "notes": ""
  },
  {
    "year": 2024,
    "placement": "5th",
    "record": "4-2",
    "weight": "152",
    "division": "Junior",
    "notes": "Competed up a weight class"
  }
]
\`\`\`

### `super32_results` (JSONB column)
\`\`\`json
[
  {
    "year": 2025,
    "placement": "Champion",
    "record": "6-0",
    "weight": "157",
    "division": "Senior",
    "notes": "Dominated weight class"
  },
  {
    "year": 2024,
    "placement": "Finalist",
    "record": "5-1",
    "weight": "152",
    "division": "Junior",
    "notes": ""
  }
]
\`\`\`

---

## Admin UI - Achievements Tab

### Visual Layout (NC United Branded)

\`\`\`
┌─────────────────────────────────────────────────────────────────────┐
│ 🏆 National Tournament Results                                      │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ NHSCA National Championship                                     │ │
│ │                                                                  │ │
│ │ ┌────┬────────────┬────────┬────────┬──────────┬──────────────┐ │ │
│ │ │Year│ Placement  │ Record │ Weight │ Division │    Actions   │ │ │
│ │ ├────┼────────────┼────────┼────────┼──────────┼──────────────┤ │ │
│ │ │2025│ 🥉 3rd     │  5-1   │  157   │  Senior  │ [Edit] [Del] │ │ │
│ │ │2024│ 5th        │  4-2   │  152   │  Junior  │ [Edit] [Del] │ │ │
│ │ └────┴────────────┴────────┴────────┴──────────┴──────────────┘ │ │
│ │                                                                  │ │
│ │ [+ Add NHSCA Year]                                              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Super 32                                                         │ │
│ │                                                                  │ │
│ │ ┌────┬────────────┬────────┬────────┬──────────┬──────────────┐ │ │
│ │ │Year│ Placement  │ Record │ Weight │ Division │    Actions   │ │ │
│ │ ├────┼────────────┼────────┼────────┼──────────┼──────────────┤ │ │
│ │ │2025│ 🥇 Champ   │  6-0   │  157   │  Senior  │ [Edit] [Del] │ │ │
│ │ │2024│ 🥈 2nd     │  5-1   │  152   │  Junior  │ [Edit] [Del] │ │ │
│ │ └────┴────────────┴────────┴────────┴──────────┴──────────────┘ │ │
│ │                                                                  │ │
│ │ [+ Add Super 32 Year]                                           │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ [Save All Tournament Data]                                          │
└─────────────────────────────────────────────────────────────────────┘
\`\`\`

### When You Click "Edit" or "+ Add Year"

\`\`\`
┌─────────────────────────────────────┐
│ Add/Edit NHSCA Result               │
├─────────────────────────────────────┤
│                                     │
│ Year:                               │
│ ┌─────────────┐                     │
│ │ 2025      ▼ │                     │
│ └─────────────┘                     │
│                                     │
│ Placement:                          │
│ ┌─────────────┐                     │
│ │ 3rd       ▼ │ ← Dropdown:         │
│ └─────────────┘   Champion          │
│                   Finalist          │
│ Record:           3rd - 8th         │
│ ┌─────────────┐   DNP               │
│ │ 5-1         │   Did Not Attend    │
│ └─────────────┘                     │
│                                     │
│ Weight Class:                       │
│ ┌─────────────┐                     │
│ │ 157         │                     │
│ └─────────────┘                     │
│                                     │
│ Division:                           │
│ ┌─────────────┐                     │
│ │ Senior    ▼ │                     │
│ └─────────────┘                     │
│                                     │
│ Notes (optional):                   │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│  [Cancel]           [Save Result]  │
└─────────────────────────────────────┘
\`\`\`

---

## Benefits for Bentley Sly Example

### Before (Current):
- 12 columns just for 2 tournaments × 3 years
- Can't add 2026 without schema change
- No place for weight class or notes

### After (Proposed):
- 2 JSON columns total
- Add unlimited years
- Flexible metadata
- Clean admin UI

---

## Data Display on Public Profile

**How it would show on Bentley's prospect page:**

\`\`\`
┌─────────────────────────────────────────────┐
│ 🏆 National Tournament Performance          │
├─────────────────────────────────────────────┤
│                                             │
│ NHSCA National Championship                 │
│ • 2025: 🥉 3rd Place (5-1)                  │
│ • 2024: 5th Place (4-2)                     │
│                                             │
│ Super 32                                    │
│ • 2025: 🥇 Champion (6-0)                   │
│ • 2024: 🥈 Finalist (5-1)                   │
└─────────────────────────────────────────────┘
\`\`\`

---

## Migration Script (Safe - No Data Loss)

\`\`\`sql
-- 1. Add new JSON columns
ALTER TABLE athletes 
ADD COLUMN nhsca_results JSONB,
ADD COLUMN super32_results JSONB;

-- 2. Migrate Bentley Sly's data as example
UPDATE athletes
SET 
  nhsca_results = '[
    {"year": 2025, "placement": "3rd", "record": "5-1", "weight": "157", "division": "Senior"},
    {"year": 2024, "placement": "5th", "record": "4-2", "weight": "152", "division": "Junior"}
  ]'::jsonb,
  super32_results = '[
    {"year": 2025, "placement": "Champion", "record": "6-0", "weight": "157", "division": "Senior"},
    {"year": 2024, "placement": "Finalist", "record": "5-1", "weight": "152", "division": "Junior"}
  ]'::jsonb
WHERE name = 'Bentley Sly';

-- 3. Keep old columns for now (for verification)
-- 4. Once verified, can drop old columns:
-- ALTER TABLE athletes DROP COLUMN nhsca_2025_placement, DROP COLUMN nhsca_2025_record, ... etc
\`\`\`

---

## Key Features

✅ **Scalable** - Add 2026, 2027, etc. without touching schema  
✅ **Rich Data** - Weight class, division, notes all included  
✅ **Clean UI** - Table view shows everything at a glance  
✅ **Fast Entry** - Fill out form in 15 seconds  
✅ **No Data Loss** - Migration preserves all existing data  
✅ **Branded** - Matches NC United colors (navy, red, gold)  
✅ **Placement Badges** - Visual medals for top finishes  

---

## Next Steps

1. Create the new JSONB columns
2. Build the admin UI component for the achievements tab
3. Migrate existing data (run for all athletes)
4. Test with Bentley Sly
5. Verify old vs new data matches
6. Drop old columns once confident
