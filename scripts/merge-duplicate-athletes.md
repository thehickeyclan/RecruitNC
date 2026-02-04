# Merge Duplicate Athletes (e.g. Stephen Cross)

Use this when you have two athlete rows for the same person (e.g. two "Stephen Cross" from Trinity, 2028). One row becomes the **canonical** profile; all references are pointed to it and the duplicate row is removed.

## Step 1: Find the two athlete IDs

Run in **Supabase SQL Editor**:

```sql
-- Replace name/school/year as needed
SELECT id, name, highschool, graduationyear, claimed_at, claimed_by_user_id, photourl
FROM athletes
WHERE LOWER(TRIM(name)) LIKE '%stephen cross%'
   OR (LOWER(TRIM(COALESCE(firstname,'') || ' ' || COALESCE(lastname,'')))) LIKE '%stephen cross%'
ORDER BY claimed_at DESC NULLS LAST;
```

Note the two `id` values. Decide which to **keep** (usually the one with `claimed_by_user_id` set or the one with more complete data) and which to **merge and remove**.

- **KEEP_ID** = the athlete row that stays (canonical profile).
- **MERGE_ID** = the athlete row that will be removed after its references are moved.

## Step 2: Run the merge SQL

Replace `'KEEP_UUID_HERE'` and `'MERGE_UUID_HERE'` with the actual UUIDs from Step 1, then run the whole block in Supabase SQL Editor.

```sql
-- Merge duplicate athletes: point all references to KEEP, then delete MERGE row.
-- Replace these with your two athlete UUIDs from Step 1.
\set keep_id 'KEEP_UUID_HERE'
\set merge_id 'MERGE_UUID_HERE'

-- Supabase SQL Editor doesn't support \set; use the literals below instead.
-- KEEP_ID = the profile you want to keep (canonical).
-- MERGE_ID = the duplicate to remove.

DO $$
DECLARE
  keep_id uuid := 'KEEP_UUID_HERE';
  merge_id uuid := 'MERGE_UUID_HERE';
BEGIN
  IF keep_id = 'KEEP_UUID_HERE'::uuid OR merge_id = 'MERGE_UUID_HERE'::uuid THEN
    RAISE EXCEPTION 'Replace KEEP_UUID_HERE and MERGE_UUID_HERE with real athlete UUIDs from Step 1.';
  END IF;
  IF keep_id = merge_id THEN
    RAISE EXCEPTION 'KEEP_ID and MERGE_ID must be different.';
  END IF;

  -- Point user_profiles (claimed profile) to the kept athlete
  UPDATE user_profiles SET athlete_id = keep_id, athlete_name = (SELECT name FROM athletes WHERE id = keep_id) WHERE athlete_id = merge_id;

  -- Point matches to the kept athlete
  UPDATE matches SET athlete_id = keep_id WHERE athlete_id = merge_id;

  -- Point likes to the kept athlete (duplicate likes on same athlete by same user may need manual cleanup)
  UPDATE likes SET athlete_id = keep_id WHERE athlete_id = merge_id;

  -- Point edit_requests to the kept athlete
  UPDATE edit_requests SET athlete_id = keep_id WHERE athlete_id = merge_id;

  -- recruiting_actions (coach activities)
  UPDATE recruiting_actions SET athlete_id = keep_id WHERE athlete_id = merge_id;

  -- college_coach_stars (coach starred athletes)
  UPDATE college_coach_stars SET athlete_id = keep_id WHERE athlete_id = merge_id;

  -- athlete_confirmations
  UPDATE athlete_confirmations SET athlete_id = keep_id WHERE athlete_id = merge_id;

  -- Optional: copy non-empty fields from merge row to keep row (e.g. photo, bio) where keep row is empty
  -- Uncomment and run separately if you want to preserve data from the merged row:
  /*
  UPDATE athletes a
  SET
    photourl    = COALESCE(NULLIF(TRIM(a.photourl), ''), (SELECT NULLIF(TRIM(b.photourl), '') FROM athletes b WHERE b.id = merge_id)),
    headshot_url= COALESCE(NULLIF(TRIM(a.headshot_url), ''), (SELECT NULLIF(TRIM(b.headshot_url), '') FROM athletes b WHERE b.id = merge_id)),
    bio         = COALESCE(NULLIF(TRIM(a.bio), ''), (SELECT NULLIF(TRIM(b.bio), '') FROM athletes b WHERE b.id = merge_id))
  WHERE a.id = keep_id;
  */

  -- Remove the duplicate athlete row
  DELETE FROM athletes WHERE id = merge_id;

  RAISE NOTICE 'Merge complete: % is now canonical; duplicate % removed.', keep_id, merge_id;
END $$;
```

**Supabase SQL Editor note:** It does not support `\set`. Use a single statement with your UUIDs in place:

