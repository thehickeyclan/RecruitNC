# RecruitNC Messaging — Technical Architecture PRD

**Purpose:** Implementation-ready spec for Cursor/developers. Use with the product PRD and `MESSAGING-PLATFORM-VISION.md`.

**Scope:** Phase 1 (private groups, single inbox, thread view, send message). No DMs, no minors-specific logic, no read receipts in V1.

---

## 1. Supabase schema (production-ready)

Run in **Supabase → SQL Editor**. Create in this order.

```sql
-- =============================================================================
-- RecruitNC Messaging — Phase 1
-- =============================================================================

-- Threads: one row per conversation (group or, later, DM).
CREATE TABLE IF NOT EXISTS messaging_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'group' CHECK (type IN ('group', 'dm')),
  name text NOT NULL,
  context_type text,
  context_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid,
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_messaging_threads_last_message_at ON messaging_threads (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messaging_threads_context ON messaging_threads (context_type, context_id) WHERE context_type IS NOT NULL;

COMMENT ON TABLE messaging_threads IS 'One row per conversation. context_type/context_id e.g. event/nhsca-duals-2026 or program/blue-2026.';

-- Thread membership: who is in which thread.
CREATE TABLE IF NOT EXISTS messaging_thread_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES messaging_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  notification_level text NOT NULL DEFAULT 'mentions' CHECK (notification_level IN ('all', 'mentions', 'muted')),
  last_read_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_messaging_thread_members_user ON messaging_thread_members (user_id);
CREATE INDEX IF NOT EXISTS idx_messaging_thread_members_thread ON messaging_thread_members (thread_id);

COMMENT ON TABLE messaging_thread_members IS 'Membership and per-thread read position. last_read_at drives unread count.';

-- Messages: one row per message.
CREATE TABLE IF NOT EXISTS messaging_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES messaging_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'message' CHECK (type IN ('message', 'announcement')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_messaging_messages_thread_created ON messaging_messages (thread_id, created_at DESC);

COMMENT ON TABLE messaging_messages IS 'Body max 2000 chars enforced in API. edited_at set when user edits body.';

-- Attachments: one row per file attached to a message (e.g. images).
CREATE TABLE IF NOT EXISTS messaging_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messaging_messages(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  content_type text,
  filename text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messaging_attachments_message ON messaging_attachments (message_id);
COMMENT ON TABLE messaging_attachments IS 'Image/file attachments for messages. file_url is the blob URL.';

-- Custom emoji: admin-uploaded logos (HS, College, Club, NCU, etc.) used as :slug: in messages.
CREATE TABLE IF NOT EXISTS custom_emoji (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  image_url text NOT NULL,
  category text NOT NULL CHECK (category IN ('hs', 'college', 'club', 'ncu', 'other')),
  display_name text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custom_emoji_category ON custom_emoji (category, sort_order);
COMMENT ON TABLE custom_emoji IS 'Admin-managed custom emoji for messaging; inserted as :slug: in message body and rendered as small image.';

ALTER TABLE custom_emoji ENABLE ROW LEVEL SECURITY;
CREATE POLICY custom_emoji_select ON custom_emoji FOR SELECT USING (true);
-- INSERT/UPDATE/DELETE only via service role (admin API).

-- Migrations (run after initial schema if tables already exist):
-- ALTER TABLE messaging_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
-- For "New group" to work (creator sees thread immediately), add both:
-- CREATE POLICY messaging_threads_select_creator ON messaging_threads FOR SELECT USING (created_by_user_id = auth.uid());
-- CREATE POLICY messaging_thread_members_insert_self_creator ON messaging_thread_members FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM messaging_threads t WHERE t.id = messaging_thread_members.thread_id AND t.created_by_user_id = auth.uid()));

-- RLS: enable and define policies so users only see their threads/messages.
ALTER TABLE messaging_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_messages ENABLE ROW LEVEL SECURITY;

-- Helper to avoid infinite recursion: policy must not SELECT from messaging_thread_members itself.
CREATE OR REPLACE FUNCTION public.get_my_messaging_thread_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT thread_id FROM messaging_thread_members WHERE user_id = auth.uid();
$$;

-- Threads: visible to members, or to the creator (so creator can add themselves as member).
CREATE POLICY messaging_threads_select_member ON messaging_threads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM messaging_thread_members m WHERE m.thread_id = messaging_threads.id AND m.user_id = auth.uid())
  );
CREATE POLICY messaging_threads_select_creator ON messaging_threads
  FOR SELECT USING (created_by_user_id = auth.uid());

-- Thread members: users see own rows and other members in threads they belong to (no self-query = no recursion).
CREATE POLICY messaging_thread_members_select ON messaging_thread_members
  FOR SELECT USING (user_id = auth.uid() OR thread_id IN (SELECT get_my_messaging_thread_ids()));
CREATE POLICY messaging_thread_members_update_own ON messaging_thread_members
  FOR UPDATE USING (user_id = auth.uid());
-- Creator of a thread can add themselves (so session sees the row immediately).
CREATE POLICY messaging_thread_members_insert_self_creator ON messaging_thread_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM messaging_threads t WHERE t.id = messaging_thread_members.thread_id AND t.created_by_user_id = auth.uid())
  );

-- Messages: visible only if user is a thread member.
CREATE POLICY messaging_messages_select ON messaging_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM messaging_thread_members m WHERE m.thread_id = messaging_messages.thread_id AND m.user_id = auth.uid())
  );
CREATE POLICY messaging_messages_insert ON messaging_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM messaging_thread_members m WHERE m.thread_id = messaging_messages.thread_id AND m.user_id = auth.uid())
  );
CREATE POLICY messaging_messages_update_sender ON messaging_messages
  FOR UPDATE USING (sender_id = auth.uid());

ALTER TABLE messaging_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY messaging_attachments_select ON messaging_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messaging_messages mm
      JOIN messaging_thread_members m ON m.thread_id = mm.thread_id AND m.user_id = auth.uid()
      WHERE mm.id = messaging_attachments.message_id
    )
  );
CREATE POLICY messaging_attachments_insert ON messaging_attachments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM messaging_messages mm WHERE mm.id = messaging_attachments.message_id AND mm.sender_id = auth.uid())
  );

-- Realtime: allow authenticated users to listen to messages in threads they belong to.
-- (Supabase Realtime uses RLS; ensure service role or anon can't bypass; clients use auth.uid().)
```

