# Athletes Table Schema

Single source of truth for `athletes` columns. Update this when the DB schema changes.

**Columns that EXIST** (verified in use):

- `id` – uuid
- `name` – text (full name)
- `graduationyear` – int
- `gender` – text
- `highschool` – text (also `high_school` in some code paths)
- `weight` / `weightclass` – number or text
- `college` – text
- `college_id` – uuid (nullable)
- `prospect_ranking` – int (nullable)
- `previous_ranking` – int (nullable)
- `academic_gpa` – number (nullable)
- `photourl` – text
- `commitmentPhotoUrl` – text
- `commitmentdate` / `commitment_date` – timestamp
- `recruiting_status` – text
- `is_prospect` – boolean
- `achievements` – text/json
- `additional_achievements` – text
- `nationally_ranked_wins` – text
- `college_opens_experience` – text
- `nhsca_2023_record`, `nhsca_2023_placement`, `nhsca_2024_record`, `nhsca_2024_placement`, `nhsca_2025_record`, `nhsca_2025_placement`
- `super_32_2024_record`, `super_32_2024_placement`, `super_32_2025_record`, `super_32_2025_placement`
- `highSchoolLogoUrl` – text (used for school/division grouping)
- `wrestling_name` – text
- `wrestlingClub` / `wrestling_club` – text
- `contact_email` / `contactEmail` / `email` – text
- `phone` / `cell` / `cell_number` – text
- `high_school_division` – text (1A, 2A, 3A, 4A)

**Columns that do NOT exist** (cause "column does not exist" errors):

- `firstname` / `lastname` (snake_case)
- `firstName` / `lastName` (camelCase) – use `name` or `wrestling_name` instead
- `highSchoolDivision` (use `high_school_division`)

**Pattern for admin APIs:** Use `select("*")` and read only the fields you need. Avoid explicit column lists that can break when the schema changes.
