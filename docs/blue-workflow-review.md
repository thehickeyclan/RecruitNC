# Blue Program: Workflow Review

End-to-end flow from **sending an invite** through **parent registration**, **Stripe**, **email**, **confirmation**, and **tracking/reporting**.

---

## 1. Sending an invite

**Where:** Admin → Blue Program → Invites (or from Interest Forms → “Create invite” per row).

**Flow:**
- Admin creates invite: optional email, invitee name, personal note, optional `interestId` (links to Blue Interest form).
- **POST** `/api/admin/blue/invites`: generates a unique token, inserts row in `blue_invites` (optional `interest_id`), returns `registerUrl`.
- If email provided: **`sendBlueInviteEmail(to, registerUrl)`** is called (Resend). Subject: “You're invited to join NC United Blue”; body includes “Register for Blue” button and link.
- Admin can also **Send** later: **POST** `/api/admin/blue/invites/send` with `inviteId` and optional `to` (defaults to invite’s email). Same Resend email.

**Data:** `blue_invites`: token, email, expires_at (default 14 days), used_at (null until registration completes), notes, interest_id (optional).

**Gaps / notes:**
- Invite list (GET) does not return `interest_id`; only used for interest-form “Invite sent” / “Enrolled” display.
- No “invite opened” or “link clicked” tracking.

---

## 2. Parent experience: registering their kid

**Entry:** Parent uses link `{APP_URL}/blue/register?invite={token}` (from email or copied).

**Steps:**

1. **Validate token (client)**  
   - Page reads `invite` from URL.  
   - **GET** `/api/blue/invites/validate?token=...` (public): checks token exists, not used, not expired. Returns `{ valid, email? }`.  
   - If invalid: show “Invalid or expired link”. If valid: prefill parent email if returned.

2. **Form**  
   - Parent: email, password (or leave blank if already signed in with that email), first/last name, phone (optional).  
   - Athlete: first/last name, graduation year, high school, weight class (optional).  
   - Optional promo code.  
   - **Waiver:** full NC United liability text in scrollable box; required checkbox “I have read and understand…”; submit disabled until checked.

3. **Submit**  
   - **POST** `/api/blue/register` with token, parent, athlete, waiverAccepted, promoCode.

**Backend (register API) in order:**
- Validates required fields and waiver.
- Loads invite by token; rejects if used or expired.
- **Parent:** If current user’s email matches parent email → use that user. Else if password provided (min 8) → create user + `user_profiles` row. Else 400 “Sign in or provide password”.
- **Athlete:** Match existing athlete (name, grad year, school) or create new; set/ensure `ncUnitedTeam: "blue"`.
- **Waiver:** Upsert `liability_waivers` (user_id, athlete_id, waiver_type, signer_name, signed_at).
- **Link:** Upsert `parent_athlete_links` (user_id, athlete_id).
- **Already in Blue?** If athlete already has active membership → set invite `used_at`, return success (no payment).
- **New member:** Insert `blue_memberships` (athlete_id, payer_user_id, status: `pending_payment`, source: `recruitnc_onboarding`). Set invite `used_at`. Apply promo if valid (Stripe coupon + increment `blue_promo_codes.redemptions_count`). Create Stripe Checkout Session (subscription, success_url, cancel_url, metadata.membership_id). Return `{ success, checkoutUrl }`.

4. **Client**  
   - If `checkoutUrl`: redirect to Stripe Checkout.  
   - If no checkoutUrl: show success (e.g. “You’re already in Blue…”).

**Gaps / notes:**
- `source` is always `recruitnc_onboarding`; could be `invite` when coming from an invite link for reporting.
- Waiver failure to upsert is only logged; registration still succeeds.

---

## 3. Stripe integration

**Checkout:**
- Session created in register API: `mode: subscription`, one line item (price id from `STRIPE_BLUE_PRICE_ID`), `customer_email`, optional `discounts` from promo coupon, `metadata.membership_id` and `subscription_data.metadata.membership_id`.
- **Success URL:** `{APP_URL}/blue/register/success?session_id={CHECKOUT_SESSION_ID}`.  
- **Cancel URL:** `{APP_URL}/blue/register/cancelled`.

