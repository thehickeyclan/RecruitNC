-- Insert Roanoke College into the schools table
INSERT INTO schools (name, logo_url, primary_color, secondary_color, created_at, updated_at)
VALUES (
  'Roanoke College',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-poQEWNcWEoIoHCVoaOLdfOBhpub0OC.png',
  '#8B1538',
  '#000000',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  updated_at = NOW();
