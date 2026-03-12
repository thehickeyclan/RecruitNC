# RecruitNC National Team — registration flow and hub

## Overview

- **Code gate** → **Registration form** → **Welcome screen** → **Team Hub** (members-only, one page for rosters, equipment, hotel, chat).

## 1. Code gate

- Registration URL is private (e.g. `/national-team/register/nhsca-2026` or `/national-team/register/nhsca-duals-2026-select`). User must enter a valid **invite code** to proceed.
- **Which roster they’re on (National vs Select) is determined by the REG LINK they use, not by the code.** You can send the same invite code for both; the link decides the roster. Invite codes are created in **Admin → National team → Invite codes** (per event — create the same code for both events if you want one code for both links).

## 2. Registration form

- User enters athlete and parent info, then is sent to Stripe Checkout for the event bundle (registration + apparel).
- On success, Stripe redirects to the **success (welcome) page**.

## 3. Welcome screen (after payment)

- **Headline:** “You’re part of something special”
- **Message:** Thank you for registering; the opportunity to compete on the best all-NC team in history is an incredible opportunity.
- **What’s next:**
  - **Team Hub** — Rosters, schedule, coaches, gear orders, and updates — all in one place.
  - **Chat** — We’ll communicate via the Community chat; open it from the Hub.
- **Next steps (CTAs):**
  - **Book a hotel.** Hotel details coming soon; we’ll share info in the Hub and via chat. (Leave vague until specific hotel info is available.)
  - **Submit your gear sizes** (Singlet, Shorts, Shirt) in the Team Hub — **no later than Sunday, March 15**.
- **Primary CTA:** “Go to NHSCA 2026 Team Hub” (or “Go to Team Hub” for other events).

**Copy rules:**

- **March 15** applies only to **gear/sizes** (“Submit your gear sizes… no later than Sunday, March 15”).
- **Hotel** is left vague everywhere: e.g. “Hotel details coming soon; we’ll share info in the Hub and via chat” and “Hotel info coming soon; we’ll post in the Hub.” No hotel deadline in the copy.
- When you have hotel details, add them to the Hub and this doc.

## 4. Team Hub (members-only)

- **One page** for National Team and Select Team (NHSCA Duals 2026): event info, rosters, equipment orders, hotel, chat.
- **Access:** User must be signed in; access is based on paid registration (parent email match or workspace member).
- **Sections:**
  - **Hotel** — “Hotel info coming soon; we’ll post in the Hub and in the team chat.”
  - **Chat** — Link(s) to Community chat for the event(s).
  - **Event dashboard** (per event or grouped National + Select):
    - Your registration
    - **Gear size** — Singlet, Shorts, Shirt per athlete; realtime save; reminder: “Please submit by Sunday, March 15”.
    - **Detailed roster** — Name, Weight, School, Grad, Singlet, Shorts, Shirt (for all paid registrations).
    - Add user, Documents, etc.
  - **NHSCA 2026 event info** (when applicable): coaches, schedule, format, venue, etc., in the hub so everything is on one page.

## 5. Public event page (`/national-team/nhsca-2026`)

- Rich event info for everyone (coaches, schedule, format, invite-only message, interest form).
- **Already registered?** — “Go to Team Hub” CTA so registered families go to the single members-only hub.

## Footer note

- Only the **gear/sizes deadline is March 15**. Hotel: leave vague until you have details. Add specific hotel info to the doc and UI when available.