```sql
-- Example for Stephen Cross: replace with your actual UUIDs from Step 1.
-- KEEP_ID = the one you want to keep (e.g. the claimed one or the one with more data).
-- MERGE_ID = the duplicate to remove.

DO $$
DECLARE
  keep_id uuid := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';  -- replace with real UUID
  merge_id uuid := 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy';  -- replace with real UUID
BEGIN
  IF keep_id = merge_id THEN
    RAISE EXCEPTION 'KEEP_ID and MERGE_ID must be different.';
  END IF;

  UPDATE user_profiles SET athlete_id = keep_id, athlete_name = (SELECT name FROM athletes WHERE id = keep_id) WHERE athlete_id = merge_id;
  UPDATE matches SET athlete_id = keep_id WHERE athlete_id = merge_id;
  UPDATE likes SET athlete_id = keep_id WHERE athlete_id = merge_id;
  UPDATE edit_requests SET athlete_id = keep_id WHERE athlete_id = merge_id;
  UPDATE recruiting_actions SET athlete_id = keep_id WHERE athlete_id = merge_id;
  UPDATE college_coach_stars SET athlete_id = keep_id WHERE athlete_id = merge_id;
  UPDATE athlete_confirmations SET athlete_id = keep_id WHERE athlete_id = merge_id;

  DELETE FROM athletes WHERE id = merge_id;

  RAISE NOTICE 'Merge complete. Kept %, removed duplicate %.', keep_id, merge_id;
END $$;
```

## Step 3: Verify

- Open the canonical profile: `/unified-profile/{KEEP_ID}`.
- Confirm matches, claim, and any coach stars/activities are intact.
- Search for the old MERGE_ID in the app; you should get no result (404).

## Tables updated

| Table | Column | Purpose |
|-------|--------|---------|
| user_profiles | athlete_id, athlete_name | Who “My Profile” links to |
| matches | athlete_id | Match records |
| likes | athlete_id | User likes |
| edit_requests | athlete_id | Profile edit requests |
| recruiting_actions | athlete_id | Coach activities |
| college_coach_stars | athlete_id | Coach starred athletes |
| athlete_confirmations | athlete_id | Profile confirmations |

After the merge, only the **KEEP** athlete row remains; the **MERGE** row is deleted.

---

## Simple version (paste and replace UUIDs)

If you prefer plain statements, run these in order in Supabase SQL Editor. Replace `KEEP_UUID_HERE` and `MERGE_UUID_HERE` with the actual UUIDs (including quotes, e.g. `'a1b2c3d4-e5f6-7890-abcd-ef1234567890'`).

```sql
-- 1) Find the two Stephen Cross (run first, note the two ids)
SELECT id, name, highschool, graduationyear, claimed_at
FROM athletes
WHERE LOWER(TRIM(name)) LIKE '%stephen cross%'
ORDER BY claimed_at DESC NULLS LAST;

-- 2) Replace KEEP_UUID_HERE and MERGE_UUID_HERE below, then run all statements.

UPDATE user_profiles
SET athlete_id = 'KEEP_UUID_HERE', athlete_name = (SELECT name FROM athletes WHERE id = 'KEEP_UUID_HERE')
WHERE athlete_id = 'MERGE_UUID_HERE';

UPDATE matches SET athlete_id = 'KEEP_UUID_HERE' WHERE athlete_id = 'MERGE_UUID_HERE';
UPDATE likes SET athlete_id = 'KEEP_UUID_HERE' WHERE athlete_id = 'MERGE_UUID_HERE';
UPDATE edit_requests SET athlete_id = 'KEEP_UUID_HERE' WHERE athlete_id = 'MERGE_UUID_HERE';
UPDATE recruiting_actions SET athlete_id = 'KEEP_UUID_HERE' WHERE athlete_id = 'MERGE_UUID_HERE';
UPDATE college_coach_stars SET athlete_id = 'KEEP_UUID_HERE' WHERE athlete_id = 'MERGE_UUID_HERE';
UPDATE athlete_confirmations SET athlete_id = 'KEEP_UUID_HERE' WHERE athlete_id = 'MERGE_UUID_HERE';

DELETE FROM athletes WHERE id = 'MERGE_UUID_HERE';
```

If you get a **unique constraint** error on `likes` or `college_coach_stars` (same user/coach pointing to both IDs), delete the duplicate row(s) first, then re-run the UPDATE for that table:

```sql
-- Example: if likes(user_id, athlete_id) is unique, remove the merge row's like before updating
DELETE FROM likes WHERE athlete_id = 'MERGE_UUID_HERE';
-- then run the UPDATE likes ... for MERGE -> KEEP if you still need to move any
```

---

## Stephen Cross merge (ready to run)

- **Keep:** `f5dfa7b9-49b3-4296-94a2-b6f587d03b5c`
- **Merge into it and remove:** `e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b`

**If you got "column athlete_id does not exist"** – your `user_profiles` table may not have that column. Use the version below that skips `user_profiles`, or add it first:

```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES athletes(id);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS athlete_name TEXT;
```

Then run the full merge block. **Or** run the shorter block below (skips `user_profiles`):

```sql
-- Stephen Cross: keep f5dfa7b9..., remove e68528ea...
-- Skip user_profiles if athlete_id doesn't exist; run the rest:

UPDATE matches SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
UPDATE likes SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
UPDATE edit_requests SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
UPDATE recruiting_actions SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
UPDATE college_coach_stars SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
UPDATE athlete_confirmations SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';

DELETE FROM athletes WHERE id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
```

**Full version (includes user_profiles – use only if athlete_id exists):**

```sql
UPDATE user_profiles
SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c',
    athlete_name = (SELECT name FROM athletes WHERE id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c')
WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';

UPDATE matches SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
UPDATE likes SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
UPDATE edit_requests SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
UPDATE recruiting_actions SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
UPDATE college_coach_stars SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
UPDATE athlete_confirmations SET athlete_id = 'f5dfa7b9-49b3-4296-94a2-b6f587d03b5c' WHERE athlete_id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';

DELETE FROM athletes WHERE id = 'e68528ea-9d0d-4f9a-bbd6-cb3b93199d9b';
```
