-- Add Washington & Lee University to the schools table with official branding

INSERT INTO schools (name, logo_url, primary_color, secondary_color)
VALUES (
  'Washington & Lee University',
  'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/bi-_P2AfNJKAJTz7hWXHv-Washington%20%26%20Lee.png',
  '#0057B8', -- Official Generals blue
  '#0A3E89'  -- Dark accent blue
)
ON CONFLICT (name) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color
RETURNING id, name, primary_color, secondary_color;
