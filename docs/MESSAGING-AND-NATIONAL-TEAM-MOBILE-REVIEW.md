# Messaging & National Team — Mobile Review

**Purpose:** Review what’s built for messaging and the national team hub, with a focus on mobile behavior and any gaps.

---

## 1. What’s built

### Messaging (Phase 1)

| Area | Implementation |
|------|----------------|
| **Schema** | `messaging_threads`, `messaging_thread_members`, `messaging_messages`, `messaging_attachments`, `messaging_reactions`, `custom_emoji`. See `docs/MESSAGING-TECHNICAL-PRD.md`. |
| **Inbox** | `/messages` — list of threads, search, All/Unread tabs, “New group” (admin). Uses `InboxList`; each row is a tappable thread. |
| **Thread view** | `/messages/[threadId]` — header (back, name, copy link, members, Team hub link for event threads, options), scrollable messages, composer. Real-time new messages (Supabase Realtime). |
| **Members** | Desktop: right sidebar (`ThreadMembersPane`). Mobile: Sheet (slide-over) via “View members” icon; `lg:hidden` for sheet trigger, `hidden lg:flex` for sidebar. |
| **Composer** | Textarea, Send, emoji/custom logos, @mentions, image attachments. Max 2000 chars. Typing indicators via broadcast. |
| **Message bubble** | Edit/delete own, reactions, custom emoji rendering, URLs and @mentions. Dropdown for actions (uses Radix; internal links in dropdowns use `<a href>` per .cursorrules). |
| **Join by link** | `/messages/join?token=...` — accepts invite token, joins thread, redirects to thread. |
| **Nav** | Messages icon in navbar (desktop and mobile) with unread badge; links to `/messages` (plain `<a href>` in mobile sheet). |

### National team hub

| Area | Implementation |
|------|----------------|
| **Hub page** | `/national-team/hub` — gated; requires access (registration/parent email or admin). Shows event cards with roster, “Add RecruitNC user,” roster table, **embedded ThreadView** for event chat, payment status. |
| **Presence** | `HubPresenceBubbles` on hub — who’s on the page (initials). |
| **Links** | “Back to National Team,” “Open in Messages” (full thread in `/messages`), registration and admin invite-code links. All use `<a href>`. |
| **Event sections** | Per-event: your registration, add user by email, roster table, group chat (min height 280px, max 400px), payment/athlete cards placeholders. |

---

## 2. Mobile-friendly aspects already in place

- **Thread page**
  - Members: Sheet on mobile (`lg:hidden` trigger), sidebar only on `lg+`.
  - “Copy link” text hidden on small screens (`hidden sm:inline`) to save space; icon still visible.
  - Full-width thread column with `max-w-2xl mx-auto`; flex layout with `min-w-0` to avoid overflow.
- **Inbox**
  - Sticky header with search and filter tabs; thread rows have `min-h-[72px]` for touch.
  - Single column, `max-w-2xl mx-auto`; no side panels on mobile.
- **Navbar**
  - Messages link uses `min-h-[44px] min-w-[44px]` on mobile for touch target.
- **Hub**
  - Responsive layout: `flex-wrap`, `px-4`, `py-8`; cards and buttons stack.
  - Roster table: wrapped in `overflow-x-auto` and table has `min-w-[320px]` so narrow screens can scroll horizontally instead of squashing.
- **Join page**
  - Centered content, `p-4` / `max-w-sm` for error state.
- **Auth gates**
  - Messages and hub show sign-in or “no access” cards with full-width buttons on small screens.

---

## 3. Things to watch on real devices

1. **Inbox → thread navigation**  
   Inbox uses `router.push(\`/messages/${t.id}\`)` (client-side). If you ever see blank or stuck thread pages on mobile, consider switching the thread row to a plain `<a href={/messages/${t.id}}>` so navigation is a full page load (same pattern as .cursorrules for critical links).

2. **Thread viewport height**  
   Thread page uses `h-[calc(100vh-0px)]`. On mobile, `100dvh` can behave better when the browser UI shows/hides; if you see layout jumps, try `min-h-[100dvh]` or `min-h-[100vh]` and flex so the composer stays at the bottom.

3. **Composer and virtual keyboard**  
   When the on-screen keyboard opens, the viewport shrinks. The current flex layout (scrollable area + composer) should keep the composer visible; if not, consider `visualViewport` or reserving space for the keyboard on focus.

4. **Hub embedded chat height**  
   Embedded `ThreadView` has `minHeight: 280, maxHeight: 400`. On short phones the keyboard can cover part of it; “Open in Messages” is the escape hatch for full-screen chat.

5. **Message row tap targets**  
   Message bubble actions (reaction, ⋮ menu) use Button/icon; if any feel small on touch devices, add `min-h-[44px] min-w-[44px]` or padding to match navbar targets.

---

## 4. Links and navigation (cursorrules)

- **Inside Radix (dropdown, sheet, dialog):** All internal links use `<a href="...">` (no `Link`/`router.push` alone). Example: thread header “Team hub” is `<a href="/national-team/hub">`.
- **Same-site routes:** No `target="_blank"` for app routes (e.g. `/messages`, `/national-team/hub`). External URLs in message body correctly use `target="_blank"`.
- **New/critical links:** Nav and hub use HardLink or plain `<a href>` where specified in .cursorrules.

---

## 5. Summary

| Area | Mobile status | Note |
|------|----------------|------|
| Messages inbox | Good | Touch-friendly rows; consider `<a href>` if client nav ever misbehaves. |
| Thread view | Good | Members in sheet on mobile; back/copy link/members/options all usable. |
| Composer | Good | Watch keyboard overlap on very small screens. |
| National team hub | Good | Roster table scrolls horizontally on narrow screens; presence and event cards work. |
| Join link / auth | Good | Centered, readable, tappable. |

One change applied in this review: **hub roster table** — added `overflow-x-auto` and `min-w-[320px]` so the table scrolls horizontally on small screens instead of squashing.
