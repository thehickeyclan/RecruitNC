-- Add Mercyhurst University to schools
INSERT INTO schools (
  name,
  slug,
  division,
  location,
  logo_url,
  primary_color,
  secondary_color,
  website_url
) VALUES (
  'Mercyhurst University',
  'mercyhurst-university',
  'D2',
  'Erie, PA',
  '/schools/mercyhurst-logo.png',
  '#1B2F5C',
  '#006B5C',
  'https://www.mercyhurst.edu'
)
ON CONFLICT (slug) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color;
