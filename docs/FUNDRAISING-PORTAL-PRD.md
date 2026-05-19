# PRD: NC United Fundraising Portal

## RecruitNC Platform — Athlete Development Funding Infrastructure

| Field | Value |
|--------|--------|
| **Version** | 2.0 |
| **Date** | April 2026 |
| **Owner** | Matt Hickey, Co-Founder — NC United Wrestling |
| **Platform** | RecruitNC (Next.js / Tailwind / Supabase / Stripe) |
| **Status** | Ready for phased development |

**Revision note (v2):** Incorporates alignment with **existing production flows** (Spartan checkout, `campaign-registry`, admin exports, profile Fundraise tab, reimbursement tables, Stripe-list totals). New work should **extend** this spine unless we explicitly migrate to a different financial source of truth.

---

## 1. Executive Summary

The NC United × Spartan Race campaign demonstrated that the community gives when the path is simple, trusted, and visible. This PRD defines the **permanent fundraising layer** inside RecruitNC: public giving surfaces, campaign orchestration, transparency feeds, parent wallet visibility, reimbursement tooling, and **CRM-oriented contact data** — without pretending greenfield where Stripe + metadata already carry truth.

**Architectural principle — non-negotiable for v2:**

- **Stripe (Checkout Sessions / Payments) remains the canonical ledger for money in.** Amounts, payer identity, receipts timing, refunds, and disputes resolve there first.
- **Supabase stores** athlete/roster linkage, parent links, reimbursement workflow, Guild allocations, manual **credit corrections**, optional **mirrored donation rows** (if we add webhook sync), and admin CRM enrichments — not a competing handwritten donation ledger unless populated by automation.

**Goals:** Repeatable campaigns, year-round giving URLs, richer donor/org contact data over time, and a single NC United-branded hub families recognize — **without** blocking launches on “perfect CRM.”

---

## 2. Problem Statement

The Spartan-era experience proved demand. Gaps **relative to where we want to be**:

1. **No durable public “fundraising home”** — `/spartan` and campaign UX are powerful but feel episodic; families and donors benefit from a neutral **`/fundraising`** hub that survives rebranding per campaign.
2. **Athlete-centric giving discovery** — search/select athlete + campaign context should improve without duplicating recruiting profiles.
3. **Campaign velocity** — spinning a new drive should reuse **registry metadata + Stripe `spartan_campaign` (or successor)** patterns, not rebuild pages from scratch.
4. **CRM narrative** — “more contacts” means **capturing**: Stripe donors, logged-in parents, business prospects (often non-Stripe), and export paths — not only a new `donations` table.

**What already exists (do not orphan in planning):**

- Campaign definitions: `lib/fundraising/campaign-registry.ts` (`FUNDRAISING_CAMPAIGNS`, Stripe slug, default lookback, public path).
- Public giving: `/spartan` (and checkout metadata: `spartan_campaign`, `athlete_code` / `fundraising_code`, race runner fields, tee/shipping metadata).
- Admin: fundraising playbook UI, Stripe-backed exports (`/api/admin/spartan-export`, `listSpartanFayettevilleDonations`, corrections, tee fulfillment JSON).
- Parent: Profile → **Fundraise** (totals API, reimbursements, Guild credits) backed by linked athletes + Stripe-derived aggregates.
- Reimbursements: **`athlete_expense_requests`** (and related APIs) — not a greenfield `reimbursement_requests` table unless we migrate intentionally.
- Ledger hygiene: **`spartan_credit_corrections`**, Guild allocation tables — part of ops reality.

---

## 3. Goals & Success Metrics

| Goal | Metric | Year 1 Target |
|------|--------|----------------|
| Year-round giving | Volume outside a single mega-event window | $25k+ (tune after baseline) |
| Athlete adoption | Share of roster with working designation + visible totals | 80%+ |
| Donor retention | Donors in consecutive campaign windows | 40%+ |
| Campaign velocity | Admin time to publish a new campaign surface | &lt; 2 hours |
| Corporate / foundation | Identified business + foundation gifts (Stripe + tagged CRM) | $10k+ |
| Annual fundraising | All campaigns (Stripe-attributed) | $100k+ |
| Data platform | Unique donor emails captured + exportable | Trend up quarter-over-quarter |

---

## 4. User Roles

| Role | Description |
|------|--------------|
| **Athlete** | Rostered wrestler; may have recruiting profile separate from fundraising presence |
| **Parent** | Linked via `parent_athlete_links`; Fundraise tab, reimbursement submits |
| **Donor** | Checkout payer; may be anonymous on public lists |
| **NC United Admin** | Campaign ops, exports, approvals, corrections |
| **Corporate / foundation** | Often invoiced or card + metadata; CRM tags beyond vanilla consumer checkout |

