-- Create schools table for college branding
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT DEFAULT '#8B1538',
  secondary_color TEXT DEFAULT '#000000',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Roanoke College as example
INSERT INTO schools (school_name, logo_url, primary_color, secondary_color)
VALUES (
  'Roanoke College',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-poQEWNcWEoIoHCVoaOLdfOBhpub0OC.png',
  '#8B1538',
  '#000000'
)
ON CONFLICT (school_name) DO NOTHING;

-- Add school_id to user_profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id ON user_profiles(school_id);
