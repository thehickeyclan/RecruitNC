# NC United Blue: Membership, Billing & WrestlingIQ Migration Plan

**Context:** ~75 Blue members stay in WrestlingIQ (no migration). **New** Blue memberships start in RecruitNC only: membership tracking, subscriptions (Stripe), billing, messaging, reporting, and a unified purchase/subscription view. This plan phases the work so you can get value quickly.

**Honest scope:** This is **not** a quick weekend project. It’s a proper CRM/billing layer. Phased right, you can have onboarding + basic Blue membership in a few weeks, then add billing and the rest incrementally.

---

## What You Already Have (RecruitNC)

- **Profiles:** `user_profiles` (auth), `athletes` (with `ncUnitedTeam` = blue/gold/none), unified profile UI
- **Blue roster:** `getBlueCurrentMembers()` — athletes with `ncUnitedTeam` blue + graduation year ≥ current
- **Design:** `scripts/blue-program-membership-design.md` — hierarchy (RecruitNC → Blue members → Active/Alumni/Drop-in), profile hub, WrestlingIQ → RecruitNC
- **No Stripe or billing yet** in codebase

---

## Phase 1: New Memberships Only (No WrestlingIQ Migration)

**Decision:** Everyone already in WrestlingIQ stays there. **New** Blue members are onboarded and managed only in RecruitNC.

**Goal:** One source of truth in RecruitNC for *new* Blue members: membership table + onboarding so new signups get athlete + membership and (later) subscription.

1. **Membership table**
   - Add table e.g. `blue_memberships`:
     - `id`, `athlete_id` (the kid), `status` (active | paused | cancelled | alumni), `started_at`, `ended_at`, `source` (recruitnc_onboarding | manual | invite), `notes`, `created_at`, `updated_at`.
     - **`payer_user_id`** (parent/guardian) — **required for management.** The parent’s RecruitNC user account is linked to this membership so they can manage billing, pause/cancel, and view the kid’s membership.
   - For roster/Blue page: either derive from `blue_memberships` or keep syncing `athletes.ncUnitedTeam` when you add/remove membership in Admin.

2. **Parent profile linked to kid’s membership**
   - Each membership is tied to an **athlete** (kid) and a **payer** (parent/guardian user_id). Parent profiles must be linked to the kid’s membership so that:
     - The **parent** can sign in and see “My kids’ memberships” (or “Manage membership” for that athlete).
     - The **parent** is the billing contact: subscription, payment method, pause/cancel, purchase history for that membership.
   - If you don’t already have a **parent–athlete** link in the DB (e.g. `user_profiles` → athlete, or a `guardians` / `parent_athlete_links` table), add one so that “this user is a parent of this athlete” and only linked parents can manage that kid’s Blue membership.
   - Reg page (invite flow): collect parent info, create/link parent user profile, create athlete, create `blue_memberships` with `athlete_id` + `payer_user_id` = parent.

   **Invite-only:** New members get a **private link** to a registration page (e.g. `/blue/register?invite=TOKEN`). No public signup; link is sent by admin (email, etc.). Token validated on load; reg page collects parent + athlete info, sign-up/profile, and (later) subscription.

3. **Onboarding flow (invite-only, private link)**
   - Blue is **invite-only**. Admin (or system) generates a **private link** per invitee (e.g. token in URL: `/blue/register?invite=xyz123` or `/join-blue/xyz123`).
   - Parent (or guardian) opens the private link → lands on a **registration page** (only accessible with a valid invite token). There they:
     - Sign up or sign in (parent’s RecruitNC account),
     - Complete parent contact info and athlete (kid) info,
     - Submit → create/link parent profile, create/link athlete, create `blue_memberships` with `athlete_id` + `payer_user_id` = parent, set `ncUnitedTeam` on athlete. Phase 2 adds “Subscribe” (Stripe) on the same page or next step.
   - That parent is then the only account (or one of the linked guardians) that can manage that kid’s membership and billing.
   - Invite tokens: store in DB (e.g. `blue_invites`: token, email optional, expires_at, used_at, created_by) and validate on the reg page; mark used when registration completes.
   - No public “Join Blue” CTA; only the private link gets you to the reg page.

**Deliverable:** New Blue members are added only via private invite link → registration page; roster and Blue page show them; existing WrestlingIQ members stay in WrestlingIQ.

---

## Phase 2: Stripe Subscriptions + Billing

**Goal:** Blue program monthly subscription, paid by parent/guardian; Stripe handles recurring charges.