**If you see "column messaging_messages.edited_at does not exist":** run in SQL Editor:

```sql
ALTER TABLE messaging_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
```

**If you already ran the schema and see "infinite recursion detected in policy for relation messaging_thread_members":** run the fix below in SQL Editor (creates a helper function and replaces the recursive policy).

```sql
-- Fix: infinite recursion in messaging_thread_members SELECT policy
CREATE OR REPLACE FUNCTION public.get_my_messaging_thread_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT thread_id FROM messaging_thread_members WHERE user_id = auth.uid();
$$;

DROP POLICY IF EXISTS messaging_thread_members_select ON messaging_thread_members;
CREATE POLICY messaging_thread_members_select ON messaging_thread_members
  FOR SELECT USING (user_id = auth.uid() OR thread_id IN (SELECT get_my_messaging_thread_ids()));
```

**Optional:** If you use service-role for server-side inbox (e.g. admin or server-computed membership), you may need a separate policy or bypass for admin. For Phase 1, client + RLS is enough.

**One-off: delete a duplicate thread by name** (e.g. two "NHSCA Duals 2026" groups — deletes the older one):

```sql
WITH to_delete AS (
  SELECT id FROM messaging_threads
  WHERE name = 'NHSCA Duals 2026'
  ORDER BY created_at ASC
  LIMIT 1
)
DELETE FROM messaging_threads WHERE id IN (SELECT id FROM to_delete);
```

**Archive groups (admin):** Add column so admins can archive a group (hides from inbox). Run in SQL Editor:

```sql
ALTER TABLE messaging_threads ADD COLUMN IF NOT EXISTS archived_at timestamptz;
```

Then use the in-app "Archive" button in the thread header (admin only), or PATCH `/api/admin/messaging/threads/[threadId]` with `{ "archive": true }`.

**Invite link (share group by link):** Run this to enable "Copy invite link" and join-by-link:

```sql
ALTER TABLE messaging_threads ADD COLUMN IF NOT EXISTS invite_token text UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_messaging_threads_invite_token ON messaging_threads (invite_token) WHERE invite_token IS NOT NULL;
```

---

## 2. API routes (Next.js App Router)

Base path: `/api/messaging/`. All routes require auth (session); return 401 if unauthenticated.

