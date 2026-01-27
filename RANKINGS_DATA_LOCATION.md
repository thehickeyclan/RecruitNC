# Rankings Data Location - Class of 2025 & 2026

## Database Storage

### Primary Location: Supabase Database

**Table:** `athletes`

**Key Fields:**
- `prospect_ranking` - The ranking number (1, 2, 3, etc.)
- `graduationyear` - Graduation year (2025, 2026, 2027, etc.)
- `gender` - Gender filter (Male/Female)
- `firstName`, `lastName` - Athlete name
- `highschool` - High school name
- `weightclass` - Weight class
- `academic_gpa` - GPA
- `wrestling_name` - Display name
- `photourl`, `headshot_url` - Photo URLs
- `nationally_ranked_wins` - Nationally ranked wins
- `recruiting_status` - Recruiting status
- `college` - College commitment

**Additional Tournament Data Fields:**
- `nhsca_2024_record`, `nhsca_2024_placement`
- `nhsca_2025_record`, `nhsca_2025_placement`
- `super_32_2023_record`, `super_32_2023_placement`
- `super_32_2024_record`, `super_32_2024_placement`
- `super_32_2025_record`, `super_32_2025_placement`

### Secondary Table (Optional): `prospect_rankings`

This table may exist for more structured ranking data:
- `athlete_id` - Links to athletes table
- `graduation_year` - Graduation year
- `overall_rank` - Overall ranking
- `weight_class` - Weight class
- `region` - Region
- `verified` - Verification status

## API Endpoints

### Public Rankings API

**Endpoint:** `/api/public-rankings`

**Query Parameters:**
- `year` - Graduation year (e.g., "2025", "2026")
- `gender` - Gender filter (e.g., "Male", "Female")

**Example Requests:**
```
GET /api/public-rankings?year=2025&gender=Male
GET /api/public-rankings?year=2026&gender=Male
```

**Response Format:**
```json
{
  "rankings": [
    {
      "id": "athlete-id",
      "name": "Athlete Name",
      "graduationyear": "2026",
      "gender": "Male",
      "highschool": "High School Name",
      "weight_display": "157 lbs",
      "prospect_ranking": 1,
      "academic_gpa": 3.8,
      "photourl": "photo-url",
      "has_ranked_win": true,
      "nationally_ranked_wins": "5",
      "recruiting_status": "Committed",
      "college": "NC State",
      "nhsca_results": [...],
      "super_32_results": [...],
      "state_results": [...],
      "state_championship_summary": "2x State Champion"
    }
  ],
  "metadata": {
    "year": "2026",
    "gender": "Male",
    "total_count": 30
  }
}
```

### Rankings Service API

**Endpoint:** `/api/rankings`

**Query Parameters:**
- `year` - Graduation year
- `weightClass` - Weight class filter
- `region` - Region filter
- `verified` - Verification status

**Example:**
```
GET /api/rankings?year=2025
GET /api/rankings?year=2026&weightClass=157
```

## Code Locations

### API Route
- **File:** `app/api/public-rankings/route.ts`
- **Function:** `GET(request: Request)`
- **Database Query:** Queries `athletes` table filtered by `graduationyear` and `gender`, ordered by `prospect_ranking`

### Rankings Service
- **File:** `services/rankings-service.ts`
- **Functions:**
  - `getProspectRankings(filters)` - Get rankings with filters
  - `getProspectRankingsByYear(year)` - Get rankings by year
  - `getTopProspects(limit)` - Get top N prospects

### Public Pages
- **Class of 2026:** `app/public-rankings/2026/page.tsx`
- **Class of 2027:** `app/public-rankings/2027/page.tsx`
- **Note:** No dedicated page found for 2025, but data is accessible via API

## Database Query Examples

### Get All Class of 2025 Rankings
```sql
SELECT 
  id,
  firstName,
  lastName,
  graduationyear,
  gender,
  highschool,
  weightclass,
  prospect_ranking,
  academic_gpa,
  wrestling_name,
  photourl,
  nationally_ranked_wins,
  recruiting_status,
  college
FROM athletes
WHERE graduationyear = 2025
  AND gender = 'Male'
  AND prospect_ranking IS NOT NULL
ORDER BY prospect_ranking ASC;
```

### Get All Class of 2026 Rankings
```sql
SELECT 
  id,
  firstName,
  lastName,
  graduationyear,
  gender,
  highschool,
  weightclass,
  prospect_ranking,
  academic_gpa,
  wrestling_name,
  photourl,
  nationally_ranked_wins,
  recruiting_status,
  college
FROM athletes
WHERE graduationyear = 2026
  AND gender = 'Male'
  AND prospect_ranking IS NOT NULL
ORDER BY prospect_ranking ASC;
```

## Access Methods

1. **Via API:** Use the `/api/public-rankings` endpoint with year parameter
2. **Direct Database:** Query Supabase `athletes` table with `graduationyear` filter
3. **Via Service:** Use `rankings-service.ts` functions in code

## Environment Variables Needed

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin access)

## Notes

- Rankings are stored directly in the `athletes` table, not a separate rankings table
- The `prospect_ranking` field contains the numeric ranking (1 = #1, 2 = #2, etc.)
- Only athletes with a non-null `prospect_ranking` are included in rankings
- Rankings are filtered by `graduationyear` to get class-specific rankings
- The API also includes related tournament data (NHSCA, Super 32, State results)