- **Stripe:** Yes, Stripe does subscriptions (Stripe Billing: Products, Prices, Subscriptions). Use **Stripe Checkout** or **Customer Portal** for sign-up and “manage subscription” (pause/cancel, update card).
- **Tables:**
  - `stripe_customers`: `user_id`, `stripe_customer_id`, `email`, created/updated.
  - `subscriptions`: `id`, `user_id` (payer), `stripe_subscription_id`, `stripe_price_id`, `product_type` (e.g. `blue_monthly`, `blue_drop_in`, `apparel`, `tournament`), `status` (active | paused | cancelled | past_due), `current_period_start`, `current_period_end`, `cancel_at_period_end`, timestamps.
  - Optionally `products` / `prices` in DB or just in Stripe and reference by ID.

- **Product types to support (over time):**
  - Blue program (monthly)
  - Blue drop-in (one-off or pack)
  - Apparel (one-off; can be store today)
  - Tournament (one-off)

- **Flows:**
  - “Subscribe to Blue” → create or get Stripe Customer, create Checkout Session for subscription (optionally apply **promo code** or **family discount** — see Discounts & Promotions below) → webhook creates/updates `subscriptions` row and links to `blue_memberships` (e.g. membership stays “active” while subscription is active).
  - Webhooks: `customer.subscription.created/updated/deleted`, `invoice.paid` (for history).
  - User “Manage subscription” → Stripe Customer Portal (easiest) or your own UI that calls Stripe API (pause, cancel, update payment).

**Deliverable:** Parents can subscribe to Blue monthly; you see active subscriptions in Admin; pause/cancel works via Stripe or your UI.

---

## Fees & Pricing: $50 + Service Fee + Stripe Processing Fee

**Goal:** Parent pays **program price + service fee + Stripe processing fee**. All fees are added on top and paid by the parent; club receives program price (and service fee if you allocate it to club).

- **Blue monthly (standard example)**
  - **Program price (to club):** $50/month (configurable in Admin).
  - **Parent pays:** **$55** total per month.
  - **Stripe fee** on $55: 2.9% + $0.30 ≈ **$1.90** (deducted from the $55).
  - **After Stripe:** $55 − $1.90 = **$53.10**.
  - **Club receives:** **$50**.
  - **RecruitNC fee (your processing fee):** **$55 − Stripe fee − $50** = $53.10 − $50 ≈ **$3.10** per month.
  - So: parent pays $55; club gets $50; Stripe gets ~$1.90; RecruitNC gets the delta (~$3.10).

- **Other products**  
  Same idea: set a total charge (or program price + your fee); Stripe is deducted from the charge; club receives program price; RecruitNC fee = (total charged − Stripe fee − club amount).

- **Configuration (Admin)**
  - **Blue:** Club program price = $50/month; parent charge = $55 (configurable). RecruitNC fee = $55 − Stripe fee − $50.
  - **Other products:** Program price and parent charge (or formula) per product; Stripe always deducted from charge; RecruitNC fee = charge − Stripe − club amount.
  - Display at checkout: “Total charged: $55. Card processing (2.9% + $0.30) included.”

- **Checkout / invoice display**
  - Show: Program (club): $50; RecruitNC fee: $3.10; Card processing: $1.90; **Total charged to parent: $55.** Store breakdown in `purchases` or invoice metadata for reporting.

- **Tables / config**
  - Store: `product_prices` or config per product: `program_price` (to club), `parent_charge` (total charged to parent). RecruitNC fee = parent_charge − Stripe_fee(parent_charge) − program_price.

**Deliverable:** Blue: parent pays $55, club receives $50, RecruitNC receives ~$3.10 (delta after Stripe). Admin configures program price and parent charge; checkout shows clear breakdown.

**Goal:** Support scholarship codes, family (multi-kid) discounts, and other promotions; admin portal to create and manage them.

- **Scholarship / promo codes**
  - Table e.g. `promo_codes` or `discount_codes`: `id`, `code` (e.g. `BLUE2026`, `SCHOLARSHIP-X`), `type` (percent | fixed_amount | full_waiver), `value` (e.g. 50 for 50%, 20 for $20 off, or “full” for 100%), `applicable_to` (blue_monthly | blue_drop_in | apparel | tournament | all), `max_redemptions` (null = unlimited), `redemptions_count`, `valid_from`, `valid_until`, `created_by`, `created_at`, `notes` (e.g. “Smith family scholarship”).
  - At checkout or subscription sign-up: parent enters code → validate (exists, not expired, under max redemptions) → apply discount. Stripe supports **Coupons** and **Promotion Codes**; you can create them in Stripe and pass the Promotion Code ID at checkout, or compute discounted price in your app and create a one-off Stripe Price / invoice with that amount.
  - **Admin:** Create, edit, deactivate codes; set value, expiry, max redemptions; view redemptions per code.

