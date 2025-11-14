-- Update Montreat College in the schools table with logo and brand colors
-- This will make the logo and colors appear on the admin schools page

UPDATE schools
SET 
  logo_url = 'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/QS-jExE_V4gnRb3SrkmUP-Montreat.png',
  primary_color = '#0047AB',  -- Blue
  secondary_color = '#FFD700'  -- Gold
WHERE name = 'Montreat College';

-- Verify the update
SELECT 
  id,
  name,
  logo_url,
  primary_color,
  secondary_color,
  is_test
FROM schools
WHERE name = 'Montreat College';