| Method | Route | Purpose |
|--------|------|--------|
| GET | `/api/messaging/inbox` | List threads for current user with last message + unread count. |
| GET | `/api/messaging/threads/[threadId]` | Thread meta + membership check. |
| GET | `/api/messaging/threads/[threadId]/messages` | Paginated messages (cursor-based; includes `edited_at`, `attachments`). |
| POST | `/api/messaging/threads/[threadId]/messages` | Send message (body and/or `attachment_urls`; announcement if role allows). |
| PATCH | `/api/messaging/threads/[threadId]/messages/[messageId]` | Edit own message (body only; sets `edited_at`). |
| POST | `/api/messaging/upload` | Upload image(s) for messaging (FormData: file(s), optional threadId). Returns `{ uploads: [{ url, content_type, filename }] }`. |
| GET | `/api/messaging/custom-emoji` | List custom emoji (slug, image_url, category) for composer picker and message rendering. |
| PATCH | `/api/messaging/threads/[threadId]/read` | Set last_read_at = now for current user. |
| GET | `/api/admin/custom-emoji` | (Admin) List all custom emoji. |
| POST | `/api/admin/custom-emoji` | (Admin) Upload logo → resize to 64×64, store in Blob, insert row. FormData: file, slug, category (hs\|college\|club\|ncu\|other), display_name. |
| PATCH/DELETE | `/api/admin/custom-emoji/[id]` | (Admin) Update or delete custom emoji. |
| PATCH | `/api/messaging/threads/[threadId]/notifications` | Set notification_level (all \| mentions \| muted). |

**Inbox response shape (GET /api/messaging/inbox):**

- Return threads where the user is in `messaging_thread_members`, joined with:
  - Last message: `SELECT * FROM messaging_messages WHERE thread_id = ? ORDER BY created_at DESC LIMIT 1`.
  - Unread count: see §6 (unread algorithm).
- Sort by `threads.last_message_at DESC`.
- Fields per thread: `id`, `name`, `type`, `context_type`, `context_id`, `last_message_at`, `last_message_preview` (e.g. first 80 chars of last message), `unread_count`.

**Messages pagination (GET /api/messaging/threads/[threadId]/messages):**

- Query params: `before=<message_id>` (cursor) and `limit=50` (default 50, max 100).
- Query: `WHERE thread_id = ? AND (created_at, id) < (cursor_at, cursor_id) ORDER BY created_at DESC LIMIT ?`. Return in **chronological order** (oldest first) so the UI can append above the view; or return newest-first and reverse on client.
- Recommend: store `created_at` + `id` of the oldest message in the current page as `before` cursor; next page = messages older than that.

**Send message (POST):**

- Body: `{ "body": "…", "type": "message", "attachment_urls": [{ "url", "content_type?", "filename?" }] }` or `"type": "announcement"` (if sender is admin/coach). At least one of body (non-empty) or attachment_urls required.
- Validate: body length ≤2000 chars; user is member; for announcement, check role.
- Insert into `messaging_messages`; insert rows into `messaging_attachments` for each attachment_url; then update `messaging_threads.last_message_at = now()`.
- Return created message (id, thread_id, sender_id, type, body, created_at).

**Rate limiting (recommended):**

- Apply in middleware or inside POST handler: e.g. max 30 messages per user per minute (sliding or fixed window). Return 429 if exceeded.

---

## 3. Realtime subscriptions

**Channel:** Subscribe to new messages in threads the user is in.

- Use Supabase Realtime **postgres_changes** on `messaging_messages` with filter `thread_id=in.(thread_id_1, thread_id_2, …)`.
- Or subscribe per thread when the thread view is open: filter `thread_id=eq.<threadId>`.
- Payload: new row (id, thread_id, sender_id, type, body, created_at). Use it to append to the thread view and/or refresh inbox last message + unread.

**Unread counts:**

- Option A: On `message_created`, invalidate inbox or refetch unread for that thread (see §6).
- Option B: Subscribe to `messaging_threads` changes for `last_message_at` and refresh inbox list when it changes (simpler but coarser).

Recommendation: subscribe to `messaging_messages` INSERT for the user’s thread list; on event, update local state (append message if that thread is open, else increment unread for that thread and update last message preview).

---

## 4. Next.js component structure

