INSERT INTO logo_mappings (entity_name, entity_type, logo_url)
VALUES ('Davie', 'high_school', 'https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/awB8JmYm0tFIm2IW_ZuKI-Davie%20.png')
ON CONFLICT (entity_name, entity_type) 
DO UPDATE SET logo_url = EXCLUDED.logo_url;