- **Family discounts**
  - Rule-based: e.g. “2nd kid 25% off,” “3+ kids 40% off.” Options:
    - **A)** Store rules in config/DB (e.g. `family_discount_rules`: `min_memberships` = 2, `discount_percent` = 25). At subscription time, count how many active Blue memberships this parent (payer) already has; if ≥ 2, apply 25% (create Stripe coupon or discounted price for that subscription).
    - **B)** One-time “family” promo code you give to parents with multiple kids (e.g. `FAMILY2` = 25% off). Same as scholarship codes, just a different use case.
  - **Admin:** Configure family discount rules (min kids, discount %) or create family-specific codes; view which families used them.

- **Admin portal for discounts**
  - **Admin → Discounts / Promotions** (or **Admin → Blue → Discounts**):
    - **Promo codes:** List all codes; “Create code” (code, type, value, applicable_to, expiry, max redemptions, notes). Edit, deactivate, see redemption count and who used it.
    - **Family discounts:** View/edit rules (e.g. 2nd kid %, 3+ kid %); or list of family-only codes.
    - Optional: “Create Stripe coupon” sync so the code exists in Stripe and can be applied at Checkout.

**Deliverable:** You can create and manage scholarship codes and family discounts; parents can apply them at reg/checkout; admin sees usage and can turn codes off or adjust rules.

---

## Phase 3: Admin Portal — Memberships, Billing & Purchase History

**Goal:** Admin can see all memberships (active, paused, cancelled), billing details, total paid history, and next payment; take actions (pause, cancel). Plus per-user drill-down for full purchase history.

- **Purchases table (if not already from store):**
  - `id`, `user_id` (payer), `order_id` or `stripe_payment_intent_id` or `stripe_invoice_id`, `product_type`, `amount`, `status`, `metadata` (e.g. event id, item name), `created_at`.
  - Populate from Stripe webhooks (`invoice.paid`, `checkout.session.completed`) and/or existing store orders. Store **amount paid** per invoice so you can sum “total paid” per membership or per parent.

- **Admin portal: Memberships & Billing (roster view)**
  - **Admin → Blue → Memberships** (or **Admin → Memberships / Billing**):
    - **List all memberships** with filters: **Status** (Active | Paused | Cancelled), optional search by parent name/email or athlete name.
    - **Columns (per membership row):**
      - Athlete (kid) name
      - Parent (payer) name / email
      - **Status** — Active | Paused | Cancelled
      - **Current amount** — how much they pay per period (e.g. $X/month)
      - **Next billing / next payment date** — when the next charge runs
      - **Total paid (history)** — sum of all payments for this membership (from `purchases` or Stripe invoices)
    - **Actions per row:** **Pause** (subscription pauses at end of period or immediately, per Stripe), **Cancel** (cancel at period end or immediately), **View in Stripe** (link to Stripe dashboard). Optionally **Refund** for a specific payment.
    - Data comes from `blue_memberships` + `subscriptions` (Stripe sync) + `purchases` (or Stripe invoice history) for “total paid.”

- **Admin portal: Per-user detail (drill-down)**
  - From the list, or via search: open a **parent (payer)** or **membership** to see:
    - That parent’s kids’ memberships + subscriptions (type, status, current period, next payment, amount).
    - **Full purchase history** for that parent: Blue, drop-in, apparel, tournament, one-offs; amount and date each.
  - Actions: Cancel subscription, Refund (via Stripe), View in Stripe.

**Deliverable:** One admin view lists all memberships with status, next billing date, current amount, total paid, and next payment date; admin can pause and cancel. Drill into a user to see full purchase history.

---

## Admin Athlete Profile: Memberships, Drop-ins, Purchases, Waivers, USA Card

**Goal:** When admin opens an athlete (e.g. **Admin → Athletes → [athlete]**), one place shows that athlete’s Blue-related data: memberships, drop-ins, store purchases, insurance waivers (signed/unsigned), USA Wrestling card and expiration.

- **Sections on the admin athlete profile (plan):**
  - **Memberships** — Blue membership(s) for this athlete: status, start/end, payer (parent), link to subscription/billing. Quick actions: pause, cancel, view in Memberships roster.
  - **Drop-ins** — Drop-in attendance history (events, dates) for this athlete; link to drop_in_attendance or events table.
  - **Store purchases** — Purchases tied to this athlete (or to the parent who pays for this athlete): apparel, etc. Show order id, date, amount, product. Link to full purchase history by payer if needed.
  - **Waivers** — Insurance (and any other) waivers: required waivers list; for each, status (signed / not signed), signed at (date), signed by (parent name). Link to e-sign flow or upload if paper. (See Waivers & E-Sign below.)
  - **USA Wrestling card** — Current card: uploaded image or file, expiration date; badge or warning if expired or expiring soon. (See USA Wrestling Cards below.)

