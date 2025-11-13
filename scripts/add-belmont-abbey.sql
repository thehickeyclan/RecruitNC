-- Add Belmont Abbey College to the schools table with official branding

INSERT INTO schools (name, logo_url, primary_color, secondary_color)
VALUES (
  'Belmont Abbey College',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logos/college/Belmont%20Abbey%20College-1755181484888.jpeg',
  '#8C001A', -- Crusader crimson
  '#1C1C1C' -- Dark slate / nearly black accent
)
ON CONFLICT (name) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color
RETURNING id, name, primary_color, secondary_color;
