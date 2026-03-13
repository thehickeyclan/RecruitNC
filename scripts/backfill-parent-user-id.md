# Backfill parent_user_id: link every registration to RecruitNC parent

**Why:** So the system knows "this parent (RecruitNC user) is linked to this athlete." Parents who sign in with the same email they registered with can then get hub access without a code.

**Run in Supabase → SQL Editor** (one-time; safe to re-run).

```sql
-- Link national_team_event_registrations to the RecruitNC user when parent_email matches an auth user
UPDATE national_team_event_registrations r
SET
  parent_user_id = u.id,
  updated_at = now()
FROM auth.users u
WHERE trim(lower(r.parent_email)) = trim(lower(u.email))
  AND (r.parent_user_id IS NULL OR r.parent_user_id != u.id);
```

**Check result (optional):**
```sql
SELECT id, athlete_first_name, athlete_last_name, parent_email, parent_user_id
FROM national_team_event_registrations
WHERE parent_email IS NOT NULL AND parent_email != ''
ORDER BY updated_at DESC
LIMIT 50;
```

Rows with `parent_user_id` set are now linked; parents with that RecruitNC account will be recognized when they sign in.
