-- Add Randolph College to the schools table
-- Based on official Randolph College branding: Yellow/Gold primary, Black/Gray secondary

INSERT INTO schools (name, logo_url, primary_color, secondary_color)
VALUES (
  'Randolph College',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/aazqfk1d-1745968918971.png',
  '#FFC72C', -- Randolph Gold/Yellow (primary brand color)
  '#000000'  -- Black (secondary color)
)
ON CONFLICT (name) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color
RETURNING id, name, primary_color, secondary_color, logo_url;