```
app/
  messages/
    page.tsx              → Inbox (list of threads)
    [threadId]/
      page.tsx            → Thread view (messages + input)
components/
  messaging/
    inbox-list.tsx        → List of thread rows (avatar, name, preview, time, unread)
    thread-view.tsx       → Scrollable messages + composer
    message-bubble.tsx    → Single message (sender, body, time; announcement style if type=announcement)
    composer.tsx         → Textarea + Send; Enter to send; max 2000 chars
```

- **Inbox:** Client component; fetch `GET /api/messaging/inbox` on mount; optional Realtime subscription to update last message / unread without full refetch.
- **Thread view:** Client component; fetch `GET /api/messaging/threads/[threadId]/messages` with cursor for pagination (load more on scroll up); on mount call `PATCH .../read` to mark read. Subscribe to Realtime for this thread_id to append new messages. Composer posts to `POST .../messages`.
- **Nav:** Add “Messages” (or “Chat”) linking to `/messages`; show total unread count in nav if desired (from inbox response or a small `GET /api/messaging/unread-total`).

---

## 5. Message pagination strategy

- **Cursor-based:** Use `(created_at, id)` as cursor. Request: `?before=<id>` or `?before_ts=<iso>&before_id=<id>`. Server: `WHERE thread_id = $1 AND (created_at, id) < ($2, $3) ORDER BY created_at DESC LIMIT 50`. Return messages **newest-first**; client reverses to show oldest at top, newest at bottom. “Load more” sends the oldest (created_at, id) of the current page as `before`.
- **Initial load:** No `before`; return latest 50. Client reverses; “Load more” above uses oldest of those 50 as cursor.
- Store `hasMore` (e.g. returned 50 → hasMore true) so the UI can show “Load more” or infinite scroll.

---

## 6. Unread counter algorithm

**Definition:** For a user and a thread, unread = number of messages in that thread where `created_at > member.last_read_at` (and optionally `sender_id != current user` so your own messages don’t count).

**Implementation:**

- **Per-thread unread (inbox row):**  
  `SELECT COUNT(*) FROM messaging_messages m WHERE m.thread_id = $1 AND m.created_at > COALESCE((SELECT last_read_at FROM messaging_thread_members WHERE thread_id = $1 AND user_id = $2), '1970-01-01') AND m.sender_id != $2`
- **When user opens thread:** Call `PATCH /api/messaging/threads/[threadId]/read` to set `last_read_at = now()` for that user and thread.
- **Total unread (nav badge):** Sum the above over all threads for the user (or maintain a materialized view / cached count; for V1, summing in GET inbox is acceptable if thread count is small).

**Realtime:** When a new message is received for a thread, if the thread is not the open one, increment that thread’s unread in local state (or refetch inbox for that thread’s row).

---

## 7. Seeding groups from existing data

Phase 1 groups are **created and populated from existing data**, not by end users.

- **NHSCA Duals 2026:** One thread with `context_type = 'event'`, `context_id = 'nhsca-duals-2026'`. Members = users whose email matches `national_team_event_registrations.parent_email` (or `parent_user_id`) for that event and status = paid. Create thread once; sync members via a script or admin job (e.g. “Sync NHSCA Duals 2026 members”).
- **Blue 2026:** Same idea with `context_type = 'program'`, `context_id = 'blue-2026'`; members from Blue membership table (active for 2026).

No “create group” in the UI for Phase 1. Admin or a one-off script creates the thread and inserts `messaging_thread_members` from the source tables. **In-app create group (admin only):** Admins see a "New group" button on the Messages page; the dialog POSTs to `/api/admin/messaging/threads` (name required; optional `context_type`/`context_id`). Creating a group always makes the creator its first member (admin role). If adding the creator fails, the thread is deleted so the group is never left without them.

**Add members & invite link:** Thread **admins** see **Add** and **Link** in the members pane. **Add** opens a search dialog (by name or email); selecting a user adds them to the group and sends them an email ("You've been added to [group]" with link to the thread). **Link** copies a shareable invite URL (`/messages/join?token=...`). Anyone with the link can open it; if signed in they are added to the group and redirected to the thread; if not, they sign in first then are added. APIs: `GET/POST .../members`, `GET .../members/search?q=`, `GET .../invite-link`, `POST /api/messaging/join` (body `{ token }`). Requires `messaging_threads.invite_token` column (see migration above).

