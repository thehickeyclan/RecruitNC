-- Add Greensboro College to the schools table with official branding

INSERT INTO schools (name, logo_url, primary_color, secondary_color)
VALUES (
  'Greensboro College',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/ottskxhb-1745958216023.png',
  '#006746', -- Pride green
  '#0A3E32'  -- Dark evergreen accent
)
ON CONFLICT (name) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color
RETURNING id, name, primary_color, secondary_color;
