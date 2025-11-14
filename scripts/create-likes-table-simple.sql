-- Create likes table with proper relationships
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only like an athlete once
  UNIQUE(user_id, athlete_id)
);

-- Add like_count to athletes table for denormalized counting
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
