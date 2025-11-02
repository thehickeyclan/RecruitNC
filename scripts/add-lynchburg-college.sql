-- Add Lynchburg College to the schools table
-- Based on the logo: vibrant red primary color, medium grey secondary color

INSERT INTO schools (name, logo_url, primary_color, secondary_color)
VALUES (
  'Lynchburg College',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/SmHkZ3IPPB6ayHiOYue4Y-Lynchburg.jpg',
  '#DC143C', -- Vibrant red (crimson) from the hornet body and letters
  '#808080' -- Medium grey from the hornet head and stripes
)
ON CONFLICT (name) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color
RETURNING id, name, primary_color, secondary_color;

