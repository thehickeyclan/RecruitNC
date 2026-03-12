# Add gear size columns to national_team_interest_forms

So lineup-only roster rows can have sizes edited on the hub. Run in **Supabase → SQL Editor**.

```sql
ALTER TABLE national_team_interest_forms ADD COLUMN IF NOT EXISTS singlet_size text;
ALTER TABLE national_team_interest_forms ADD COLUMN IF NOT EXISTS shorts_size text;
ALTER TABLE national_team_interest_forms ADD COLUMN IF NOT EXISTS shirt_size text;
COMMENT ON COLUMN national_team_interest_forms.singlet_size IS 'Gear size from hub (e.g. S, M, L); editable by hub members.';
COMMENT ON COLUMN national_team_interest_forms.shorts_size IS 'Gear size from hub; editable by hub members.';
COMMENT ON COLUMN national_team_interest_forms.shirt_size IS 'Gear size from hub; editable by hub members.';
```
