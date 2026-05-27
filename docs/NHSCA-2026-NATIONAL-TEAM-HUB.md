# NHSCA 2026 & National Team Hub – Design

## Goal

- **NHSCA 2026** (and similar events): **Invite-only registration** — only invited kids/families can sign up. Access via a **private link** and/or an **invite key** you give to invitees. No public “Register now” on the main site.
- **Costs are not public:** Registration and apparel fees are shown only on the invite-only registration flow (and in the team hub after they’re in). No dollar amounts on public marketing pages.
- **Private team hub** (not public): One place for **national team members and their parents** only. Tabs per tournament (NHSCA Duals 2026, AAU 2026, etc.) with roster, logistics, travel, alerts, and a **GroupMe-like chat** (link or embedded). Fully coordinate travel, roster, and alerts.

---

## 1. Access control (who can see the team page)

**Allowed:**
- **National team member** = athlete on the roster for at least one event (e.g. registered + paid for NHSCA 2026, or admin-added to roster).
- **Parent** = user linked to that athlete. Options:
  - **Option A:** Use existing `athletes.claimed_by_user_id`: the account that “owns” the athlete profile is treated as parent/guardian for hub access.
  - **Option B:** Add a `national_team_registrations.parent_user_id` (or `guardian_user_id`) at registration so we know which logged-in user is the parent; hub access if that user is logged in.
- **Admins** always have access.

**Implementation:**
- New API: `GET /api/national-team/can-access-hub` (or middleware/layout check). Returns `{ allowed: boolean }`.
- Logic: user is admin **or** there exists a registration/roster row for an event where:
  - `athlete_id` (or email/name match) ties to an athlete, and that athlete’s `claimed_by_user_id === current user`, **or**
  - `parent_user_id` / `guardian_user_id === current user`.
- Gated route: e.g. `/national-team/hub` (or `/national-team/team`). If not allowed, redirect to sign-in or to a “You don’t have access” page.

---

## 2. Data model

### 2.1 Event registrations (NHSCA 2026 and future events)

One table for “paid + roster” per event keeps things simple and repeatable for 2026 and beyond.

**Table: `national_team_event_registrations`** (or `nhsca_2026_registrations` for event-specific naming)

| Column | Type | Purpose |
|--------|------|--------|
| id | uuid | PK |
| event_slug | text | e.g. `nhsca-duals-2026`, `aau-2026` |
| athlete_first_name | text | |
| athlete_last_name | text | |
| athlete_email | text | |
| athlete_phone | text | |
| parent_email | text | |
| parent_name | text | optional |
| parent_user_id | uuid | optional; links to auth.users for hub access |
| high_school | text | |
| club_team | text | optional |
| graduation_year | text | |
| primary_weight | text | e.g. "132" |
| secondary_weight | text | optional |
| reg_fee_cents | int | paid amount for registration |
| apparel_fee_cents | int | paid amount for apparel |
| stripe_payment_intent_id | text | or checkout session id |
| status | text | e.g. `pending`, `paid`, `cancelled` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

- **Roster** for an event = rows where `event_slug = 'nhsca-duals-2026'` and `status = 'paid'` (plus any admin-added “manual” roster entries if needed).
- **Hub access:** user can see hub if they are admin or if `parent_user_id = user.id` for any registration, or if we add `athlete_id` and tie to `athletes.claimed_by_user_id`.

### 2.2 Invite-only: registration key / private link

Only invited athletes should be able to register. Two complementary approaches:

**Option A – Private link only**  
- Registration URL is **not** linked from the public site (e.g. `/national-team/register/nhsca-2026`). You share it only by email or direct message. Anyone with the link can open the form. Simple; link could leak.

**Option B – Invite key (recommended)**  
- Registration page **requires an invite code** to proceed. You give each invited family a code (or one event-wide code shared only with invitees).  
- **Table: `national_team_invite_codes`**

| Column | Type | Purpose |
|--------|------|--------|
| id | uuid | PK |
| event_slug | text | e.g. `nhsca-duals-2026` |
| code | text | e.g. `NHSCA2026-ABC123` or a short token; unique per event (or globally) |
| max_uses | int | optional; null = unlimited |
| uses_count | int | default 0 |
| expires_at | timestamptz | optional |
| created_at | timestamptz | |

- Flow: User opens registration URL (private link). Page shows “Enter your invite code”; on submit we validate `code` for that `event_slug` (not expired, under max_uses). If valid, show the registration form (with fees). Optionally increment `uses_count` when a registration is completed.  
- **Combined:** Use both: private link *and* invite key. Link stays unlisted; even if it leaks, only people with a valid code can complete registration.

