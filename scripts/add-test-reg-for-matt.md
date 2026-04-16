# Add test registration for Matt (matt.hickey@getmaxiq.com) so hub works without code

**Why:** So you can test: log in as Matt → open National Team hub → get in with no code and update gear.

**Run in Supabase → SQL Editor** (one script, then the backfill).

**Step 1 – Insert one paid registration with Matt as parent (run once):**

```sql
-- Test reg: parent_email = matt.hickey@getmaxiq.com so hub matches logged-in Matt
INSERT INTO national_team_event_registrations (
  event_slug,
  athlete_first_name,
  athlete_last_name,
  athlete_email,
  parent_email,
  high_school,
  graduation_year,
  primary_weight,
  status,
  reg_fee_cents,
  apparel_fee_cents
) VALUES (
  'nhsca-duals-2026',
  'Test',
  'Athlete',
  'test@example.com',
  'matt.hickey@getmaxiq.com',
  'Test HS',
  '2027',
  '145',
  'paid',
  0,
  0
);
```

**Step 2 – Backfill parent_user_id (links reg to Matt’s auth user):**

```sql
UPDATE national_team_event_registrations r
SET parent_user_id = u.id, updated_at = now()
FROM auth.users u
WHERE trim(lower(r.parent_email)) = trim(lower(u.email))
  AND (r.parent_user_id IS NULL OR r.parent_user_id != u.id);
```

**Step 3 – Confirm:**

```sql
SELECT id, athlete_first_name, parent_email, parent_user_id, status
FROM national_team_event_registrations
WHERE parent_email ILIKE '%matt.hickey%';
```

You should see one row with `parent_user_id` set to Matt’s user id and `status = paid`.

Then: log in as matt.hickey@getmaxiq.com, go to **National Team → Open Team Hub**. You should get in with no code and be able to update gear.