- **Data:** Same tables as elsewhere (blue_memberships, subscriptions, purchases, drop_in_attendance, waivers, usa_wrestling_cards). Admin athlete page queries by athlete_id (and payer_user_id where relevant).

**Deliverable:** Admin can open any athlete and see a clear summary of memberships, drop-ins, store purchases, waiver status, and USA Wrestling card/expiration in one place.

---

## Parent Profile: “Kids Associated”

**Goal:** Explicit **parent profile** notion: a user who is a parent/guardian has a profile that shows **kids associated** (athletes linked to them) and can manage those kids’ memberships, waivers, and (where applicable) USA cards.

- **Parent profile (concept)**
  - **Profile type** or role: Parent (already in your design: “Parent” in profile types). What makes it “parent” in behavior: link to one or more **athletes** (kids) via `parent_athlete_links` or `guardians` or `blue_memberships.payer_user_id` (so “my kids” = athletes where this user is payer or guardian).
  - **Parent view (when signed in):** “My kids” — list of associated athletes. For each: name, Blue membership status, next payment if applicable, waiver status, USA card status. Actions: manage membership, complete waiver, upload USA card, view purchase history for that kid.
  - **Admin view of a parent:** Open parent by user (e.g. Admin → Users or Admin → Parents): show parent name/email, list of **kids associated** (athletes), and for each kid the same summary as on the admin athlete profile (memberships, drop-ins, purchases, waivers, USA card). One place to see “this parent and all their kids’ status.”

- **Tables:** `parent_athlete_links` (or equivalent): `user_id` (parent), `athlete_id`, role optional, created_at. Or derive “kids” from `blue_memberships` where `payer_user_id` = this user. Ensure every Blue membership has a payer so “parent profile” always has a clear list of kids (memberships they pay for).

**Deliverable:** Parent profile = profile with “kids associated”; parent and admin both see that list; admin can open a parent and see all kids’ memberships, drop-ins, purchases, waivers, USA card in one place.

---

## Waivers (Insurance Waiver) & Electronic Signature

**Goal:** Support an **insurance waiver** (and optionally other waivers); parent/guardian can **electronically sign**; system stores who signed, when, and that it was e-signed.

- **Waiver content**
  - One or more waiver “templates” (e.g. insurance waiver text). Stored as content in DB or CMS (e.g. `waiver_templates`: id, name, body_text, version, effective_from). Or a single “insurance waiver” that you edit in Admin.

- **E-sign flow**
  - Parent (or athlete if age-appropriate) is shown the waiver text; must check “I agree” and provide **name** (and optionally confirm email). On submit: record **electronic signature** (name, date, IP or user_agent optional, user_id). Store in e.g. `waiver_signatures`: id, waiver_template_id or waiver_type, athlete_id, signer_user_id, signer_name, signed_at, ip_or_metadata optional.
  - No need for a full DocuSign-style PKI signature; “agree + name + date” is a common e-sign approach for waivers. Optionally add “draw signature” or “type signature” for a more formal look.

- **Linking to athlete**
  - Each signature is tied to an **athlete** (so “this kid’s insurance waiver is signed”). Optionally tie to membership (e.g. “waiver for Blue 2025–26”). Admin and parent see “waiver: signed on date X by Y” on the athlete.

- **Admin**
  - **Admin → Waivers:** List waiver templates; edit content; see which athletes have signed which waiver (and when). On admin athlete profile: waiver status (signed/not signed), link to re-send or request signature.
  - **Compliance:** Require waiver before completing Blue registration or before first drop-in (block or warn until signed).

**Deliverable:** Insurance waiver (and optionally others) with e-sign; parent signs once per athlete; admin sees waiver status on athlete and parent profile; optional gate at registration.

---

## USA Wrestling Cards: Upload & Expiration

**Goal:** Allow upload of **USA Wrestling membership cards** per athlete; store the card (image or file) and **expiration date**; show status and warn when expired or expiring soon.

- **Data**
  - Table e.g. `usa_wrestling_cards`: id, athlete_id, file_url or storage_path (uploaded image/PDF), expiration_date, uploaded_at, uploaded_by (user_id). Optional: membership_id from USA Wrestling if you ever parse or type it.

- **Upload**
  - **Parent or admin** can upload a card (image or PDF). Either: type expiration date manually, or (future) try to parse from image (OCR). Store file in Supabase Storage or existing blob storage; save URL + expiration_date in DB.