**Composer (modern UX):** **Emoji** — emoji button opens a picker strip (common emojis); insert at cursor. **@mentions** — typing `@` shows a dropdown of thread members; select by click or Enter/Tab. Inserted as `@Display Name` in the message. In the message bubble, `@Name` is rendered with highlight (brand color). Links in messages remain clickable (new tab).

---

## 8. Cursor build prompts (implementation order)

Use these as sequential prompts so the implementation stays consistent.

1. **“Create the RecruitNC messaging Supabase schema from docs/MESSAGING-TECHNICAL-PRD.md §1. Add a single SQL file under scripts/ that can be run in Supabase SQL Editor, and paste the full script in chat.”**
2. **“Implement GET /api/messaging/inbox and GET /api/messaging/threads/[threadId]/messages with cursor pagination as in docs/MESSAGING-TECHNICAL-PRD.md §2 and §5. Use createClient() for auth and RLS.”**
3. **“Implement POST /api/messaging/threads/[threadId]/messages and PATCH .../read and PATCH .../notifications per the Technical PRD. Add body length 1–2000 and rate limit 30 msg/min per user.”**
4. **“Add app/messages/page.tsx (inbox) and app/messages/[threadId]/page.tsx (thread view) using the component structure in the Technical PRD §4. Use the existing UI components (Card, Button, Input, etc.) and keep the layout minimal and mobile-first.”**
5. **“Add Supabase Realtime subscription for messaging_messages in the thread view and inbox so new messages appear without refresh. Update unread count when a new message arrives for a thread that isn’t the open one.”**
6. **“Implement the unread counter in the inbox API and in the nav (optional badge). Mark thread read when the user opens the thread (PATCH read).”**
7. **“Add a script or admin flow to create the NHSCA Duals 2026 thread and sync members from national_team_event_registrations (paid, parent_email/parent_user_id). Document in scripts/ and show the runnable script in chat.”**

---

## 9. Performance checklist

- Inbox: one query for threads + last message + unread (or 1 query threads, 1 query last messages, 1 query unread counts; avoid N+1).
- Thread messages: index on (thread_id, created_at DESC); cursor pagination only.
- Send message: single insert + single update (threads.last_message_at). No full thread refetch.
- Realtime: subscribe only to the open thread when thread view is mounted; optionally one channel for inbox (new message in any of my threads) with minimal payload.

---

## 10. What’s out of scope for Phase 1

- DMs (Phase 2).
- Read receipts (“Seen by 8”) — Phase 2 if needed.
- Polls, reactions (image attachments and message edit are in scope).
- Minors-specific restrictions (not in scope per product decision).
- Public/semi-public channels (Phase 4).
- Message delete (optional “delete for me” can be added later with a soft-delete column).

---

## 11. SMS notifications (optional)

Users can opt in to receive an SMS when they get a new message. Uses the profile **cell phone** and preference **notify_sms_new_messages**.

**Schema (run in Supabase SQL Editor):**

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS notify_sms_new_messages boolean NOT NULL DEFAULT false;
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS notify_email_new_messages boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.notify_sms_new_messages IS 'When true, user receives an SMS (to cell_phone) when they get a new message in a thread.';
COMMENT ON COLUMN user_profiles.notify_email_new_messages IS 'When true, user receives an email (to auth email) when they get a new message in a thread.';
```

**Profile:** User sets in Profile → Notification preferences:
- "Text me when I get new messages" (uses profile cell phone) — **Twilio**
- "Email me when I get new messages" (uses sign-in email) — **Resend**

**Sending:** When a message is posted (POST .../messages), we notify each thread member (except the sender):
- **SMS:** those with `notify_sms_new_messages = true` and non-null `cell_phone`. Body: `RecruitNC: New message in [thread name]: [first 60 chars]…`
- **Email:** those with `notify_email_new_messages = true`; recipient = auth user email. Resend email with thread name, preview, and "Open Messages" link.

**Twilio (SMS):** Set in Vercel (or .env):

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER` (E.164, e.g. +15551234567)

If any are missing, SMS is skipped (no-op). Implementation: `lib/sms.ts` (`sendSms`, `toE164`).

**Resend (email):** Already used elsewhere (Blue invite, order confirmation). Set `RESEND_API_KEY`. New-message emails use `sendNewMessageNotificationEmail` in `lib/email.ts`. From address: same as Blue (`info@ncwrestlingunited.com`).

Use this doc as the single technical source of truth when implementing RecruitNC Messaging Phase 1.