---

## 5. Core Features

### 5.1 Athlete fundraising presence (public)

**Intent:** Donor-facing pages **separate from college recruiting** (`/athletes/...` recruiting stays untouched).

| Aspect | Recruiting profile | Fundraising presence |
|--------|-------------------|---------------------|
| Audience | Coaches | Donors, community, businesses |
| Content | Film, accolades, academics | Story-for-donors, progress, supporter activity |
| URL (target) | Existing athlete routes | **`/fundraising/athletes/[slug]`** (or slug strategy TBD — align with directory IDs / NCU codes in checkout) |

**Must not:** Surface donation totals or donor roster on recruiting surfaces.

**Implementation note:** Totals may remain **computed from Stripe window + corrections** until mirrored rows exist; caching/TTL documented per surface.

---

### 5.2 Donor giving flow

Target: fast mobile checkout (existing Stripe Checkout pattern).

- Paths: **designated athlete** | **general NC United fund** | **scholarship / special designation** (e.g. Caden Perry — subject to stakeholder approval).
- Search/select athlete (reuse directory + fundraising entry merge rules used admin-side).
- Tiers configurable per campaign (registry-driven suggested amounts).
- Post-pay: confirmation + **receipt strategy** (see §5.7). If perks / tees / race benefits apply, coordinate **quid pro quo** language with counsel — not assumed “no goods or services” globally.

---

### 5.3 Campaign management

**Target:** Admin creates/edits campaigns that map to:

- Display (hero, dates, goal, copy)
- Stripe metadata slug (**same as today’s campaign slug discipline**)
- Optional featured athlete subsets, tiers, partner branding

**Today:** Campaign switching + APIs partially exist via registry + admin fundraising UI.

**Gap:** Unified `/fundraising/[campaign-slug]` public shell vs Spartan-only route — phased.

---

### 5.4 Wallet & reimbursements

**Canonical workflow:** Extend **`athlete_expense_requests`** and parent Profile UX — do **not** introduce parallel `reimbursement_requests` without a migration plan.

**Balances:** “Wallet” in UI may remain **derived** (Stripe window totals − approved reimbursements − Guild allocations, etc.) until an explicit ledger table is justified.

**Disbursement rails:** Venmo/manual today; ACH thresholds — open question (§9).

---

### 5.5 Leaderboard & transparency

Public aggregates (campaign / all-time / filters) sourced from **same Stripe pipeline + corrections** as admin exports unless mirrored DB proven faster.

**Claims discipline:** Avoid absolute marketing copy inside PRD (“IRS expects public leaderboard”) unless counsel agrees — phrase as **donor transparency goals**.

Realtime: prefer **near-real-time** (revalidate, polling, short TTL cache) unless product proves need for Supabase realtime.

---

### 5.6 Corporate & foundation

Dedicated **`/fundraising/corporate`** (or agreed canonical path — match marketing URLs with **HardLink** / full-page load patterns used elsewhere).

Tier recognition tables are **policy** — ops must deliver promised placements before locking tiers in UI.

Optional **`corporate_contacts`**-style CRM table for non-payment leads — distinct from Stripe-paid donors.

---

### 5.7 Tax receipts

**Requirements:**

- Immediate email acknowledgment on successful payment where configured (Resend).
- **PDF attachment** — phased if complexity high; start with durable email + Stripe receipt references where acceptable legally.
- Variable disclosure when **goods/services** (tees, race entries) involved — template variants owned with counsel/accountant.

Store receipt-sent flags either on mirrored donation rows or external audit log — TBD when webhook mirror lands.

---

### 5.8 Scholarship funds (e.g. Caden Perry)

Giving designation + dedicated story page **`/fundraising/caden-perry`** — gated on family/stakeholder approval (open question).

---

## 6. Data Model — v2 stance

### Prefer evolution over duplication

| Concept | Direction |
|---------|-----------|
| Money in | Stripe objects + metadata |
| Corrections | Existing `spartan_credit_corrections` pattern |
| Reimbursements | **`athlete_expense_requests`** |
| Guild | Existing allocation tables |
| Campaign config | **`FUNDRAISING_CAMPAIGNS`** (+ optional DB mirror later if admin UI needs it) |

### Optional future tables (only with clear owners)

