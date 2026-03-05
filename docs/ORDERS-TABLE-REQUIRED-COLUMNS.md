# Orders table: required columns and recover-order

The app does **not** have the full `orders` table schema in the repo. Your Supabase `orders` table may have been created or altered elsewhere (e.g. another app, dashboard) with NOT NULL on extra columns. We fix NOT NULL errors as they appear (e.g. `billing_first_name`, `billing_address_line1`); to avoid more surprises, use the steps below.

## 1. List NOT NULL columns in your database

Run this in **Supabase → SQL Editor** to see every `orders` column and whether it allows NULL:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;
```

Filter to **only NOT NULL columns** (these must be set on every insert):

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders' AND is_nullable = 'NO'
ORDER BY ordinal_position;
```

If any column in that list is **not** in the “Columns the app sets” list below, either:

- **Option A:** Add that column to the app (in `lib/order-shipping.ts` and/or `app/actions/stripe.ts` and webhook) with a safe default (e.g. empty string or `"Recovered"`), or  
- **Option B:** In Supabase, alter the column to allow NULL:  
  `ALTER TABLE orders ALTER COLUMN your_column DROP NOT NULL;`

## 2. Columns the app sets on every order insert

All order inserts go through `lib/order-shipping.ts` and/or `app/actions/stripe.ts`. The following are set explicitly (with non-null defaults where needed):

**From `orderShippingFields(customerName, address)` (webhook, Blue sync, etc.):**

- `shipping_first_name`, `shipping_last_name`
- `billing_first_name`, `billing_last_name`
- `shipping_address_line1`, `shipping_address_line2`, `shipping_city`, `shipping_state`, `shipping_postal_code`, `shipping_country`, `shipping_phone`
- `billing_address_line1`, `billing_address_line2`, `billing_city`, `billing_state`, `billing_postal_code`, `billing_country` (no `billing_phone` — omit if your table doesn’t have it)

**From `app/actions/stripe.ts` (and same spread in webhook where applicable):**

- `id`, `order_number`, `customer_email`, `email` (same as customer_email; required NOT NULL in DB), `customer_name`
- Same shipping/billing name and address as above (via `flatShippingFromAddress` + `flatBillingFromAddress`)
- `shipping_address` (jsonb), `shipping_method` (jsonb)
- `subtotal`, `shipping_cost`, `tax`, `discount`, `total`, `status`
- `stripe_payment_intent_id`, `stripe_session_id`, `promo_code`

**Not set by app (usually nullable or have DB default):**

- `created_at`, `updated_at`, `notes`, `tracking_info`, etc.

If your DB has NOT NULL on a column not in the first two groups, you will get a constraint error until you add it (Option A) or relax the constraint (Option B).

## 3. Recover-order and Sync from Stripe

Recover Missing Order (`/admin/recover-order`) and **Sync from Stripe** both call `createOrderFromPaymentIntent` / `createOrderFromSession` in `app/actions/stripe.ts`. Those paths use the same inserts and the same shipping/billing helpers, so they will satisfy the same NOT NULL columns listed above. If a new NOT NULL column is added in the DB, add it to `lib/order-shipping.ts` (and any direct insert in stripe.ts or webhook) with a safe default, then redeploy.
