---
name: fundraising-portal
description: >-
  Extends NC United fundraising inside RecruitNC without breaking Spartan checkout.
  Covers /fundraising hub, campaign-registry, Stripe-session aggregates, admin exports,
  parent Profile Fundraise totals, reimbursements, and PRD constraints. Use when the user
  mentions fundraising portal, /fundraising, Spartan campaign donations, NCU checkout
  metadata, playbook hub, donor CRM, or campaign-registry changes.
---

# NC United fundraising (RecruitNC)

## Hard rules

1. **Stripe is canonical for money in.** Checkout Sessions + metadata drive totals unless a webhook-mirrored table is explicitly specified in the task.
2. **Do not break Spartan by default.** Avoid editing `app/spartan/**`, `app/api/spartan/checkout/**`, or Checkout metadata keys unless the task is an intentional migration — prefer additive routes under `app/fundraising/**` and links via **`HardLink`** (see `.cursorrules`).
3. **Campaign source of truth:** `lib/fundraising/campaign-registry.ts` (`FUNDRAISING_CAMPAIGNS`, `stripeCampaignSlug`, `publicPagePath`). New campaigns add a row + matching Stripe metadata — don’t fork slug semantics silently.
4. **Parent totals:** `lib/parent-spartan-fundraising-totals.ts` — same athlete UUID can map to **multiple NCU codes**; pick the code that matches Stripe aggregates (do not overwrite arbitrarily in a Map).
5. **Reimbursements:** existing **`athlete_expense_requests`** flow — don’t introduce a parallel ledger table without a migration plan.
6. **Ops alignment:** Admin CSV exports live under `app/api/admin/spartan-export` etc.; keep labels consistent with playbook UI (“Runners”, “Receipts”, “Credits”, “Ledger”, “Tees”).

## Planning reference

- **`docs/FUNDRAISING-PORTAL-PRD.md`** — architecture intent (v2): extend existing spine; optional webhook mirror later.

## Safe change patterns

- **Hub:** `/fundraising` lists campaigns → `HardLink` to **`fundraisingCampaignPortalPath(c)`** (`/fundraising/{adminContextKey}`), not straight to checkout.
- **Campaign landing:** `/fundraising/[campaignSlug]` resolves via **`fundraisingCampaignByPortalSlug`** (`adminContextKey` or `stripeCampaignSlug`) → primary CTA **`HardLink`** to `publicPagePath` (e.g. `/spartan`). No checkout duplication.
- **New public pages:** `app/fundraising/...`; navigation uses **`HardLink`** for reliability (same rule as Store/admin links).
- **Totals / leaderboards:** Reuse `listSpartanFayettevilleDonations`, corrections (`spartan_credit_corrections`), and existing aggregation helpers — don’t invent a second Stripe list implementation unless consolidating.

## Anti-patterns

- Hand-maintained `donations` rows without Stripe webhook design.
- Replacing `/spartan` URLs in emails/bookmarks without a redirect + QA plan.
- Showing fundraising totals or donor lists on **college recruiting** athlete surfaces (`/athletes/...` recruiting flows).