| Table | Purpose |
|-------|---------|
| `donation_mirror` / `stripe_checkout_facts` | Populated by **Stripe webhooks** — idempotent, session_id keyed; powers CRM without hand entry |
| `fundraising_campaigns_db` | If registry file is insufficient for non-dev campaign edits |
| `athlete_fundraising_profiles` | Donor-facing bio/slug/photo override — FK `athletes.id` |
| `crm_contacts` | Business/foundation pipeline not from checkout |

**Deprecated in this PRD vs v1 draft:** Blanket `donations` + `athlete_wallets` + `reimbursement_requests` + `corporate_donors` **as specified** — replace with “mirror + existing tables” unless we formally migrate.

---

## 7. Routes (canonical)

| Route | Access | Notes |
|-------|--------|------|
| `/fundraising` | Public | Portal home — active campaigns, CTA, playbook link |
| `/fundraising/[campaign-slug]` | Public | Campaign page (may wrap or redirect from `/spartan` during transition) |
| `/fundraising/athletes/[slug]` | Public | Fundraising-only athlete surface |
| `/fundraising/corporate` | Public | Corporate giving |
| `/fundraising/caden-perry` | Public | Scholarship — if approved |
| `/spartan` | Public | Existing; may alias to active campaign until unified |
| `/profile` (Fundraise tab) | Parent | Wallet view, reimbursements, Guild — **primary parent hub** vs duplicative `/dashboard/wallet` unless athlete-specific dashboard is required |
| `/admin/fundraising` | Admin | Existing; extend |

**Navigation:** Follow project rules for **HardLink** / anchor patterns on critical routes.

---

## 8. Phase plan (adjusted)

### Phase 0 — Comms (parallel, not blocked on code)

- Post-event **recap** + **playbook** release; one canonical donate URL; optional email gate for playbook CRM capture.

### Phase 1 — Durable hub + light CRM (2–4 weeks — scope to team)

- `/fundraising` shell: active campaign from registry, donate CTA, playbook, link to checkout.
- Post-checkout thank-you page link to playbook (optional).
- Document **export → CRM** workflow (existing CSVs) as interim “CRM.”

### Phase 2 — Athlete fundraising surfaces + receipt hardening (6–8 weeks)

- `/fundraising/athletes/[slug]` MVP; leaderboard/totals from existing aggregate pipeline.
- Webhook-backed **donation mirror** (if CRM requirements justify dev cost).
- Receipt template review with counsel (quid pro quo variants).

### Phase 3 — Campaign builder + corporate + reporting (8–12 weeks)

- Admin campaign authoring beyond file registry (if needed).
- Corporate page + sponsor fulfillment tracking.
- Dashboards on mirrored + reimbursement data.

Timelines are **estimates** — re-baseline after Phase 1 scope lock.

---

## 9. Open questions

| # | Question | Owner |
|---|-----------|--------|
| 1 | Venmo vs ACH threshold and record-keeping | Ops / Matt |
| 2 | Default public display: show amount vs name-only vs anonymous | Matt + comms |
| 3 | Scholarship / Perry page — stakeholder sign-off | Matt / Justin |
| 4 | Corporate tier benefits — inventory of deliverable placements | Matt |
| 5 | Fundraising photo source — athlete record vs upload | Product |
| 6 | Stripe Connect / legal entity — confirm NC United settlement | Finance |
| 7 | Transition: `/spartan` → `/fundraising/...` redirect strategy | Dev + marketing |
| 8 | Webhook infra for mirror table — idempotency, refunds, chargebacks | Dev |
| 9 | Playbook hosted on portal only vs also static URL at launch | Marketing |

---

## 10. Integration map (existing)

| System | Role |
|--------|------|
| Stripe | Payments, Checkout metadata, exports |
| Supabase | Roster, links, reimbursements, corrections, allocations |
| Resend | Email (receipts, notifications) |
| Twilio | Optional SMS (staff/parent patterns elsewhere) |

---

## 11. Component / code areas (incremental)

Prefer colocating under `app/fundraising/**` and `components/fundraising/**` as the portal grows; **reuse** `lib/fundraising/campaign-registry.ts`, `lib/spartan-fayetteville-stripe.ts`, parent totals, and admin export routes rather than forks.

---

*NC United Wrestling — 501(c)(3). EIN: 99-3757238.*

*Stakeholder-facing or archived copy about gifts/receipts should match [`archive/docs/CHARITABLE-GIVING-COPY-BASELINE.md`](../archive/docs/CHARITABLE-GIVING-COPY-BASELINE.md) (Training Fund / NC United framing, IRC-style acknowledgments, checkout naming as documentation — no unconditional “tax-deductible”; donors confirm deductibility with their advisor).*

*This PRD is an internal planning document; tax and legal claims in public copy require professional review.*
