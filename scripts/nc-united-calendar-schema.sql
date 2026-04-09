-- NC United calendar (migrated from v2-nc-united-calendar)
-- Run in Supabase SQL Editor against the RecruitNC project.

CREATE TABLE IF NOT EXISTS public.events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TEXT,
  end_time TEXT,
  category TEXT NOT NULL DEFAULT 'blue-practice',
  location TEXT,
  description TEXT,
  coach TEXT,
  registration_deadline DATE,
  entry_fee NUMERIC,
  travel_info TEXT,
  weight_classes TEXT[],
  rsvp_required BOOLEAN NOT NULL DEFAULT FALSE,
  external_link TEXT,
  logo_url TEXT,
  drop_in_registration_link TEXT,
  max_drop_ins INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events (start_date);

CREATE TABLE IF NOT EXISTS public.drop_in_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id BIGINT NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  wrestler_name TEXT NOT NULL,
  wrestler_age INTEGER NOT NULL,
  wrestler_weight TEXT,
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_amount_cents INTEGER,
  payment_currency TEXT DEFAULT 'usd',
  payment_paid_at TIMESTAMPTZ,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  event_title TEXT,
  event_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drop_in_event ON public.drop_in_requests (event_id);
CREATE INDEX IF NOT EXISTS idx_drop_in_payment ON public.drop_in_requests (payment_status);
CREATE INDEX IF NOT EXISTS idx_drop_in_stripe_session ON public.drop_in_requests (stripe_session_id);
