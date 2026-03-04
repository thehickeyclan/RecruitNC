# Store Flows for RecruitNC — Copy-Over Reference

Reference for copying or reimplementing the NC United Store inside RecruitNC. Use with **Option A (copy from store repo)** or **Option B (reimplement)** in the main [Store Migration Plan](./STORE-MIGRATION-PLAN.md).

---

## 1. Route Map (current store)

| Path | Purpose |
|------|--------|
| `/` or `/store` | Product listing (home / catalog) |
| `/product/[id]` or `/product/[slug]` | Product detail (variants, images, add to cart) |
| `/cart` | Cart page (edit quantities, remove, apply promo) |
| `/checkout` or `/checkout/shipping` | Shipping address |
| `/checkout/shipping-method` | Ship vs pickup at practice vs pickup at States |
| `/checkout/payment` | Payment (Stripe PaymentIntent or Checkout Session) |
| `/checkout/confirmation` or `/order/confirmation` | Thank you + order summary |
| `/admin/orders` | Orders list, filter, detail, status, tracking |
| `/admin/products` | Products CRUD, variants, images |
| `/admin/promo-codes` | Promo create/edit, limits, activate/deactivate |

Adapt paths to RecruitNC convention (e.g. `/store`, `/store/product/[id]`, `/checkout/shipping`, etc.).

---

## 2. Key Files to Copy or Reference (store repo)

- **Cart state** — Zustand (or similar) store: cart items, add/update/remove, persist by session or user; sync with `cart_items` table if needed.
- **Checkout steps** — Multi-step form: shipping, shipping-method, payment; state in URL + form or checkout context.
- **Stripe actions** — createPaymentIntent, createCheckoutSession, createOrderFromPaymentIntent, createFreeOrder; same Supabase orders / order_items shape.
- **Server actions / API** — Promo validation (code, usage limits, discount), order create/update, cart read/write.
- **Webhook handler** — payment_intent.succeeded, optionally checkout.session.completed; create/update order from metadata; handle free orders and drop-ins.

---

## 3. Checkout Sequence (behavior to preserve)

1. **Shipping** — Collect address; validate; save to checkout state or orders.shipping_*.
2. **Shipping method** — Ship, pickup at practice, pickup at States; may affect price or display.
3. **Payment** — If total is 0 (promo/free), call createFreeOrder and redirect to confirmation. Else create Stripe PaymentIntent (or Checkout Session), confirm on client, then rely on webhook to create/update order.
4. **Confirmation** — Show order id, summary, tracking link if available; optionally send confirmation email (if in current store).

Webhook must create orders row and order_items from Stripe metadata (or session) and handle edge cases (free order, drop-in, partial failure).

---

## 4. Webhook Events (store)

- **payment_intent.succeeded** — Primary: create or update order and order_items from metadata; mark paid.
- **checkout.session.completed** — If using Checkout Session; create order from session and line items.
- **customer.subscription.* / invoice.paid** — If store or RecruitNC use Stripe subscriptions (e.g. Blue); keep existing RecruitNC handling and add store-specific logic only if needed.

Metadata shape: ensure store sends order_id or equivalent and line items so webhook can write to orders and order_items without duplication.

**Duplicate orders (e.g. same $5 charge repeated):** Caused by webhook retries + client/confirmation both creating orders with no DB uniqueness. Fix: run the SQL in "Prevent duplicate orders" below; code now treats unique violation (23505) as idempotent success and confirmation page only runs the order-success path once per load.

**Prevent duplicate orders (run in Supabase SQL Editor):**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_payment_intent_id_key
  ON orders (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
```

---

## 5. Admin (store)

- **Orders** — List with filters; detail view; update status, tracking number, notes; same orders table.
- **Products** — CRUD; variants (e.g. size); images; inventory if applicable; same products, product_variants, product_images.
- **Promo codes** — Create/edit; usage limits; active/inactive; same promo_codes table.
- **Customers** — List from customers or derived from orders; recover order by email or id.
- **2026 Shoe Campaign** — If still in use: campaign_state, campaign_shoe_2026_votes, campaign_page_events; admin UI to view or manage.

Protect all store admin routes with RecruitNC admin auth (or existing role check).

---

## 6. Data Shape (no schema change)

- **orders** — id, customer_id, status, shipping_*, totals, stripe_payment_intent_id, etc.
- **order_items** — order_id, product_id, variant_id, quantity, price, etc.
- **cart_items** — session_id or user_id, product_id, variant_id, quantity.
- **products**, **product_variants**, **product_images**, **product_reviews** — standard catalog.
- **promo_codes** — code, discount, usage limits, active.
- **customers** — id, email, etc.; link to RecruitNC user if desired.

Use same column names and types as current store so webhook and existing queries keep working.

---

Use this doc alongside STORE-MIGRATION-PLAN.md and RECRUITNC_PHASE1_ROUTE_STUBS.md when implementing the store in RecruitNC.
