# Add updated_by_user_id to national_team_event_registrations

Tracks who last updated the row (e.g. gear sizes). Run in **Supabase → SQL Editor**.

```sql
ALTER TABLE national_team_event_registrations ADD COLUMN IF NOT EXISTS updated_by_user_id uuid;
COMMENT ON COLUMN national_team_event_registrations.updated_by_user_id IS 'User who last updated this row (e.g. gear sizes); for "Last edited by" on hub roster.';
```
