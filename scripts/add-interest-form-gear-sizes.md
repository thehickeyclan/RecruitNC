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

# Hub access grants (logged-in users + code)

When a logged-in user enters a valid hub code we store a row here so the hub can grant access without relying on cookies (which can fail with many auth cookies). Run in **Supabase → SQL Editor**.

```sql
CREATE TABLE IF NOT EXISTS national_team_hub_access_grants (
  user_id uuid PRIMARY KEY,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hub_access_grants_expires ON national_team_hub_access_grants (expires_at);
COMMENT ON TABLE national_team_hub_access_grants IS 'Logged-in user entered valid hub code; hub GET grants access from this instead of cookie.';
```
