-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Roanoke College
INSERT INTO schools (name, logo_url, primary_color, secondary_color)
VALUES (
  'Roanoke College',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-poQEWNcWEoIoHCVoaOLdfOBhpub0OC.png',
  '#8B1538',
  '#000000'
)
ON CONFLICT (name) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color;

-- Add school_id column to user_profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;
