-- Run in Supabase SQL Editor.
-- Creates user_profiles if it doesn't exist, then ensures headshot_url column exists.
-- Idempotent: safe to run multiple times.

-- 1) Create user_profiles if missing (e.g. fresh project)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user',
  cell_phone TEXT,
  location TEXT,
  bio TEXT,
  headshot_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Add headshot_url if table already existed without it
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS headshot_url TEXT;

COMMENT ON COLUMN public.user_profiles.headshot_url IS 'Profile photo URL; used in Community/messaging avatar.';

-- 3) RLS (skip if you already have policies)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4) Index for lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
