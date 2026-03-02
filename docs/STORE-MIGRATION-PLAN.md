# Store Migration to RecruitNC — Detailed Plan

**Purpose:** Move the NC United Store into the RecruitNC project so all traffic and features (Blue program, memberships, news, rankings, store) live in one app. This document is for the RecruitNC team and stakeholders.

---

## 1. Goals

- **Single destination:** RecruitNC is the main product; store becomes a section (e.g. `/store`) instead of a separate site.
- **No data migration:** Same Supabase database and same Stripe account already used for Blue memberships — we reuse them.
- **Preserve behavior:** Cart, checkout, orders, promos, and admin keep working as they do today; only the hosting app changes.
- **Clean sunset:** After cutover, the standalone store app can be retired or kept only as a redirect.

---

## 2. Current State

| Area | Store (current) | RecruitNC |
|------|------------------|-----------|
| **Database** | Supabase (shared) | Same Supabase project |
| **Payments** | Stripe (one-time + future subscriptions) | Same Stripe (Blue memberships, etc.) |
| **Auth** | Basic Auth for /admin; optional Supabase | RecruitNC's auth |
| **Hosting** | Separate app (e.g. Vercel) | RecruitNC app (e.g. Vercel) |
| **Domain** | e.g. store.ncwrestlingunited.com or subdomain | Main RecruitNC domain |

**Shared today:** Products, orders, order_items, customers, promo_codes, cart_items, Stripe webhooks (payments, subscriptions), and any Blue/subscription data already live in the same DB and Stripe account.

---

## 3. What Moves (Scope)

### 3.1 Store front (customer-facing)

- **Product catalog** — List products by category, featured, search; product detail pages with variants, images, reviews.
- **Cart** — Add/update/remove items; persist by session or user (same `cart_items` table).
- **Checkout** — Shipping address → shipping method (ship, pickup at practice, pickup at States) → payment (Stripe PaymentIntent or Checkout Session) → confirmation.
- **Post-purchase** — Order confirmation page and any order confirmation email (if sent from same app or existing flow).

### 3.2 Store admin (internal)

- **Orders** — List, filter, view detail, update status, add tracking, notes.
- **Products** — CRUD, variants, images, inventory.
- **Promo codes** — Create/edit, usage limits, activate/deactivate.
- **Other** — Customers list, recover order, inventory, 2026 Shoe Campaign admin (if still needed), etc.

### 3.3 Integrations (reused, not rebuilt)