**Cost visibility**  
- Fees (reg + apparel) are **not** shown on any public page. They appear only: (1) on the invite-only registration page after a valid code is entered, and (2) in the team hub for those who already have access. Public event pages can say e.g. “Invite-only — details and registration link will be sent to selected athletes.”

### 2.3 Optional: link to existing athletes

- Add `athlete_id` (uuid, FK to athletes) to registrations when we can match by name/email/school so roster can show RecruitNC profile links and so “national team member” can be derived from athlete ownership.

### 2.4 Alerts / announcements (per event)

**Table: `national_team_event_alerts`**

| Column | Type |
|--------|------|
| id | uuid |
| event_slug | text |
| title | text |
| body | text |
| created_at | timestamptz |
| created_by | uuid (admin) |

- Shown in the hub under each event tab.

### 2.5 Messaging: alerts vs chat (pilot for RecruitNC messaging)

**Context:** RecruitNC plans a **broader in-app messaging platform** (e.g. team/parent chats, coach–athlete, program-wide announcements). The **national team hub** is a strong first use case: one gated audience, clear scope (per-event or team-wide), and a real need for coordination. Building it in an extensible way lets the same patterns and schema power Blue program chat, coach rooms, etc. later.

**One-way: Alerts / announcements (in-app)**  
- **Table:** `national_team_event_alerts` (per event: title, body, created_at).  
- **Flow:** Admin creates an alert for an event (e.g. NHSCA 2026); it appears in that event’s tab in the hub. Parents/athletes see it when they open the hub.  
- **Extensibility:** Same pattern can later drive “announcements” in other contexts (e.g. Blue program, school/club) with a generic `announcements` or `alerts` table keyed by `context_type` + `context_id`.  
- **Optional later:** “Email this alert to all registered families.” Not required for V1.

**Two-way: Group chat (GroupMe-like → in-app RecruitNC messaging)**  
- **V1 (ship fast):** Hub shows a **“Team chat”** card with a **link to GroupMe** (or Discord). You run the group; we store the URL and show it only to hub members. Gets coordination working immediately.  
- **V2 (first in-app channel):** Build **in-app chat** for national team as the **first channel** of the broader RecruitNC messaging platform.  
  - **Schema designed for reuse:** e.g. `conversations` (id, context_type, context_id, name, created_at) and `conversation_messages` (id, conversation_id, user_id, body, created_at). For national team, `context_type = 'national_team_event'`, `context_id = event_slug` (or one “national team” conversation). RLS: only users who can access that context can read/write.  
  - **Tech:** Supabase Realtime for live messages; simple thread UI in the hub.  
  - **Later:** Same tables + new context types (e.g. `blue_program`, `coach_room`, `school_club`) and a shared messaging UI (inbox, channels, or both).  
- **Recommendation:** If the goal is a broader RecruitNC messaging platform, treat national team chat as the pilot: either start with V2 and a reusable schema, or ship V1 (GroupMe link) for the hub and add the in-app channel in the next phase so the platform has one real use case from day one.

---

## 3. Pages and flows

### 3.1 Public: NHSCA 2026 (or event) marketing page

- **Route:** `/national-team/nhsca-2026` (or `/national-team/events/nhsca-duals-2026`).
- **Content:** Event name, dates (e.g. May 23–25, 2026), location, description. **No prices.** No “Register now” for the general public. Copy can say e.g. “Invite-only — selected athletes will receive registration details by email.”

### 3.2 Invite-only registration (private link + key)

- **Route:** e.g. `/national-team/register/nhsca-2026` (or `?event=nhsca-duals-2026`). **Not linked from public nav**; you send the link only to invited families.
- **Step 1 – Invite code:** Page shows “Enter your invite code.” User submits code; we validate against `national_team_invite_codes` (event_slug, not expired, under max_uses). If invalid, show error. If valid, store in session (or signed token) and show Step 2.
- **Step 2 – Registration form:** Athlete + parent info; **fees are shown here** (reg + apparel). Submit → Stripe; on success, insert `national_team_event_registrations`, optionally increment code `uses_count`, redirect to confirmation + “You can now access the team hub.”
- Costs are only visible on this invite-only flow, not on the public event page.

### 3.3 Private: National team hub (gated)

