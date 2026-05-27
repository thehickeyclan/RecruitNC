# National team registrations — athlete date of birth

Run in **Supabase → SQL Editor** before AAU Scholastic registration collects DOB.

```sql
ALTER TABLE national_team_event_registrations
  ADD COLUMN IF NOT EXISTS athlete_dob text;

COMMENT ON COLUMN national_team_event_registrations.athlete_dob IS
  'Athlete date of birth (MM/DD/YYYY). Required for AAU Scholastic Duals registration.';
```
