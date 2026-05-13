-- RecruitNC CRM hub: notes, triage settings, audit log, orders user link, helper indexes.
-- Run in Supabase SQL Editor (whole file). Idempotent where possible.

-- ---------------------------------------------------------------------------
-- 1) orders → RecruitNC auth user (nullable; new checkouts can populate)
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recruitnc_user_id uuid;

COMMENT ON COLUMN public.orders.recruitnc_user_id IS
  'Supabase auth user when checkout was tied to a logged-in account; use with customer_email for CRM.';

CREATE INDEX IF NOT EXISTS idx_orders_recruitnc_user_id
  ON public.orders (recruitnc_user_id)
  WHERE recruitnc_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email_lower
  ON public.orders (lower(customer_email));

-- ---------------------------------------------------------------------------
-- 2) CRM tables (service-role / admin API only; RLS on, no policies for JWT users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_contact_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_user_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_notes_contact
  ON public.crm_contact_notes (contact_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_contact_settings (
  contact_user_id uuid PRIMARY KEY,
  assigned_admin_user_id uuid,
  priority text,
  last_touched_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_contact_settings_priority_check CHECK (
    priority IS NULL OR priority IN ('low', 'normal', 'high', 'urgent')
  )
);

CREATE TABLE IF NOT EXISTS public.crm_hub_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_user_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_hub_audit_contact
  ON public.crm_hub_audit_log (contact_user_id, created_at DESC);

ALTER TABLE public.crm_contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_hub_audit_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3) Read-heavy hub paths (only if table + column exist)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.national_team_event_registrations') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_nt_reg_parent_user
      ON public.national_team_event_registrations (parent_user_id);
    CREATE INDEX IF NOT EXISTS idx_nt_reg_parent_email_lower
      ON public.national_team_event_registrations (lower(parent_email));
  END IF;

  IF to_regclass('public.guild_credit_allocations') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_guild_alloc_user
      ON public.guild_credit_allocations (user_id);
  END IF;

  IF to_regclass('public.drop_in_requests') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_drop_in_parent
      ON public.drop_in_requests (parent_user_id);
  END IF;

  -- blue_signups: canonical schema uses parent_email only; some deployments add payer_user_id later.
  IF to_regclass('public.blue_signups') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'blue_signups'
        AND column_name = 'payer_user_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_blue_sig_payer
        ON public.blue_signups (payer_user_id);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_blue_signups_parent_email_lower
      ON public.blue_signups (lower(parent_email));
  END IF;

  IF to_regclass('public.blue_memberships') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'blue_memberships'
        AND column_name = 'payer_user_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_blue_mem_payer
        ON public.blue_memberships (payer_user_id);
    END IF;
  END IF;
END $$;
