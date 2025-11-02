-- Create schools table
CREATE TABLE schools (
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
);
