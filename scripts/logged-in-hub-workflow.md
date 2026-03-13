# Logged-in hub workflow

How parents see and access National Team event hubs when they’re signed in. Includes manual fix options when email doesn’t match.

---

## How hub access is determined

A user has hub access if **any** of these is true:

1. **Paid registration** with `parent_email` matching their login email (case-insensitive), or  
2. **Paid registration** with `parent_user_id` = their auth user id, or  
3. **event_workspace_members** row for that user + event_slug, or  
4. **Admin** (user_profiles.is_admin or role = admin), or  
5. **Hub code** (valid code in cookie or in `national_team_hub_access_grants` for that user).

Same rules are used by:

- `GET /api/national-team/hub` (full hub data)
- `GET /api/national-team/hub-access` (navbar “Workspace” link)
- `GET /api/communities/hubs` (profile “Event hubs” + Forum sidebar)

---

## Normal flow (no manual steps)

1. **Registration**  
   Parent fills the National Team registration form (invite code, athlete info, **parent_email**).  
   - If they are **logged in** when they submit, the register API sets `parent_user_id` on the new row.  
   - If they are not logged in, only `parent_email` is set.

2. **After payment**  
   Reg status becomes `paid`. No extra step required for hub access if the email matches.

3. **First hub visit (when only parent_email was set)**  
   When they open `/national-team/hub` (or hit the hub API) while logged in, the hub API **backfills** `parent_user_id` on all paid regs where `parent_email` matches their login email.  
   So the next time:
   - Navbar shows “Workspace”
   - Profile shows “Event hubs” with a link to the hub
   - Forum sidebar shows the hub

4. **Profile “Event hubs”**  
   Profile fetches `/api/communities/hubs`, which returns hubs for which the user has access (via `parent_user_id` or `parent_email` or workspace membership). Each hub links to `/national-team/hub`.

5. **Navbar**  
   Navbar calls `/api/national-team/hub-access`. If allowed, it shows a “Workspace” dropdown item linking to `/national-team/hub`.

---

## When login email ≠ parent_email (manual fix)

If a parent registered with a different email (typo, work vs personal, etc.), they won’t get hub access by email match. Two options:

### Option A: Set `parent_user_id` on the registration (recommended)

Links the reg to their account so they get access even if emails differ.

**SQL (run in Supabase SQL Editor):**

```sql
-- Replace REGISTRATION_ID and USER_ID with real values.
-- REGISTRATION_ID = id from national_team_event_registrations.
-- USER_ID = auth.users.id for the parent (find by email in user_profiles or auth.users).

UPDATE national_team_event_registrations
SET parent_user_id = 'USER_ID',
    updated_at = now()
WHERE id = 'REGISTRATION_ID';
```

To find `USER_ID` by email:

```sql
SELECT id, email FROM auth.users WHERE email ILIKE 'parent@example.com';
-- or
SELECT user_id, email FROM user_profiles WHERE email ILIKE 'parent@example.com';
```

After the update, that user will see the hub in navbar, profile Event hubs, and get full hub access.

### Option B: Add them as workspace member

If you don’t want to change the reg row, add them to the event workspace:

```sql
-- event_slug = e.g. 'nhsca-duals-2026'
INSERT INTO event_workspace_members (event_slug, user_id)
VALUES ('nhsca-duals-2026', 'USER_ID')
ON CONFLICT (event_slug, user_id) DO NOTHING;
```

They will then have hub access for that event (and it will show in profile/communities hubs).

---

## Backfilling `parent_user_id` for many regs

If you have many paid regs where `parent_email` matches a known user but `parent_user_id` is null, you can backfill by matching email to `user_profiles` or `auth.users`:

```sql
-- Example: set parent_user_id from user_profiles where parent_email matches.
-- Run in Supabase SQL Editor and confirm the SELECT before doing the UPDATE.

-- 1) Preview: regs that would get backfilled
SELECT r.id, r.parent_email, r.parent_user_id, p.user_id
FROM national_team_event_registrations r
JOIN user_profiles p ON LOWER(TRIM(p.email)) = LOWER(TRIM(r.parent_email))
WHERE r.status = 'paid'
  AND r.parent_user_id IS NULL;

-- 2) Backfill (uncomment and run after verifying)
/*
UPDATE national_team_event_registrations r
SET parent_user_id = p.user_id,
    updated_at = now()
FROM user_profiles p
WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(r.parent_email))
  AND r.status = 'paid'
  AND r.parent_user_id IS NULL;
*/
```

---

## Summary

| Step | Who | Result |
|------|-----|--------|
| Register (logged in) | API | Sets `parent_user_id` on new reg |
| Register (not logged in) | API | Only `parent_email` set |
| First hub visit (logged in, email match) | Hub API | Backfills `parent_user_id` on matching regs |
| Profile load | Profile page | Fetches hubs → shows “Event hubs” with link to hub |
| Navbar | Nav | hub-access → shows “Workspace” if allowed |
| Email mismatch | Admin | Manually set `parent_user_id` or add `event_workspace_members` |

No manual step is required when the parent signs in with the same email they used when registering; backfill and profile/navbar all use that. Manual steps are only for fixing access when the login email doesn’t match the registration email.
