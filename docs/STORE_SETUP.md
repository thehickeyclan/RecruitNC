# Store setup after copy

## 1. Imports and paths

- **Alias:** RecruitNC uses `@/` → project root (see `tsconfig.json` → `paths: { "@/*": ["./*"] }`).
- **Paths:** Use `@/components/`, `@/lib/`, `@/app/actions/` as in the codebase. No changes needed if you copied files into the same structure.

## 2. Layout and navigation

- **RecruitNC layout:** Store, cart, and checkout pages use the **root layout** only: `app/layout.tsx` renders `<Navbar />` and `<Footer />`. There is no separate store header/footer.
- **Guest access:** `/store`, `/store/*`, `/cart`, and `/checkout/*` are public (no sign-in required). `ConditionalAuthGuard` in `components/conditional-auth-guard.tsx` treats these as public so guests can browse and complete checkout.
- **Navbar:** Store link points to `/store` (internal). Cart link is in the main nav with item count when non‑zero.
- **MainHeader / StoreHeader:** Removed from cart and all checkout pages so only the RecruitNC Navbar shows. The store listing page (`StorePageClient`) still uses `StoreHeader` for in-page search and cart; the product detail page uses `ProductHeader` (breadcrumbs only).

## 3. Environment variables

Set these for the store and checkout flow.

### Stripe

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (server). Used by checkout and webhook. |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret (`whsec_...`) from Stripe Dashboard → Developers → Webhooks. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key (client). Used on payment page. |

### Supabase

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (client/auth). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for server (orders, webhook, admin). |

(Some scripts/APIs also use `SUPABASE_URL`; `NEXT_PUBLIC_SUPABASE_URL` is the standard for this app.)

### Order confirmation email

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Optional | Resend API key for `sendOrderConfirmationEmail` (in `lib/email.ts`). If unset, confirmation email is skipped and a warning is logged. |

### Optional / other

- `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_SITE_URL` — used for redirects and auth callbacks; set in production.

## 4. Testing checklist

1. **Add to cart**
   - From `/store`, add a product (size/color if applicable). Cart count in Navbar updates.
   - Open `/cart` and confirm items, promo code, and totals.

2. **Checkout**
   - **Address** (`/checkout/shipping`): Enter shipping address and continue.
   - **Method** (`/checkout/shipping-method`): Choose shipping option and continue.
   - **Payment** (`/checkout/payment`): Use Stripe test card (e.g. `4242 4242 4242 4242`). Complete payment.

3. **Confirmation**
   - Redirect to `/checkout/confirmation?order_id=...` (and/or `payment_intent=...`).
   - Confirm order number and that confirmation email is sent (if `RESEND_API_KEY` is set).

4. **Webhook**
   - Ensure Stripe webhook endpoint is `https://<your-domain>/api/webhooks/stripe` and that `STRIPE_WEBHOOK_SECRET` matches the signing secret.
   - Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and put the printed `whsec_...` in `.env.local`.
   - After a test payment, confirm in Supabase that the order and `order_items` rows were created (or updated) by the webhook.

5. **Email**
   - If `RESEND_API_KEY` is set, confirm the order confirmation email is received and contains order number and line items.

## 5. Product images (Vercel Blob)

**Where images live**

- **File storage:** Vercel Blob Storage. Uploads go through `app/api/upload/route.ts`, which uses `@vercel/blob` and `put()`. The API returns a public URL for each uploaded file.
- **Database (Supabase):** Only URLs are stored:
  - `products.image_url` — main product image URL (or placeholder).
  - `product_images` — one row per image: `url`, optional `color`, `display_order`.

So the actual files are in Blob; Supabase only holds the URLs.

**Flow**

1. Admin uploads in product admin → `POST /api/upload` → file is stored in Vercel Blob.
2. API returns `blob.url` → that URL is saved in `products.image_url` and/or `product_images.url`.

**For RecruitNC**

- **Same DB:** Existing product rows already have `image_url` and `product_images.url` pointing at Vercel Blob URLs. RecruitNC can keep using those URLs as-is; they’re public, so no change needed for existing images.
- **New uploads from RecruitNC:** Ensure the Vercel project has the **Vercel Blob** env (e.g. `BLOB_READ_WRITE_TOKEN` from Vercel Dashboard → Storage → Blob). Then `app/api/upload/route.ts` and the product admin (`ImageUpload`, `ImageUploadWithColors`) work as-is; new uploads go to the same Blob store and the returned URL is saved to Supabase.
- **Alternative:** To switch to another storage (e.g. Supabase Storage), add a new upload API in RecruitNC that writes there and returns the new URL; then point product admin at that API and save the URLs into the same `products` / `product_images` tables.