**Webhook:** **POST** `/api/webhooks/stripe` (must be configured in Stripe with signing secret `STRIPE_WEBHOOK_SECRET`).
- Verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`.
- On `checkout.session.completed`: reads `metadata.membership_id`, updates `blue_memberships` with `status: 'active'`, `stripe_customer_id`, `stripe_subscription_id`, `updated_at`.

**Result:** Membership moves from `pending_payment` to `active` when payment succeeds. Parent sees success page regardless of webhook timing (page does not re-query DB).

**Gaps / notes:**
- No handling of `customer.subscription.updated` / `deleted` (paused, cancelled, past_due). Status in DB won’t auto-update from Stripe lifecycle events.
- No handling of failed payments or dunning; Stripe may retry, but DB stays `active` until you add logic or manual process.

---

## 4. Email

**Implemented:**
- **Invite email:** Sent when creating invite with email or when using “Send” on Invites page. Resend, from “NC Wrestling United &lt;info@ncwrestlingunited.com&gt;”, subject “You're invited to join NC United Blue”, HTML with register link. Requires `RESEND_API_KEY`.

**Not implemented:**
- **Post-payment confirmation:** No email after successful subscription (e.g. “Welcome to Blue, payment received”). Success page is the only confirmation.
- **Reminder / expiry:** No email reminding that invite expires in X days.

---

## 5. Confirmation (parent-facing)

- **After submit, no payment:** “You’re already in Blue” or “We’ve linked this account” (no redirect).
- **After redirect to Stripe and payment:** Browser lands on `/blue/register/success`. Page is static: “You’re in — welcome to NC United Blue”, payment complete, next steps (practices, GroupMe, RecruitNC profile, calendar), “Sign in to RecruitNC” and “Back to Blue program”. No verification of `session_id`; trust that they only get this URL after Stripe success.
- **Cancel:** `/blue/register/cancelled` (no content checked; typically a simple “you cancelled” message).

So confirmation is **on-screen only**; no confirmation email.

---

## 6. Tracking and reporting

**Data model (relevant):**
- `blue_invites`: token, email, used_at, interest_id.
- `blue_memberships`: athlete_id, payer_user_id, status, started_at, ended_at, stripe_*, source.
- `parent_athlete_links`: user_id, athlete_id.
- `liability_waivers`: user_id, athlete_id, waiver_type, signed_at.
- `blue_promo_codes`: code, redemptions_count, etc.

**Admin – Subscriptions:**  
**GET** `/api/admin/blue/subscriptions`: Lists memberships with athlete name, payer name/email, status, amount display, started_at. Stats: active, paused, cancelled, pending_payment. Tabs: good_standing (active + pending_payment), paused, canceled. Used by Blue → Subscriptions page.

**Admin – Reports:**  
**GET** `/api/admin/blue/reports`: Returns:
- **membershipTrend:** Last 24 months: newCount, endedCount, activeAtEnd, estimatedMRR ($55/member).
- **currentActive / currentPaused / estimatedMRR.**
- **byClass:** Count by graduation year; `isAnticipatedChurn` for current senior class.
- **anticipatedChurnCount.**

Used by Blue → Reports (charts).

**Admin – Interest forms:**  
**GET** `/api/admin/blue-express-interest`: Returns interest submissions with `invite_sent` and `enrolled` (derived from `blue_invites.interest_id` and `used_at`). So you can see which interest rows got an invite and which completed registration.

**Tracking gaps:**
- Invite → registration: only via `used_at` and optional `interest_id`; no “invite sent at” or “first opened” timestamp.
- Source of membership is always `recruitnc_onboarding`; no distinction “from invite” vs “manual/add later” for reporting.
- Stripe subscription lifecycle (paused, cancelled, past_due) is not synced back into `blue_memberships.status` automatically.

---

## 7. Summary diagram

```
Admin: Create invite (optional email, interestId)
  → blue_invites row
  → [optional] sendBlueInviteEmail(to, registerUrl)

Parent: Opens /blue/register?invite=TOKEN
  → GET /api/blue/invites/validate?token=TOKEN
  → Form: parent, athlete, waiver, promo
  → POST /api/blue/register
       → Resolve/create parent, athlete
       → Waiver upsert, parent_athlete link
       → If already Blue: set invite used_at, return success
       → Else: blue_memberships (pending_payment), set invite used_at
       → Stripe Checkout Session (optional coupon)
       → Return checkoutUrl
  → Redirect to Stripe Checkout

Parent: Pays on Stripe
  → Stripe redirects to /blue/register/success?session_id=...
  → Stripe sends checkout.session.completed to webhook
  → Webhook: blue_memberships update status=active, stripe_* ids

Admin: Subscriptions = list + stats; Reports = trends, by class, MRR; Interest = list + invite_sent/enrolled.
```

---

## 8. Recommended improvements (short)

1. **Source:** Set `blue_memberships.source` to `'invite'` when registration came from an invite (always in this flow).
2. **Stripe lifecycle:** Subscribe to `customer.subscription.updated` / `deleted` (and optionally `invoice.payment_failed`) to keep `blue_memberships.status` and `ended_at` in sync with Stripe.
3. **Confirmation email:** After webhook sets membership to active, send a short “Welcome to Blue, payment received” email (e.g. to payer email).
4. **Success page:** Optionally verify `session_id` with Stripe (retrieve session) and show athlete name or “Payment received” for extra confidence.

This document reflects the codebase as of the last review; implement the above in code and run tests as needed.