- **Expiration**
  - **expiration_date** is the single source of truth. Use it to:
    - Show “Valid until &lt;date&gt;” or “Expired” / “Expires in X days” on admin athlete profile and (if you expose it) parent’s “My kids” view.
    - Optional: report or filter “athletes with expired USA card” in Admin; optional reminder email when card is expiring soon (e.g. 30 days).

- **Admin**
  - On **admin athlete profile:** section “USA Wrestling card”: current card (thumbnail or link), expiration date, status badge (valid / expiring soon / expired). Actions: upload new card, replace, view.
  - Optional: **Admin → Compliance** or **Admin → Athletes** filter: “USA card expired” to chase renewals.

**Deliverable:** USA Wrestling card can be uploaded per athlete; expiration is stored and displayed; admin (and optionally parent) sees status and expiration; ability to flag or remind when expired or expiring soon.

---

## Phase 4: Messaging

**Goal:** Send announcements/reminders to Blue members (or segments).

- Options:
  - **Twilio / SendGrid:** Send SMS or email from Admin (“Send to all Blue members,” “Send to unpaid,” etc.).
  - **Stripe Customer Portal / email:** Stripe sends payment failed / receipt emails; you add “Blue program” emails from your app.
  - Lightweight: “Compose message” in Admin → select audience (all Blue, active only, by grad year) → send via your chosen provider (stored in `user_profiles` + optional `cell_phone`).

**Deliverable:** You can send one-off messages to Blue members from Admin.

---

## Phase 5: Reporting

**Goal:** Basic reports for operations and finance.

- **Examples:** Revenue by product (Blue sub, drop-in, apparel, tournament); active vs cancelled subscriptions; list of members with payment overdue; roster with “subscription status” column.
- **Implementation:** Queries on `subscriptions` + `purchases` (and Stripe if needed), exported CSV or simple dashboard in Admin.

---

## Technical Notes

- **Stripe:** Use Stripe Billing (Products, Prices, Subscriptions). Checkout for first-time signup; Customer Billing Portal for “manage my subscription” (pause/cancel) is the fastest path. Stripe Coupons and Promotion Codes can power scholarship/family codes at checkout; alternatively apply discounts in your app and create a custom price per subscription.
- **Auth / parent–child:** Parent profiles must be linked to the kid’s membership for management. `blue_memberships` has `athlete_id` (kid) + `payer_user_id` (parent). Parent signs in → sees “My kids’ memberships” and can manage billing (subscribe, pause, cancel). If you need multiple guardians per athlete, add a `parent_athlete_links` (or guardians) table and allow any linked parent to manage; otherwise one payer per membership is enough.
- **WrestlingIQ:** Existing members stay in WrestlingIQ; no import or migration. New memberships are created only in RecruitNC.

---

## Suggested Order (So You’re Not Blocked)

1. **Phase 1** (new memberships only) — membership table + onboarding in RecruitNC for *new* Blue members; existing WrestlingIQ roster stays as-is.
2. **Parent profile & “kids associated”** — parent–athlete link table; parent view “My kids”; admin view of parent with list of kids (can start with Phase 1).
3. **Phase 2** (Stripe subscriptions) — Blue monthly subscription, pause/cancel; optionally drop-in and one-off products.
4. **Discounts & Promotions** — scholarship codes, family discounts; Admin portal to create and manage codes/rules (after or alongside Phase 2).
5. **Phase 3** (admin Memberships & Billing roster) — list all memberships, next billing, total paid, pause/cancel; drill-down per user.
6. **Admin athlete profile** — one plan/screen per athlete: memberships, drop-ins, store purchases, waivers, USA Wrestling card (build as you add waivers and USA cards).
7. **Waivers & e-sign** — insurance waiver template; e-sign (name + date); store signatures per athlete; show on athlete and parent profile.
8. **USA Wrestling cards** — upload per athlete; expiration date; show and warn on admin athlete profile (and optionally parent “My kids”).
9. **Phase 4 & 5** (messaging, reporting) — add as needed.

---

## Can You Do This “Easily”?

- **Phase 1:** Lighter effort (membership table + onboarding for new members only; no WrestlingIQ import). Doable in a focused sprint.
- **Phase 2:** Standard Stripe integration; a few days to a week for subscriptions + webhooks + basic “manage” (Portal or minimal UI).
- **Phase 3–5:** Incremental; each is a few days to a week depending on how polished you want it.

**Bottom line:** Not trivial, but very doable in phases. Starting with Phase 1 (data + onboarding) gets you off WrestlingIQ and sets you up for billing without changing everything at once.
