# Stripe env vars and payment flows

**Purpose:** Single reference so changing env for one flow doesn’t break others. Use this when adding or changing Stripe-related env (e.g. webhook secret, price IDs, URLs).

---

## Flows that hit the same webhook URL

All of these send events to **one** endpoint: `POST /api/webhooks/stripe`.

| Flow | How the webhook recognizes it | Tables / side effects |
|------|-------------------------------|------------------------|
| **Store (apparel)** | `payment_intent.succeeded` or `checkout.session.completed` with store metadata (items, customer_email, etc.) | `orders`, `order_items` |
| **Drop-ins** | `checkout.session.completed` with amount ~$20–30 and shipping method (practice/pickup/suite) or no store metadata | `orders`, `order_items` |
| **Blue subscriptions** | `checkout.session.completed` with `metadata.signup_id`; **`invoice.payment_succeeded`** (fallback when Checkout event is missed—subscription has `metadata.signup_id`); `customer.subscription.updated/deleted`; `payment_intent.succeeded` (subscription, no-op) | `blue_signups`, `blue_memberships`, `orders` (for revenue) |
| **NHSCA Duals 2026 / national team** | `checkout.session.completed` with `metadata.source === "national_team"` and `registration_id` | `national_team_event_registrations`, `orders`, `order_items` |

**Stripe Dashboard:** For the webhook that hits `/api/webhooks/stripe`, enable **`invoice.payment_succeeded`** (and `checkout.session.completed`) so paid Blue registrations still flip to **Paid** when the Checkout webhook fails or is delayed.

The **same** webhook handler branches on event type and metadata. It does **not** use different env vars per flow (no `STRIPE_STORE_SECRET` vs `STRIPE_BLUE_SECRET`). The only per-destination config is the **signing secret** Stripe sends in the request; the app must know every secret for every destination that points at this URL.

---

## Env vars and who they affect

| Env var | Used by | Single or multiple values? | If you change it |
|---------|---------|-----------------------------|-------------------|
| **`STRIPE_SECRET_KEY`** | All flows (Stripe API calls) | Single (one per Stripe account) | All Stripe API usage. Use the key for the same account that sends webhooks. **In Vercel, enable for Production *and* Preview** if you test checkout on branch preview URLs (`vercelEnv: preview`); Preview-only deploys without this var return 503 on registration checkout. |
| **`STRIPE_WEBHOOK_SECRET`** | Webhook signature verification only | **Multiple** (one per Stripe destination/endpoint) | **Must include every signing secret** for every destination that sends to this URL. Use **comma-separated** (e.g. `whsec_Blue,whsec_Store`) so Blue, Store, NHSCA, and any other destination all work. Replacing with only one secret breaks the others. |
| **`STRIPE_BLUE_PRICE_ID`** | Blue signup/register (Checkout Session) | Single | Only Blue checkout. Store, NHSCA, drop-ins unaffected. |
| **`NEXT_PUBLIC_APP_URL`** | Success/cancel URLs, invite links, emails | Single | All redirects and links that use the app URL. Set once to your production (or preview) URL. |

So:

- **Only `STRIPE_WEBHOOK_SECRET`** has the “multiple consumers, one env slot” issue. The app supports comma-separated secrets; add or keep all of them when you add a new Stripe destination or fix one flow.
- **`STRIPE_BLUE_PRICE_ID`** and **`STRIPE_SECRET_KEY`** are single-value; changing them affects only Blue or the whole account, not “other flows” in the sense of multiple webhook destinations.
- **`NEXT_PUBLIC_APP_URL`** is shared by design; change when you change the app’s public URL.

---

## Before recommending env changes

1. **Webhook secret:** See “Flows that hit the same webhook URL” above. Recommend **adding** the new destination’s secret to `STRIPE_WEBHOOK_SECRET` (comma-separated) unless the user has only one destination.
2. **Other Stripe env:** Confirm which flow uses it (Blue vs store vs national team). Changing `STRIPE_BLUE_PRICE_ID` only affects Blue; changing `STRIPE_SECRET_KEY` affects the whole Stripe account (same key for all flows).
3. **Docs:** Point to this file when explaining “will this break X?” for Stripe/env.

---

## Fundraising pause (NC United gifts — optional)

| Env var | Effect |
|--------|--------|
| **`RECRUITNC_FUNDRAISING_RECEIPTS_PAUSED`** | Set to `1` / `true` / `yes` — stops **donor 501(c)(3) acknowledgment** emails (Resend) from the Spartan Stripe webhook auto-ack path and from the admin “send receipt” API. Does **not** stop Stripe webhooks, `spartan_donations` upserts, or Store/Blue/Store checkout. |
| **`RECRUITNC_FUNDRAISING_ATHLETE_DONATIONS_DISABLED`** | Set to `1` / `true` / `yes` — hides athlete gift-page checkout UI (`/fundraising/athletes/[slug]`) and returns **503** for `/api/spartan/checkout` when the request is for an **athlete gift page** (hub + athlete slug). **`/fundraising/training-fund`** and **scholarship** hub checkouts are unchanged (legacy `/fundraising/give` redirects to Training Fund). |

Unset or any other value = normal behavior. See `lib/fundraising/fundraising-pause.ts`.

