# National team: invite codes, event registrations, and store products

Run the SQL below in **Supabase → SQL Editor**. This creates:

- `national_team_invite_codes` – invite-only registration codes per event
- `national_team_event_registrations` – who signed up and paid (links to store `orders` for revenue by product)
- One **product** (bundle) at **$250** (category `national_team`, not shown in store): "NHSCA 2026 – Registration + Apparel". Edit price in Admin → Store → Products
- **`show_in_public_store`** on `products`: flag so items like the NHSCA bundle don’t appear in the public apparel store. You can set it in Admin → Store → Products per product.

After this, use **Admin → Blue → National team – NHSCA 2026 payments** to see who has paid and who has not. All Stripe national team payments are recorded as store orders so you get one line item per registration.

```sql
CREATE TABLE IF NOT EXISTS national_team_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  code text NOT NULL,
  max_uses int,
  uses_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_slug, code)
);
CREATE INDEX IF NOT EXISTS idx_national_team_invite_codes_event ON national_team_invite_codes (event_slug);

CREATE TABLE IF NOT EXISTS national_team_event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  athlete_first_name text NOT NULL,
  athlete_last_name text NOT NULL,
  athlete_email text NOT NULL,
  athlete_phone text,
  parent_email text NOT NULL,
  parent_name text,
  parent_user_id uuid,
  high_school text NOT NULL,
  club_team text,
  graduation_year text NOT NULL,
  primary_weight text NOT NULL,
  secondary_weight text,
  reg_fee_cents int NOT NULL DEFAULT 0,
  apparel_fee_cents int NOT NULL DEFAULT 0,
  stripe_payment_intent_id text,
  stripe_session_id text,
  order_id uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_national_team_reg_event ON national_team_event_registrations (event_slug);
CREATE INDEX IF NOT EXISTS idx_national_team_reg_status ON national_team_event_registrations (event_slug, status);

-- Flag products that should not appear in the public apparel store (e.g. national team bundle, internal items).
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_in_public_store boolean DEFAULT true;
UPDATE products SET show_in_public_store = false WHERE category = 'national_team';

-- Single bundle SKU ($250 default). Edit price in Admin → Store → Products if needed.
INSERT INTO products (name, slug, description, category, price, in_stock, featured, image_url, display_order, show_in_public_store)
SELECT 'NHSCA 2026 – Registration + Apparel', 'nhsca-2026-bundle', 'National team event: registration and apparel bundle', 'national_team', 250, false, false, null, 0, false
WHERE NOT EXISTS (SELECT 1 FROM products WHERE category = 'national_team' AND slug = 'nhsca-2026-bundle');
-- Ensure any national_team product is hidden from public store
UPDATE products SET show_in_public_store = false WHERE category = 'national_team';
```


**If you already ran the old migration** (two products: Registration and Apparel), remove them and use the single bundle:

```sql
DELETE FROM products WHERE category = 'national_team' AND slug IN ('nhsca-2026-registration', 'nhsca-2026-apparel');
-- Then run the INSERT above for the bundle.
```
