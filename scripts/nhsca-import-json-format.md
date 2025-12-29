# NHSCA Import Data Format

## JSON Format for Bulk Import

### Option 1: Single Array (All Years Together)

```json
[
  {
    "athlete_name": "John Smith",
    "high_school": "Cardinal Gibbons",
    "year": 2025,
    "placement": 1,
    "weight_class": "157",
    "division": "Senior",
    "record": "6-0",
    "state": "NC"
  },
  {
    "athlete_name": "John Smith",
    "high_school": "Cardinal Gibbons",
    "year": 2024,
    "placement": 3,
    "weight_class": "152",
    "division": "Junior",
    "record": "5-1",
    "state": "NC"
  },
  {
    "athlete_name": "Jane Doe",
    "high_school": "Cary High",
    "year": 2025,
    "placement": 2,
    "weight_class": "120",
    "division": "Senior",
    "record": "5-1",
    "state": "NC"
  }
]
```

### Option 2: Organized by Year (If You Prefer)

```json
{
  "2025": [
    {
      "athlete_name": "John Smith",
      "high_school": "Cardinal Gibbons",
      "placement": 1,
      "weight_class": "157",
      "division": "Senior",
      "record": "6-0",
      "state": "NC"
    },
    {
      "athlete_name": "Jane Doe",
      "high_school": "Cary High",
      "placement": 2,
      "weight_class": "120",
      "division": "Senior",
      "record": "5-1",
      "state": "NC"
    }
  ],
  "2024": [
    {
      "athlete_name": "John Smith",
      "high_school": "Cardinal Gibbons",
      "placement": 3,
      "weight_class": "152",
      "division": "Junior",
      "record": "5-1",
      "state": "NC"
    }
  ],
  "2023": [...],
  "2022": [...]
}
```

## Field Descriptions

| Field | Required | Type | Example | Notes |
|-------|----------|------|---------|-------|
| `athlete_name` | ✅ Yes | string | "John Smith" | Full name as it appears |
| `year` | ✅ Yes | number | 2025 | Tournament year |
| `placement` | ✅ Yes | number | 1, 2, 3, 4, 5, 6, 7, 8 | Numeric placement (1=Champion, 2=Finalist, etc.) |
| `weight_class` | ✅ Yes | string | "157" | Weight class |
| `division` | ✅ Yes | string | "Senior" | Freshman, Sophomore, Junior, Senior |
| `high_school` | ❌ No | string | "Cardinal Gibbons" | Helps with matching |
| `record` | ❌ No | string | "6-0" | Tournament record |
| `state` | ❌ No | string | "NC" | Defaults to "NC" if not provided |

## Placement Values

- `1` = Champion
- `2` = Finalist
- `3` = 3rd Place
- `4` = 4th Place
- `5` = 5th Place
- `6` = 6th Place
- `7` = 7th Place
- `8` = 8th Place

## Division Values

- `"Freshman"`
- `"Sophomore"`
- `"Junior"`
- `"Senior"`

## Import Methods

### Method 1: API Endpoint (Recommended)

```typescript
// POST /api/admin/nhsca-placements/bulk-import
{
  "year": 2025,  // Optional, defaults to 2025
  "placements": [
    // Array of placement objects
  ]
}
```

### Method 2: Direct SQL (If You Have JSON File)

```sql
-- If you have JSON in a file, you can use:
INSERT INTO nhsca_placements (
  year,
  athlete_name,
  high_school,
  placement,
  weight_class,
  division,
  record,
  state
)
SELECT
  (json_data->>'year')::integer,
  json_data->>'athlete_name',
  json_data->>'high_school',
  (json_data->>'placement')::integer,
  json_data->>'weight_class',
  json_data->>'division',
  json_data->>'record',
  COALESCE(json_data->>'state', 'NC')
FROM json_array_elements('[...your json...]'::json) AS json_data;
```

### Method 3: Supabase Dashboard

1. Convert JSON to CSV (if needed)
2. Use Supabase Table Editor → Import CSV
3. Map columns to table fields

## Example: Complete 2025 Dataset

```json
[
  {
    "athlete_name": "Liam Hickey",
    "high_school": "Cardinal Gibbons",
    "year": 2025,
    "placement": 1,
    "weight_class": "165",
    "division": "Senior",
    "record": "6-0",
    "state": "NC"
  },
  {
    "athlete_name": "Anna Ockerman",
    "high_school": "Cary High",
    "year": 2025,
    "placement": 1,
    "weight_class": "120",
    "division": "Senior",
    "record": "6-0",
    "state": "NC"
  },
  {
    "athlete_name": "Colt Campbell",
    "high_school": "West Forsyth",
    "year": 2025,
    "placement": 2,
    "weight_class": "157",
    "division": "Senior",
    "record": "5-1",
    "state": "NC"
  }
  // ... more placements
]
```

## What I Need From You

**Preferred Format:** Single JSON array with all years together (Option 1)

**Required Fields:**
- `athlete_name`
- `year`
- `placement`
- `weight_class`
- `division`

**Optional but Helpful:**
- `high_school` (improves matching accuracy)
- `record` (tournament record)
- `state` (defaults to "NC" if not provided)

**Years Needed:**
- 2025 ✅
- 2024 ✅
- 2023 ✅
- 2022 ✅

Once you provide the JSON, I can:
1. Create a bulk import script
2. Import it via API
3. Test the auto-fetch functionality

