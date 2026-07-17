# WIQ → Stripe migration runbook

Goal: move the ~48 paying WrestlingIQ families (plus 6 scholarship members) onto the
standard $55 Stripe subscription and shut WIQ down. After this, every Blue metric comes
from one system and the dashboard's dual WIQ/RecruitNC columns can be deleted.

**Mechanic:** WIQ holds the families' cards, so we cannot move payment for them. Each
family registers once through the normal invite → register → checkout flow. The signup
route detects the athlete's live WIQ subscription and anchors Stripe's first charge to
their existing WIQ renewal date (`trial_end`) — card collected at signup, first charge on
the date they'd have paid WIQ anyway, no double billing. The Stripe subscription's
metadata carries `migrated_from_wiq: <sub_w_...>` so you always know which WIQ sub to
cancel.

## Order matters

1. **Fix the two double-billed families first** (in WIQ): Taylor — cancel
   `sub_w_f2829861571d9e6e1752`, refund the ~6 overlap months; Alkurdasi — cancel
   `sub_w_bc275642d8d8b71fb2de`, refund ~7 months. Verify overlap in WIQ payment history
   before refunding.
2. **Import a fresh WIQ CSV** at `/admin/blue/subscriptions/wiq`. ⚠️ This is load-bearing,
   not cosmetic: the anchor date comes from `next_due_at` in this mirror. A stale mirror
   (past dates) makes every migrating family **bill immediately** instead of on their
   renewal date. Re-export from WIQ the same week invites go out.
3. **Create the four Stripe coupons** and matching `blue_promo_codes` rows (code →
   `stripe_coupon_id`), so families' existing discounts carry over automatically:
   - `NCBLUEFAMILY` — 25% off, forever
   - `AllAmerican25` — 20% off, forever
   - `TarheelElite` — 100% off, forever
   - `NationalChamp25` — 100% off, forever
   The signup route auto-applies the athlete's WIQ discount code; a code with no promo
   row logs a warning and checks out at full price (it never blocks registration).
4. **Run `scripts/blue-billing-notifications.sql`** in Supabase if not already done
   (dunning + abandoned-checkout emails are live and will cover migrating families too).
5. **Send invites in waves** using the existing admin invite tool — suggest 10–12
   families/wave, scholarship families in the first wave (their checkout is $0, so
   they're the cheapest place to find flow bugs). Emails come from WIQ's member export
   (the summary CSV has no email column).
6. **After each family completes checkout:** cancel their WIQ subscription (the Stripe
   sub's `migrated_from_wiq` metadata names it). The staff new-subscription SMS already
   fires on first payment. Do not cancel WIQ before their Stripe checkout is done —
   membership would gap.
7. **Follow up stragglers** ~5 days per wave; the abandoned-checkout nudge email fires
   automatically for anyone who starts the form and stalls at payment.
8. **Decommission** once WIQ Paid count is 0: cancel the WIQ account, then delete the WIQ
   tiles/importer/`blue_wiq_subscriptions` reads from the admin dashboard.

## Price note

WIQ charged parents $51 ($50 + WIQ's fee); Stripe charges the standard $55 ("$50 + card
processing," per owner). The invite email should say this plainly — it's a $4/mo change
and hiding it costs more trust than it saves.

## Edge cases handled in code (`lib/blue-wiq-migration.ts`)

- Renewal <50h away or already past → bill at checkout (they're at renewal anyway; cancel
  WIQ same day).
- Renewal >45 days out → stale mirror data; bill at checkout rather than grant a free ride.
- Athlete not matched to a WIQ row (`athlete_id` null on the mirror) → normal signup, no
  anchor. Check `match_confidence`/unmatched rows in the mirror before their wave and fix
  the match first.
- A WIQ discount code that doesn't resolve → logged, checkout proceeds undiscounted.
