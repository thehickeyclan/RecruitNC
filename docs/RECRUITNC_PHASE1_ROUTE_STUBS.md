# RecruitNC Phase 1 — Store Route Stubs

Exact route stubs to add in RecruitNC so the Store link can point in-app and the team can implement or copy store logic incrementally. See [Store Migration Plan](./STORE-MIGRATION-PLAN.md) for full context.

---

## 1. Route List (add these first)

| Route | File (App Router) | Stub behavior |
|-------|-------------------|----------------|
| `/store` | `app/store/page.tsx` | Store home: placeholder or “Coming soon” or fetch featured products and render list. |
| `/store/product/[id]` | `app/store/product/[id]/page.tsx` | Product detail: placeholder or fetch product by id and show name, price, “Add to cart” (no-op until cart exists). |
| `/cart` | `app/cart/page.tsx` | Cart: placeholder or “Your cart is empty” / list from cart state when implemented. |
| `/checkout/shipping` | `app/checkout/shipping/page.tsx` | Shipping address form stub. |
| `/checkout/shipping-method` | `app/checkout/shipping-method/page.tsx` | Shipping method selection stub. |
| `/checkout/payment` | `app/checkout/payment/page.tsx` | Payment step stub. |
| `/checkout/confirmation` | `app/checkout/confirmation/page.tsx` | Thank you + order summary stub (e.g. read order id from query). |
| (optional) `/admin/orders` | `app/admin/orders/page.tsx` | Orders list; protect with RecruitNC admin. |
| (optional) `/admin/products` | `app/admin/products/page.tsx` | Products list; protect with admin. |
| (optional) `/admin/promo-codes` | `app/admin/promo-codes/page.tsx` | Promo list; protect with admin. (RecruitNC may already have Blue promo-codes under `/admin/blue/promo-codes` — store promos can live here or alongside.) |

Use **slug** instead of **id** for product pages if the current store uses slugs (e.g. `app/store/product/[slug]/page.tsx` and resolve slug to product in loader).

---

## 2. Stub Behavior (minimal)

- **`/store`** — Render layout (RecruitNC header/footer); title “Store”; optional link to existing `api/store/featured-products` and show a simple grid or “Coming soon”.
- **`/store/product/[id]`** — 404 if no id; otherwise fetch product from Supabase (same `products` table) and show title, price, placeholder image; “Add to cart” can be a disabled button or no-op until cart is implemented.
- **`/cart`** — Title “Cart”; “Your cart is empty” or future cart state; link back to `/store`.
- **`/checkout/*`** — Each step: title only and “Next” / “Back” links to adjacent step; no real form submit until checkout logic is copied or implemented.
- **`/checkout/confirmation`** — Read `?order_id=...` from URL; show “Thank you” and order id; optional link to `/store`.

This lets the nav “Store” link point to `/store` (in-app) immediately and avoids 404s while the team implements or copies full behavior.

---

## 3. Implementation Order

1. Add the route files above (and any shared layout for `/store` or `/checkout`).
2. Point the main nav “Store” link to `/store` (replace external `store.ncwrestlingunited.com`).
3. Implement or copy product listing on `/store` (e.g. use `getFeaturedForHome` or products API).
4. Implement or copy product detail and cart (state + persistence).
5. Implement or copy checkout steps (shipping → method → payment) and Stripe + webhook.
6. Add store admin routes under `/admin/*` and protect with RecruitNC admin.
7. Extend Stripe webhook in RecruitNC for store payment events (see [STORE_FLOWS_FOR_RECRUITNC.md](./STORE_FLOWS_FOR_RECRUITNC.md)).

---

## 4. Existing RecruitNC Pieces to Reuse

- **Nav** — “Store” already in navbar; change `href` from external URL to `/store`.
- **Layout** — Store and checkout pages use root layout (header, footer, auth).
- **API** — `app/api/store/featured-products/route.ts`; add or reuse Supabase client for `products`, `orders`, `cart_items`, `promo_codes`.
- **Stripe** — `app/api/webhooks/stripe/route.ts`; extend for `payment_intent.succeeded` (and optionally `checkout.session.completed`) for store orders.
- **Auth** — Use RecruitNC auth for admin; keep checkout guest-friendly (session or optional user link later).

---

*After stubs are in place, use [STORE_FLOWS_FOR_RECRUITNC.md](./STORE_FLOWS_FOR_RECRUITNC.md) to copy or reimplement full store behavior.*