- **Stripe** — Same account; same products/prices for subscriptions; same (or merged) webhook endpoint for `payment_intent.succeeded`, `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, etc.
- **Supabase** — Same project; same tables and RLS (or RecruitNC service role) for products, orders, order_items, customers, cart_items, promo_codes, campaign tables.

### 3.4 Out of scope for this plan

- Changing Stripe product/price setup or Blue subscription logic.
- Changing Supabase schema (unless RecruitNC already has diverging tables; then we align).
- Building new store features; goal is parity then consolidate.

---

## 4. Technical Migration Steps

### Phase 1: Prepare in RecruitNC

1. **Routes structure**  
   Add store routes under RecruitNC app, e.g.:
   - `/store` — product listing (home)
   - `/store/product/[id]` or `/store/[slug]` — product detail
   - `/cart` — cart page
   - `/checkout/shipping` — address
   - `/checkout/shipping-method` — method selection
   - `/checkout/payment` — payment
   - `/checkout/confirmation` — thank you + order summary  

   Admin (if RecruitNC has an admin area):
   - e.g. `/admin/orders`, `/admin/products`, `/admin/promo-codes`, etc.

2. **Shared layer**  
   - Ensure RecruitNC can connect to the same Supabase project (env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` or anon + RLS).
   - Ensure Stripe env vars are available (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`).

3. **Copy or reimplement store logic**  
   - **Option A (recommended):** Copy from current store repo: cart store (Zustand), checkout steps, Stripe actions (createPaymentIntent, createCheckoutSession, createOrderFromPaymentIntent, createFreeOrder), and any server actions (promo validation, order updates). Adapt imports and UI to RecruitNC's design system and layout.
   - **Option B:** Reimplement flows in RecruitNC using the same APIs (Supabase queries, Stripe API calls) and same DB/Stripe objects. Reference current store repo for behavior and edge cases (e.g. free orders, drop-ins, metadata shape for webhook).

4. **Webhook**  
   - Add (or extend) Stripe webhook route in RecruitNC, e.g. `POST /api/webhooks/stripe`.
   - Implement the same events the store uses today: at least `payment_intent.succeeded`, and optionally `checkout.session.completed`, `customer.subscription.*`, `invoice.paid` if RecruitNC or store rely on them.
   - Create order from metadata, update order_items, handle drop-ins and free orders the same way as current store webhook.
   - Do not switch Stripe webhook URL until this is tested (see Phase 3).

### Phase 2: UI and navigation

1. **RecruitNC nav**  
   Add a clear "Store" entry (e.g. main nav or header) linking to `/store` (or chosen path).

2. **Layout**  
   Reuse RecruitNC layout for store pages (header, footer, auth) so the store feels part of RecruitNC, not a separate app.

3. **Design**  
   Use RecruitNC's components/design tokens where possible; keep store-specific pieces (e.g. product grid, cart table, checkout steps) but styled to match.

4. **Auth**  
   - Store front: cart/checkout can stay guest-friendly (session-based cart); optional "account" if RecruitNC has user accounts and you want to tie orders to users.
   - Store admin: protect with RecruitNC admin auth (or existing Basic Auth / role check) so only admins can access orders/products/promos.

### Phase 3: Stripe webhook cutover

1. **Test in staging**  
   - Deploy RecruitNC (staging) with new store + webhook.
   - Run test purchases (card + promo + free order if applicable) and confirm orders and order_items in Supabase match current behavior.
   - Use Stripe test mode and test webhook endpoint; optionally Stripe CLI to forward events.

2. **Production webhook**  
   - In Stripe Dashboard → Webhooks, add a new endpoint for RecruitNC production URL, e.g. `https://<recruitnc-domain>/api/webhooks/stripe`, with the same events the store uses.
   - Set `STRIPE_WEBHOOK_SECRET` in RecruitNC production env.
   - Test one real (small) payment on production RecruitNC store and confirm order creation.

3. **Switch traffic**  
   - Point "Store" link on the main site (and any marketing links) to RecruitNC store URL (e.g. `https://<recruitnc>/store`).
   - Optionally: disable or remove the old webhook endpoint for the standalone store so only RecruitNC receives events (avoids duplicate or conflicting order creation).

### Phase 4: Old store app

1. **Redirect (recommended)**  
   - If the old store had its own domain (e.g. store.example.com), add redirects to RecruitNC (e.g. `store.example.com` → `https://<recruitnc>/store`).
   - Keeps old links and campaigns working.

2. **Retire**  
   - Once traffic and orders are stable on RecruitNC, the standalone store repo/deployment can be read-only or retired.
   - Keep the repo for reference until you're confident you don't need to copy any more behavior.

---

## 5. Data and Tables (reference)

RecruitNC already uses the same DB. Store-relevant tables (no schema change required; reuse as-is):

- `products`, `product_variants`, `product_images`, `product_reviews`
- `orders`, `order_items`
- `customers`
- `promo_codes`
- `cart_items`
- Campaign/2026 shoe: `campaign_state`, `campaign_shoe_2026_votes`, `campaign_page_events` (if you keep that feature in RecruitNC)

Stripe: same account; same Customer and PaymentIntent/Checkout usage; subscriptions for Blue already in place.

---

## 6. Rollout Checklist (summary)

- [ ] Store routes and UI implemented (or copied and adapted) in RecruitNC.
- [ ] Cart and checkout tested (guest + logged-in if applicable).
- [ ] Stripe webhook in RecruitNC handles `payment_intent.succeeded` (and any other required events) and creates/updates orders correctly.
- [ ] Store admin (orders, products, promos) available in RecruitNC and restricted to admins.
- [ ] "Store" link on main site points to RecruitNC store URL.
- [ ] Old store domain redirects to RecruitNC store (if applicable).
- [ ] Stripe webhook URL updated (or new endpoint added and old one disabled) so only RecruitNC receives payment events.
- [ ] One production test order end-to-end on RecruitNC.
- [ ] Standalone store app deprecated or retired after a short overlap period.

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Webhook creates duplicate orders | Single live webhook endpoint (RecruitNC); disable old store endpoint before or right after cutover. |
| Different auth model | Keep checkout guest-friendly; map "order belongs to user" only if RecruitNC has a clear user id to store on `orders`. |
| Missing edge cases | Run through current store flows (promo, free order, drop-in, pickup methods) in staging and document any RecruitNC-specific behavior. |
| Broken links / SEO | 301 redirects from old store URLs to new RecruitNC store paths. |

---

## 8. Contacts and Repos

- **Current store repo:** (e.g. `e-commerce-homepage-build` or your store repo path)
- **RecruitNC repo:** (RecruitNC app repo)
- **Supabase project:** (shared; same for both)
- **Stripe account:** (shared; same for both)

---

## 9. Supporting Docs (in this repo)

- **`STORE_FLOWS_FOR_RECRUITNC.md`** — Copy-over reference: routes, key files, checkout sequence, webhook events, admin. Use for Option A (copy) or Option B (reimplement).
- **`RECRUITNC_PHASE1_ROUTE_STUBS.md`** — Exact route stubs to add in RecruitNC first (`/store`, `/store/product/[id]`, `/cart`, `/checkout/*`, optional admin), with stub behavior and implementation order.

---

*Document version: 1.0 — for RecruitNC team to execute store migration using shared database and Stripe.*
