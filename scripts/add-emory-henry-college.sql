-- Insert Emory & Henry College into schools table
INSERT INTO schools (name, logo_url, primary_color, secondary_color)
VALUES (
  'Emory & Henry College',
  '/emory-henry-logo.png',
  '#1E3A5F',
  '#FDB913'
)
ON CONFLICT (name) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color;
