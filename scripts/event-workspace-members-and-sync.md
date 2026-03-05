# Event workspace members — workspace ↔ forum sync

**Purpose:** One source of "who is in the event workspace" (e.g. NHSCA Duals 2026). Anyone in the workspace is auto-added to the aligned forum (messaging thread). Anyone added to the forum (e.g. via invite link) is auto-added to the workspace. Parents can add family members and kids to the workspace (by email); adding to workspace or forum adds to the other.

**Run in Supabase → SQL Editor.**

```sql
-- Event workspace members: who has access to this event's hub (roster + forum).
-- Sources: registration (parent signed up), family_add (parent added them), forum_invite (joined via thread invite), athlete_linked (kid linked to reg).
CREATE TABLE IF NOT EXISTS event_workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'family_add' CHECK (source IN ('registration', 'family_add', 'forum_invite', 'athlete_linked')),
  added_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_slug, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_workspace_members_event ON event_workspace_members (event_slug);
CREATE INDEX IF NOT EXISTS idx_event_workspace_members_user ON event_workspace_members (user_id);

COMMENT ON TABLE event_workspace_members IS 'Explicit workspace membership. Registration-based access also comes from national_team_event_registrations.parent_user_id (backfilled when parent loads hub).';

-- Ensure registrations has parent_user_id (already in 208 script; run if missing).
ALTER TABLE national_team_event_registrations ADD COLUMN IF NOT EXISTS parent_user_id uuid;
```

**Logic (in app):**

- **Who is in the workspace for an event?**  
  - All distinct `parent_user_id` from `national_team_event_registrations` where `event_slug = $1` and `status = 'paid'` and `parent_user_id IS NOT NULL`.  
  - Union: all `user_id` from `event_workspace_members` where `event_slug = $1`.

- **Who can see the hub for an event?**  
  - Same as above, OR current user’s email matches `parent_email` on a paid registration (so they see the hub before we’ve backfilled `parent_user_id`).

- **Sync workspace → forum:** For each workspace member user_id, ensure a row in `messaging_thread_members` for the event’s thread (create thread if needed; add member if missing).

- **Sync forum → workspace:** When loading hub or when someone joins via invite, for each member of the event’s thread, ensure a row in `event_workspace_members` (e.g. source = `forum_invite` if they weren’t from registration).

- **Add family / kid:** Call add-workspace-member API (by email). Resolve email → user_id; insert `event_workspace_members` (source `family_add` or `athlete_linked`); then add that user to the event’s thread. They then see the workspace and forum.
