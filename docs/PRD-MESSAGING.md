# PRD: In-Platform Messaging

**Status:** Draft  
**Goal:** Add messaging so coaches can contact prospects directly from rankings and profiles, and athletes are encouraged to log in to check messages.

---

## 1. Overview

- **Why:** Drive athlete logins (“You have a new message”) and make RecruitNC the place where coach–recruit contact starts. Message action next to names on rankings/profiles so coaches can fire off a message in one click.
- **Who:** Coaches (and other verified recruiters) send; athletes (prospects) receive and reply. Optional: RecruitNC team can send announcements to athletes.
- **Out of scope for v1:** Group chats, parent accounts, school admins. Keep v1 to 1:1 coach ↔ athlete.

---

## 2. Principles

- **Low friction for coaches:** “Message” next to a prospect’s name (rankings, search, profile) with minimal steps to send.
- **One place for athletes:** Inbox in the app; optional email digest so they know to log in.
- **Safe and transparent:** Clear rules, report path, and logging for moderation and compliance.

---

## 3. Where “Message” Appears (Surfaces)

| Surface | Placement | Notes |
|--------|-----------|--------|
| **Public rankings** (2026/2027/2028) | “Message” link/icon next to each athlete name (table and card) | Primary use case; coach sees list, clicks Message. |
| **Prospects / search results** | Same: Message next to name | Reuse same component. |
| **Athlete profile (view)** | “Message [Name]” button (when viewer is coach) | From profile while viewing a prospect. |
| **Article / state results** | Optional later: Message next to linked names | Lower priority; can add once core works. |

**Requirement:** Anywhere we show an athlete’s name in a list or detail view that coaches use, we should offer a clear “Message” action (for authenticated coach/recruiter).

---

## 4. Coach Flow (Send Message)

1. Coach is on rankings (or search/profile).
2. Clicks **Message** next to an athlete’s name.
3. **If not logged in:** Prompt to sign in (or create coach account). Return to same context after auth.
4. **If logged in:** Open a small composer (modal or slide-over):
   - To: [Athlete name] (read-only).
   - Subject (optional): short line, e.g. “Interest from [School]”.
   - Body: plain text or simple rich text; character limit (e.g. 2k).
   - Send.
5. On send: “Message sent. [Name] will see it in their RecruitNC inbox.”
6. Optionally: “Add to my list” / “Save prospect” if not already, to encourage follow-up.

**Constraints:**

- Rate limit per coach (e.g. N messages per day) to prevent spam.
- No attachments in v1 (or allow only one link in body).
- Log each send (sender, recipient, timestamp) for moderation and compliance.

---

## 5. Athlete Flow (Receive & Reply)

1. Athlete gets a message (stored in DB; optional: email “You have a new message on RecruitNC”).
2. Athlete logs in and sees **Inbox** (nav item or dashboard widget).
3. Inbox: list of conversations (last message preview, unread count).
4. Click conversation → thread view. Can reply in thread.
5. Reply sends to coach; coach can get in-app notification and/or email.

**Requirement:** Inbox is visible when the user is an athlete (or has athlete profile). Coaches see a “Sent” or “Conversations” view for their outbound messages.

---

## 6. Data Model (Conceptual)

- **Conversations:** `id`, `athlete_id`, `coach_id` (or sender_role + sender_id), `created_at`, `updated_at`.
- **Messages:** `id`, `conversation_id`, `sender_id`, `sender_role` (coach | athlete | system), `body`, `created_at`; optional `read_at` per recipient.
- **Unread / notifications:** Unread count per conversation for athlete; optional notification row for “new message” (in-app or email).

Athletes and coaches are existing users (we may need a `role` or `coach_profiles` table if not already present).

---

## 7. Permissions & Identity

- **Who can send to athletes:** Authenticated users with a “coach” or “recruiter” role (or linked to a college program). Define how we verify (e.g. school email, admin approval).
- **Who can reply:** The athlete (account linked to that prospect profile). Coach can reply in the same thread.
- **Blocking:** Athlete can “block” or “archive” a conversation; coach cannot message that athlete again (or only with a clear “request to message again” flow later).

---

## 8. Non-Functional

- **NCAA:** Don’t claim the product makes messaging “compliant”; coaches are responsible for contact rules. We provide a clear audit trail (who messaged whom, when).
- **Moderation:** Report button on every message/conversation; review queue for RecruitNC admin; ability to disable a coach’s messaging.
- **Performance:** Inbox and thread load in &lt; 2s; send &lt; 1s under normal load.
- **Mobile:** Composer and inbox must work on small screens (responsive or PWA).

---

## 9. Phased Rollout

| Phase | Scope | Success |
|-------|--------|--------|
| **Phase 1** | Message action on public rankings (and one profile placement). Coach composer modal. Persist messages; athlete inbox (read-only or read + reply). | Coaches send messages; athletes log in and read. |
| **Phase 2** | Email “You have a new message”; unread badges; reply from athlete. | Reply rate and return logins increase. |
| **Phase 3** | “Message” on prospects search, profile view, optional article links. Coach “Sent” list. Notifications. | Message volume and engagement. |
| **Later** | Optional: RecruitNC announcements, richer composer, attachments. | — |

---

## 10. Open Questions

- How do we define “coach” (school email domain, manual verification, paid tier)?
- Do we allow non-coach users (e.g. parents) to message? Likely no in v1.
- Email delivery: use existing provider (e.g. Resend, SendGrid) for “new message” emails?
- Do we show “Message” to logged-out users (then prompt login) or only to logged-in coaches?

---

## 11. Acceptance Criteria (Phase 1)

- [ ] On public rankings (2026/2027/2028), each athlete row/card has a visible “Message” control.
- [ ] Clicking “Message” opens a composer (modal or slide-over) with To (athlete), optional subject, body.
- [ ] Only authenticated coach/recruiter can send; otherwise show sign-in prompt.
- [ ] Message is stored and associated with coach and athlete.
- [ ] Athlete has an Inbox (or “Messages”) entry in nav/dashboard and can see conversations and message content.
- [ ] No P0 bugs on send or load; rate limit and one-way audit log in place.

---

*Next: After state pages are finished, use this PRD to scope Phase 1 tasks (DB schema, API, rankings UI, inbox UI) and iterate.*
