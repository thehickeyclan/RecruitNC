# WIQ legacy subscriptions — attrition plan

**Strategy (owner decision, 7/17/2026): no forced migration.** Asking ~48 families to
re-enter a card is itself a cancellation moment. WIQ is a closed pool: no new members
join it, and it drains naturally as kids graduate and families cancel. All new members
join via Stripe at $55. Consequence: Blue metrics stay split across two systems for
years — the dashboard must present a combined view rather than wait for consolidation.

**The safety net stays on.** The signup route detects a live WIQ subscription for a
registering athlete and anchors Stripe's first charge to their WIQ renewal date
(`trial_end`), with `migrated_from_wiq: <sub_w_...>` on the subscription metadata. This
is no longer a migration tool — it protects any WIQ family that registers on RecruitNC
*organically* from being double-billed (the cross-system version of the Taylor/Alkurdasi
duplicate mistake). When one completes checkout, cancel the WIQ sub named in metadata.

## Still required under the attrition plan

1. **Fix the two double-billed families first** (in WIQ): Taylor — cancel
   `sub_w_f2829861571d9e6e1752`, refund the ~6 overlap months; Alkurdasi — cancel
   `sub_w_bc275642d8d8b71fb2de`, refund ~7 months. Verify overlap in WIQ payment history
   before refunding.
2. **Import a fresh WIQ CSV** at `/admin/blue/subscriptions/wiq`. The dashboard's WIQ
   numbers and the safety net's billing anchors come from `next_due_at` in this mirror —
   with stale (past) dates, an organically re-registering WIQ family bills immediately
   instead of on their renewal date.
3. **Run `scripts/blue-billing-notifications.sql`** in Supabase if not already done
   (dunning + abandoned-checkout emails cover all Stripe members).
4. **Keep the WIQ mirror fresh on a schedule** (monthly is fine under attrition): the
   dashboard's WIQ numbers and the safety net's billing anchors are only as good as the
   last CSV import. The 7/17 export showed the mirror 7 members stale with June dates.
5. **Fix the unlinked WIQ rows**: 9 active WIQ wrestlers have no athlete row at all, and
   several more had no `athlete_id` match. Linking them sharpens the attrition forecast
   and makes the safety net work for those families.

## Attrition forecast (from 7/17/2026 data, name-matched)

The pool's center of mass is the class of 2027 (23 subs ≈ $1,109/mo):

| after June… | subs remain | ≈ $/mo |
|---|---|---|
| 2026 | 50 | $2,412 |
| 2027 | 27 | $1,303 |
| 2028 | 16 | $755 |
| 2029 | 12 | $551 |
| 2030 | 10 | $459 |

So the split-billing era halves in June 2027 and is a small tail by 2029. Note ~11 subs
belong to class-of-2026 kids who have already graduated — under "families can cancel,"
they bill until the family acts.

## If the strategy ever changes to a forced migration

The mechanics are already built: send invites in waves through the existing admin tool
(scholarship families first — $0 checkout is the cheapest flow test), create the four
Stripe coupons + `blue_promo_codes` rows first (`NCBLUEFAMILY` 25%, `AllAmerican25` 20%,
`TarheelElite` / `NationalChamp25` 100%), cancel each WIQ sub after its replacement
checkout completes, and tell families plainly the bill goes $51 → $55 for card
processing.

## Edge cases handled in code (`lib/blue-wiq-migration.ts`)

- Renewal <50h away or already past → bill at checkout (they're at renewal anyway; cancel
  WIQ same day).
- Renewal >45 days out → stale mirror data; bill at checkout rather than grant a free ride.
- Athlete not matched to a WIQ row (`athlete_id` null on the mirror) → normal signup, no
  anchor. Check `match_confidence`/unmatched rows in the mirror before their wave and fix
  the match first.
- A WIQ discount code that doesn't resolve → logged, checkout proceeds undiscounted.
