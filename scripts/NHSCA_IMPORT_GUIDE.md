# NHSCA Data Import Guide

## Quick Start

### 1. Access the Admin Interface

Go to: **`/admin/nhsca-placements`**

This page provides:
- ✅ Import JSON data (paste or upload)
- ✅ View all placements in a table
- ✅ Auto-match placements to athlete profiles
- ✅ Merge matched data into profiles
- ✅ Filter and search capabilities
- ✅ Statistics dashboard

---

## Import Methods

### Method 1: Admin UI (Recommended) ⭐

1. Navigate to `/admin/nhsca-placements`
2. Scroll to "Import JSON Data" section
3. Set the year (default: 2025)
4. Paste your JSON array into the textarea
5. Click "Import Data"

**JSON Format:**
```json
[
  {
    "athlete_name": "John Doe",
    "high_school": "Cardinal Gibbons",
    "placement": null,
    "record": "2-2",
    "weight_class": "157",
    "division": "Senior",
    "state": "NC"
  },
  {
    "athlete_name": "Jane Smith",
    "high_school": "Raleigh",
    "placement": 3,
    "record": "5-1",
    "weight_class": "138",
    "division": "Junior",
    "state": "NC"
  }
]
```

**Required Fields:**
- `athlete_name` (required)
- `weight_class` (required)
- `division` (required: "Freshman", "Sophomore", "Junior", or "Senior")

**Optional Fields:**
- `high_school`
- `placement` (1-8 for placers, `null` for non-placers)
- `record` (e.g., "5-1", "2-2")
- `state` (defaults to "NC")
- `year` (defaults to import year)

---

### Method 2: API Endpoint

**Endpoint:** `POST /api/admin/nhsca-placements/bulk-import`

**Request:**
```bash
curl -X POST https://your-domain.com/api/admin/nhsca-placements/bulk-import \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "year": 2025,
    "placements": [
      // Your JSON array here
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "imported": 150,
  "message": "Successfully imported 150 NHSCA placements"
}
```

---

### Method 3: Supabase Dashboard

1. Go to Supabase Dashboard → Table Editor
2. Select `nhsca_placements` table
3. Click "Insert" → "Import data from CSV"
4. Convert your JSON to CSV first (or use SQL insert)

**CSV Format:**
```csv
year,athlete_name,high_school,placement,weight_class,division,record,state
2025,John Doe,Cardinal Gibbons,,157,Senior,2-2,NC
2025,Jane Smith,Raleigh,3,138,Junior,5-1,NC
```

---

## Workflow: Import → Match → Merge

### Step 1: Import Data

Import your JSON via the admin UI or API.

**Verify Import:**
- Check the stats cards on the placements page
- View the placements table
- Filter by year, status, or search by name

---

### Step 2: Auto-Match to Athletes

After importing, match placements to existing athlete profiles:

1. Click **"Auto-Match to Athletes"** button
2. The system will:
   - Match by exact name
   - Match by name + school
   - Match by name + weight class
3. View results in the table (status changes to "auto_matched")

**Matching Methods:**
- **Exact Name:** Perfect name match
- **Name + School:** Name matches and school matches
- **Name + Weight:** Name matches and weight class matches

**Match Status:**
- `unmatched` - Not yet matched
- `auto_matched` - Automatically matched
- `manually_matched` - Manually linked (via API)
- `merged` - Merged into athlete profile

---

### Step 3: Merge into Profiles

Once matched, merge the data into athlete profiles:

1. Click **"Merge into Profiles"** button
2. The system will:
   - Update `athletes.nhsca_results` JSONB column
   - Mark placements as merged
   - Preserve existing NHSCA data (removes duplicates for same year)

**Result:**
- Data appears in athlete profiles automatically
- Both LegacyNC and Recruit-NC can access it
- Used in rankings, displays, and analytics

---

## Viewing Data

### Admin Interface

**URL:** `/admin/nhsca-placements`

**Features:**
- 📊 Statistics dashboard (total, placers, matched, etc.)
- 🔍 Search by athlete name
- 📅 Filter by year
- 🏷️ Filter by match status
- 📋 Table view with all details
- 🔄 Refresh button to update data

### Analytics Dashboard

**URL:** `/admin/nhsca-analytics`

**Features:**
- Win percentage by year
- Participants per class
- Best performing years
- Overall statistics

---

## Data Structure

### `nhsca_placements` Table (Staging)

Stores imported data before matching:
- `athlete_name` - Name from import
- `placement` - 1-8 for placers, `null` for participants
- `weight_class` - Weight class
- `division` - Freshman, Sophomore, Junior, Senior
- `record` - Tournament record (e.g., "5-1")
- `match_status` - unmatched, auto_matched, manually_matched, merged
- `athlete_id` - Linked athlete profile (if matched)

### `athletes.nhsca_results` JSONB (Final)

Stored in athlete profiles:
```json
[
  {
    "year": 2025,
    "placement": "Participated",
    "record": "2-2",
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
```

---

## Tips

1. **Import in Batches:** If you have multiple years, import them separately
2. **Verify Before Merging:** Check match status before merging
3. **Manual Matching:** Use the API for manual matching if auto-match fails
4. **Check Analytics:** Use `/admin/nhsca-analytics` to verify data quality

---

## Troubleshooting

### Import Fails
- Check JSON format (must be array)
- Verify required fields (athlete_name, weight_class, division)
- Check for duplicate entries

### Matching Fails
- Names might not match exactly (check spelling)
- School names might differ
- Use manual matching API if needed

### Merge Fails
- Ensure placements are matched first
- Check that athlete profiles exist
- Verify `athletes.nhsca_results` column exists

---

## Next Steps

After importing and merging:
1. ✅ Check athlete profiles - NHSCA data should appear
2. ✅ View analytics - verify statistics
3. ✅ Test rankings - data should be included
4. ✅ LegacyNC access - data available automatically

---

## Support

- **Admin Interface:** `/admin/nhsca-placements`
- **Analytics:** `/admin/nhsca-analytics`
- **API Docs:** See individual route files in `app/api/admin/nhsca-placements/`

