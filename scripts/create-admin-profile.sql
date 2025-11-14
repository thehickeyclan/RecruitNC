-- Create admin profile for the current admin user
-- Run this script to create your admin profile if it doesn't exist

INSERT INTO user_profiles (id, role, full_name, created_at, updated_at)
VALUES (
  '6c8e4e80-7c49-4b18-b6a7-3b017011f2d2',
  'admin',
  'Admin User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    updated_at = NOW();