- **Route:** `/national-team/hub`.
- **Auth:** User must be signed in. Layout (or API) checks `can-access-hub`; if not allowed, show “Access denied” or redirect.
- **Layout:**  
  - **Tabs:** One tab per event (e.g. “NHSCA Duals 2026”, “AAU 2026”).  
  - Per tab:  
    - **Roster** (from `national_team_event_registrations` for that `event_slug`).  
    - **Logistics:** travel, hotel, schedule (content from DB or markdown; editable by admin).  
    - **Alerts:** list of `national_team_event_alerts` for that event.  
    - **Chat:** GroupMe link (or later in-app chat).
- **Navigation:** From main national team public page, “Team hub” link visible only to users who have access (or show link to everyone but hub itself returns “Access denied” if not allowed).

---

## 4. Stripe (registration + apparel)

- **Product/price setup:** In Stripe Dashboard, create products (e.g. “NHSCA Duals 2026 – Registration”, “NHSCA Duals 2026 – Apparel”). Use Price IDs in env (e.g. `STRIPE_NHSCA_2026_REG_PRICE_ID`, `STRIPE_NHSCA_2026_APPAREL_PRICE_ID`) or one combined “NHSCA 2026 package” with a single price.
- **Revenue by product:** All Stripe purchases (store, national team, drop-in) are recorded in `orders` and `order_items` so you can report revenue by product. National team uses two products (category `national_team`): "NHSCA 2026 – Registration" and "NHSCA 2026 – Apparel". Webhook creates the order and order_items on `checkout.session.completed` when metadata `source: national_team` and `registration_id` are set.
- **Flow:** On form submit, create a Checkout Session with metadata `source: national_team`, `registration_id` (uuid of pending registration). On success, webhook creates store order + order_items and updates `national_team_event_registrations` with `order_id` and `status = 'paid'`.
- Reuse existing Stripe and webhook patterns from the store and Blue signup where possible.

---

## 5. Admin

- **Invite codes:** Admin CRUD for `national_team_invite_codes`: create codes per event (e.g. one shared code “NHSCA2026-TEAM” or unique codes per family), set max_uses and expires_at. List/copy registration URL to send to invitees.
- **Registrations:** Admin list of `national_team_event_registrations` (filter by event_slug, status); ability to mark paid/cancelled or add manual roster entries.
- **Alerts:** Admin CRUD for `national_team_event_alerts` per event.
- **Logistics content:** Admin edit for event-specific content (travel, hotel, schedule), e.g. stored in `page_content` with keys like `national_team_nhsca_2026_travel`, or in an `event_logistics` table.

---

## 6. Implementation phases

| Phase | Scope |
|-------|--------|
| **1** | DB: `national_team_event_registrations`, `national_team_invite_codes`. NHSCA 2026 public page (no prices, no public register). Invite-only registration route: code entry → form with fees → Stripe → confirmation. |
| **2** | Hub access API and gated `/national-team/hub` page. Single event tab (NHSCA 2026): roster + logistics + placeholder for alerts and chat link. |
| **3** | Multiple event tabs (AAU). Alerts CRUD and display. GroupMe link in hub **or** first in-app chat (pilot for RecruitNC messaging). Admin: invite code CRUD. |

---

## 7. Where this lives in the app

- **Public:**  
  - `/national-team` – existing public national team page (mission, history, schedule).  
  - `/national-team/nhsca-2026` – new NHSCA 2026 event page with registration and roster/logistics teaser.  
  - `/national-team/interest-form` – keep existing; can add a note “For NHSCA 2026, use the official registration below.”
- **Private:**  
  - `/national-team/hub` – gated team hub with tabs (roster, logistics, alerts, chat link).

---

## 8. Summary

- **Costs:** Not public. Shown only on the invite-only registration flow (and in hub for members).  
- **Registration:** Invite-only. Private link + invite key; only invited kids/families can complete signup and pay (reg + apparel).  
- **NHSCA 2026 public page:** Event info only; no prices, no public “Register” — “Invite-only” messaging.  
- **Team hub:** Private; only national team members (via roster) and their parents and admins.  
- **Tabs:** One per tournament with roster, logistics, alerts.  
- **Chat:** Start with GroupMe link or build in-app chat as the **first use case** for a broader RecruitNC messaging platform (reusable conversations/messages schema).  
- **Fully comprehensive:** Travel, roster, alerts, and chat in one private place.  
- **Broader platform:** National team messaging (alerts + chat) is the pilot; same patterns and schema can later power Blue program, coach–athlete, and other RecruitNC messaging.
