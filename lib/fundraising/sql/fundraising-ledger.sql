-- Run once in Supabase SQL Editor.
-- Append-only audit ledger for fundraising: Stripe gifts in, reimbursements out, internal moves (training→scholarship, Guild).

CREATE TABLE IF NOT EXISTS public.fundraising_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  entry_kind text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('money_in', 'money_out', 'internal_move')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  summary text NOT NULL,
  detail text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  scholarship_donation_id uuid,
  athlete_expense_request_id uuid,
  guild_credit_allocation_id uuid,
  scholarship_id uuid,
  athlete_id uuid,
  athlete_code text,
  bucket_from text,
  bucket_to text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT fundraising_ledger_entry_kind_chk CHECK (
    entry_kind IN (
      'stripe_spartan_checkout',
      'reimbursement_paid',
      'training_fund_to_scholarship',
      'guild_credit_allocation'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_fundraising_ledger_occurred_at ON public.fundraising_ledger_entries (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_fundraising_ledger_entry_kind ON public.fundraising_ledger_entries (entry_kind);

CREATE UNIQUE INDEX IF NOT EXISTS fundraising_ledger_unique_stripe_checkout
  ON public.fundraising_ledger_entries (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS fundraising_ledger_unique_expense_paid
  ON public.fundraising_ledger_entries (athlete_expense_request_id)
  WHERE athlete_expense_request_id IS NOT NULL AND entry_kind = 'reimbursement_paid';

CREATE UNIQUE INDEX IF NOT EXISTS fundraising_ledger_unique_scholarship_donation
  ON public.fundraising_ledger_entries (scholarship_donation_id)
  WHERE scholarship_donation_id IS NOT NULL AND entry_kind = 'training_fund_to_scholarship';

CREATE UNIQUE INDEX IF NOT EXISTS fundraising_ledger_unique_guild_allocation
  ON public.fundraising_ledger_entries (guild_credit_allocation_id)
  WHERE guild_credit_allocation_id IS NOT NULL AND entry_kind = 'guild_credit_allocation';

ALTER TABLE public.fundraising_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fundraising_ledger_deny_all ON public.fundraising_ledger_entries;

CREATE POLICY fundraising_ledger_deny_all ON public.fundraising_ledger_entries FOR ALL USING (false);
