# Blue Program Membership & RecruitNC Unification (Design Note)

This document captures the product and data model direction for NC United Blue membership, alumni, drop-ins, and how they fit into RecruitNC/Legacy. **No code changes are specified here**—use this as the single reference for future implementation.

---

## 1. Membership hierarchy

- **RecruitNC / Legacy** = the full platform member base (everyone with an account: athletes, parents, HS/Club coaches, fans, referees, college coaches, admins). Store, subscriptions, profiles, and profile hub live at this level.
- **Blue members** = a **subset** of RecruitNC. Not every RecruitNC member is Blue; every Blue member is a RecruitNC member with an additional Blue relationship.
- **Active Blue Member** = currently in the Blue program (e.g. still in high school; definition can use graduation date).
- **Blue Alumni** = was in Blue, now graduated / moved on (graduation date in the past).
- **Drop-ins** = people who have attended one or more Blue drop-in practices (e.g. signed up via NC United calendar) but are not necessarily Blue members. Need a way to track drop-in attendance (who, when, which event).

---

## 2. Profile types (Legacy/DB)

Current profile types: **Athlete**, **Parent**, **HS/Club Coach**, **Fan**, **Referee**, **College Coach**, **Admin**.

- **Athlete** remains the base type.
- **Blue status** is not a separate profile type; it is **membership/participation data** (or roles derived from it):
  - Active Blue Member
  - Blue Alumni
  - Drop-in (attendance history)

So: one Athlete profile type; “Active Blue Member,” “Blue Alumni,” and “Drop-in” are tracked via membership tables or flags/roles, not as top-level profile types.

---

## 3. Where Blue status lives today

- **Athletes table**: field **`ncUnitedTeam`** (API/code) / likely **`ncunitedteam`** (DB). Values observed: `"none"`, `"blue"` (and elsewhere `"gold"`, `"both"`).
- **Unified profile**: `InlineSchoolClubEditor` lets the **user** set “NC United Program” to “None” or “NC United Blue.” That writes back to the athlete record (e.g. via self-edit or profile save).
- **Admin**: Athlete edit form and athlete actions can update the same athlete fields; Blue status can be set there if the form exposes it.

**Intent (to implement):**

- **Lock down** Blue program status: only settable in **Admin → Athletes** (or a dedicated Blue management area). Do **not** allow users to set it in the unified profile; show it as read-only there and have it populated from the athlete record.
- **Single source of truth**: Admin sets `ncUnitedTeam` (or equivalent) on the athlete; unified profile and all other surfaces read from that.

---

## 4. Active vs Alumni

- Use **graduation date** (e.g. `graduationyear` on athletes) to distinguish:
  - **Active Blue**: `ncUnitedTeam` indicates Blue **and** graduation year ≥ current year (or still in high school).
  - **Blue Alumni**: `ncUnitedTeam` indicates Blue **and** graduation year < current year (or graduated).
- Exact rule (e.g. “graduationyear < 2025” vs “graduationyear <= 2024”) can be defined when implementing. The important part is having a consistent, queryable definition so we can:
  - List “who are alumni” in admin.
  - Show “Blue Roster” (active) vs “Blue Alumni” (alumni) and alumni commit cards on the Blue page.

---

## 5. Drop-ins

- Track **drop-in attendance** (athlete/person + event + date) in a dedicated structure (e.g. `drop_in_attendance` or events with registration), not as a profile type.
- Enables: “has dropped in but not a member,” reporting, and future use in profile hub or Blue admin.

---

## 6. Profile hub (future)

- A single place (e.g. “My profile” / “Account”) where a user sees:
  - Profile history and account data (last login, account creation).
  - **Blue subscription status** (and later WrestlingIQ/RecruitNC subscription), next payment date.
  - **Store**: purchase history and purchase status (from existing store).
- Blue-specific status (Active Blue Member, Blue Alumni) appears only when that person is in the Blue subset; the rest is RecruitNC-level.

---

## 7. WrestlingIQ → RecruitNC (future)

- Subscription management (sign-ups, renewals) will move into RecruitNC.
- Need: active subscription vs member without active subscription; link athletes to parents (payers) for transactions; profile management by the right account. All of that sits on top of the same membership hierarchy above.

---

## 8. Start small: Blue alumni flip cards

- **Goal**: On the Blue program page, replace (or augment) the current Blue Alumni placeholder with **alumni commit cards** (same style as the athletes/commit flip cards), showing only **Blue alumni who have a college commitment**.
- **Data**: Athletes where:
  - `ncUnitedTeam` (or equivalent) indicates Blue,
  - `graduationyear` < current year (alumni),
  - `college` is not null/empty (committed).
- **UI**: Reuse the same commit card component used on the main athletes/commit experience; feed it only this filtered list.
- **Admin**: Need a way to **see who are alumni** (filter in Admin → Athletes by Blue + graduation year, or a dedicated “Blue members / alumni” view). Blue status itself set only in Admin → Athletes and reflected read-only in unified profile.

---

## 9. Formal “Blue management” area (optional)

- Consider a dedicated **Admin → Blue** (or “Blue members”) area that:
  - Lists active Blue members and Blue alumni (with graduation year, commitment status).
  - Allows setting/clearing Blue status (and maybe drop-in history) in one place.
  - Feeds the same athlete fields that unified profile and Blue page read from.
- This keeps “who is Blue / alumni” visible and manageable without scattering logic across generic athlete edit only.

---

*Document created from product/design discussion. Update this file as decisions are implemented or refined.*
