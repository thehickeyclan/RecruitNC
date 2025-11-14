-- Create likes table with proper relationships
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only like an athlete once
  UNIQUE(user_id, athlete_id)
);

-- Add RLS policies for security
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read likes
CREATE POLICY "Likes are viewable by everyone" 
ON public.likes FOR SELECT 
USING (true);

-- Users can only insert their own likes
CREATE POLICY "Users can insert their own likes" 
ON public.likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "Users can delete their own likes" 
ON public.likes FOR DELETE 
USING (auth.uid() = user_id);

-- Add like_count to athletes table for denormalized counting
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create function to update like_count
CREATE OR REPLACE FUNCTION update_athlete_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.athletes 
    SET like_count = like_count + 1 
    WHERE id = NEW.athlete_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.athletes 
    SET like_count = GREATEST(like_count - 1, 0) 
    WHERE id = OLD.athlete_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain like_count
DROP TRIGGER IF EXISTS update_athlete_like_count_trigger ON public.likes;
CREATE TRIGGER update_athlete_like_count_trigger
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION update_athlete_like_count();
