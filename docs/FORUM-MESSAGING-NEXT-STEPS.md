# Forum & Messaging — Next Steps (GroupMe Replacement)

## 1. Run the schema migration

A full SQL migration for the new forum/messaging model is in **`docs/forum-messaging-schema-migration.sql`**.

**How to run it:**

1. Open **Supabase Dashboard** → your project → **SQL Editor**.
2. Paste the contents of `forum-messaging-schema-migration.sql`.
3. Run the script.

**What it creates:**

- **forum_groups** — One per event/team/cohort (replaces “GroupMe group”).
- **forum_channels** — Channels per group (announcement, forum, chat, event); optional `coach_only`.
- **forum_messages** — Channel messages (body, attachments, pinned, edited_at).
- **forum_threads** + **forum_thread_messages** — Reply threads under a message (Slack-style).
- **forum_reactions** — Emoji on messages.
- **forum_members** — Group membership (admin, coach, athlete, parent).
- **forum_pending_members** — Join requests for public groups.
- **forum_dm_conversations** + **forum_dm_participants** + **forum_dm_messages** — DMs (1:1 and group).
- **forum_mass_messages** + **forum_mass_message_recipients** + **forum_message_templates** — Coach broadcast + templates.
- **forum_invite_links** — Shareable join links (code, expiry, max_uses).

RLS is enabled with SELECT policies; you’ll add INSERT/UPDATE/DELETE policies when you build the APIs.

**After running:** In **Database → Replication**, enable replication for:

- `forum_messages`
- `forum_dm_messages`
- `forum_thread_messages`
- `forum_reactions`

---

## 2. Relation to existing messaging

- **Current system** uses `messaging_threads`, `messaging_messages`, etc. (single “thread” = one conversation).
- **New system** uses `forum_groups` → `forum_channels` → `forum_messages` and separate `forum_dm_*` for DMs.

You can:

- **Option A:** Build the new UI under a new route (e.g. `/app/(platform)/messages/` or `/forum`) and keep existing `/messages` until migration.
- **Option B:** Replace `/messages` with the new three-panel layout and migrate existing threads to `forum_dm_conversations` (and optionally one “Legacy” group) later.

Recommendation: **Option A** for Phase 1 so you can ship “groups + channels” without touching current DMs.

---

## 3. Suggested build order (Phase 1 — replace GroupMe)

1. **Schema** — Done (run the SQL above).
2. **Layout** — Three-panel layout at e.g. `app/(platform)/messages/layout.tsx`: sidebar (groups + DMs), main (channel or DM), right (members). Fetch user’s groups and DM conversations; realtime on `forum_members` / `forum_dm_conversations` for live unread.
3. **Group + channel view** — `app/(platform)/messages/groups/[groupId]/channels/[channelId]/page.tsx`: channel header, message list (infinite scroll), composer. Realtime on `forum_messages` for `channel_id = current`.
4. **DM inbox + conversation** — Inbox list (All/Unread, starred), conversation view with read receipts and composer. Realtime on `forum_dm_messages`.
5. **Invite link** — Generate/lookup by `forum_invite_links.code`; landing page `/invite/[code]` → join group (insert `forum_members`), increment `use_count`.

After that: reply threads (Prompt 4), reactions (Prompt 5), then search, mass messaging, notifications.

---

## 4. Brand and tokens

PRD: Navy `#0B2545`, Gold `#C8A94A`, Barlow Condensed (labels) + DM Sans (body). Add `styles/messaging-tokens.css` when you build the layout so the new messaging UI uses these consistently.

---

## 5. Env vars (when you add SMS/digest later)

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (SMS).
- `RESEND_API_KEY` (weekly digest).

Not required for Phase 1 (groups + channels + DMs + invite link).
