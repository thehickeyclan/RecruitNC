-- Add Andrew College to the schools table
-- Andrew College (Cuthbert, Georgia) - Official colors: Blue and Gold

INSERT INTO schools (name, logo_url, primary_color, secondary_color)
VALUES (
  'Andrew College',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/Zc8EwomucoJepMD3jv6Pj-Andrew%20College.webp',
  '#003DA5', -- Andrew College Blue (primary brand color - royal blue from logo)
  '#FFB81C'  -- Gold (secondary color - gold from logo)
)
ON CONFLICT (name) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color
RETURNING id, name, primary_color, secondary_color, logo_url;
