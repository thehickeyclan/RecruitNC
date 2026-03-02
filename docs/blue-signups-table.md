# Blue simple signups (isolated form)

Simple, no-auth Blue registration. Data is stored in `blue_signups`; you can merge into full profiles later (manual or script).

## Run this in Supabase SQL Editor (one block, copy all)

```sql
CREATE TABLE IF NOT EXISTS public.blue_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
CREATE INDEX IF NOT EXISTS idx_blue_invites_token ON public.blue_invites(token);
CREATE INDEX IF NOT EXISTS idx_blue_invites_used_at ON public.blue_invites(used_at) WHERE used_at IS NULL;
ALTER TABLE public.blue_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access blue_invites" ON public.blue_invites;
CREATE POLICY "Service role full access blue_invites" ON public.blue_invites FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow select by token for validation" ON public.blue_invites;
CREATE POLICY "Allow select by token for validation" ON public.blue_invites FOR SELECT TO anon USING (true);

CREATE TABLE IF NOT EXISTS public.blue_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid REFERENCES public.blue_invites(id) ON DELETE SET NULL,
  parent_email text NOT NULL,
  parent_first_name text NOT NULL,
  parent_last_name text NOT NULL,
  parent_phone text,
  parent_relationship text,
  athlete_first_name text NOT NULL,
  athlete_last_name text NOT NULL,
  athlete_graduation_year int NOT NULL,
  athlete_high_school text NOT NULL,
  athlete_wrestling_club text,
  athlete_weight_class text,
  athlete_cell_phone text,
  athlete_email text,
  athlete_gpa text,
  interest_wrestling_college boolean DEFAULT false,
  highest_achievement text,
  tshirt_size text NOT NULL,
  waiver_signed_at timestamptz NOT NULL,
  promo_code_used text,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid')),
  stripe_session_id text,
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blue_signups_invite ON public.blue_signups(invite_id);
CREATE INDEX IF NOT EXISTS idx_blue_signups_status ON public.blue_signups(status);
ALTER TABLE public.blue_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access blue_signups" ON public.blue_signups;
CREATE POLICY "Service role full access blue_signups" ON public.blue_signups FOR ALL TO service_role USING (true) WITH CHECK (true);
```

Safe to run more than once. Flow: form → POST creates row + Stripe checkout → webhook sets status=paid.

## Production checklist (before/right after deploying the new Blue form)

1. **Run the migration below** in Supabase SQL Editor so `blue_signups` has the new columns. If you skip this, parents will get a 503 and "Database is missing new registration columns."
2. Confirm Stripe env: `STRIPE_SECRET_KEY`, `STRIPE_BLUE_PRICE_ID`, and (optional) `NEXT_PUBLIC_APP_URL` for success/cancel URLs.
3. After deploy, submit a test registration (or use a test invite) and confirm you reach Stripe Checkout and the row appears in `blue_signups` with the new fields populated.

## Migration: add required parent/athlete fields (run if table already exists)

Run in Supabase SQL Editor to add columns for parent relationship, athlete cell/email/GPA, college interest, and highest achievement:

```sql
ALTER TABLE public.blue_signups ADD COLUMN IF NOT EXISTS parent_relationship text;
ALTER TABLE public.blue_signups ADD COLUMN IF NOT EXISTS athlete_cell_phone text;
ALTER TABLE public.blue_signups ADD COLUMN IF NOT EXISTS athlete_email text;
ALTER TABLE public.blue_signups ADD COLUMN IF NOT EXISTS athlete_gpa text;
ALTER TABLE public.blue_signups ADD COLUMN IF NOT EXISTS interest_wrestling_college boolean DEFAULT false;
ALTER TABLE public.blue_signups ADD COLUMN IF NOT EXISTS highest_achievement text;
```
