-- Add Averett University (DIII program in Virginia)

INSERT INTO schools (
  name,
  logo_url,
  primary_color,
  secondary_color,
  created_at
)
VALUES (
  'Averett University',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/XpGp9iaWUS2oENhX2XALE-Averett.png',
  '#002D5C', -- Navy blue (from logo)
  '#C5B358', -- Gold (from logo)
  NOW()
)
RETURNING id, name, logo_url, primary_color, secondary_color;

-- Verify the school was created
SELECT 
  id,
  name,
  logo_url,
  primary_color,
  secondary_color
FROM schools
WHERE name = 'Averett University';

