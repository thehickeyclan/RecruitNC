# Add gear size columns to national_team_event_registrations

For collecting Singlet, Shorts, and Shirt sizes on the NHSCA Duals 2026 hub. Run in **Supabase → SQL Editor**.

```sql
ALTER TABLE national_team_event_registrations ADD COLUMN IF NOT EXISTS shirt_size text;
ALTER TABLE national_team_event_registrations ADD COLUMN IF NOT EXISTS singlet_size text;
ALTER TABLE national_team_event_registrations ADD COLUMN IF NOT EXISTS shorts_size text;
COMMENT ON COLUMN national_team_event_registrations.shirt_size IS 'Shirt size (e.g. YS, YM, YL, S, M, L, XL, 2XL, 3XL); collected on event hub.';
COMMENT ON COLUMN national_team_event_registrations.singlet_size IS 'Singlet size; collected on event hub.';
COMMENT ON COLUMN national_team_event_registrations.shorts_size IS 'Shorts size; collected on event hub.';
```
