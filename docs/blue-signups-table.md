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
  athlete_first_name text NOT NULL,
  athlete_last_name text NOT NULL,
  athlete_graduation_year int NOT NULL,
  athlete_high_school text NOT NULL,
  athlete_wrestling_club text,
  athlete_weight_class text,
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
