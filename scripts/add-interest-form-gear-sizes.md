# Add gear size columns to national_team_interest_forms

So lineup-only roster rows can have sizes edited on the hub. Run in **Supabase → SQL Editor**.

```sql
ALTER TABLE national_team_interest_forms ADD COLUMN IF NOT EXISTS singlet_size text;
ALTER TABLE national_team_interest_forms ADD COLUMN IF NOT EXISTS shorts_size text;
ALTER TABLE national_team_interest_forms ADD COLUMN IF NOT EXISTS shirt_size text;
COMMENT ON COLUMN national_team_interest_forms.singlet_size IS 'Gear size from hub (e.g. S, M, L); editable by hub members.';
COMMENT ON COLUMN national_team_interest_forms.shorts_size IS 'Gear size from hub; editable by hub members.';
COMMENT ON COLUMN national_team_interest_forms.shirt_size IS 'Gear size from hub; editable by hub members.';

-- Optional: track who last updated sizes (for "Last edited by" on hub)
ALTER TABLE national_team_interest_forms ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE national_team_interest_forms ADD COLUMN IF NOT EXISTS updated_by_user_id uuid;
COMMENT ON COLUMN national_team_interest_forms.updated_at IS 'When gear sizes were last updated.';
COMMENT ON COLUMN national_team_interest_forms.updated_by_user_id IS 'User who last updated (for Last edited by on hub).';
```
