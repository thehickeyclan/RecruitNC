-- Create public_rankings table for published prospect rankings
CREATE TABLE IF NOT EXISTS public_rankings (
  id SERIAL PRIMARY KEY,
  prospect_id TEXT NOT NULL,
  name TEXT NOT NULL,
  high_school TEXT,
  weight_class TEXT,
  state_result TEXT,
  nhsca_record TEXT,
  super32_record TEXT,
  ranked_win TEXT,
  academic_gpa DECIMAL(3,2),
  graduation_year INTEGER NOT NULL,
  gender TEXT NOT NULL,
  prospect_ranking INTEGER,
  profile_image_url TEXT,
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_public_rankings_year_gender ON public_rankings(graduation_year, gender);
CREATE INDEX IF NOT EXISTS idx_public_rankings_published ON public_rankings(is_published);
CREATE INDEX IF NOT EXISTS idx_public_rankings_ranking ON public_rankings(prospect_ranking);

-- Add RLS policies
ALTER TABLE public_rankings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published rankings
CREATE POLICY "Allow public read access to published rankings" ON public_rankings
  FOR SELECT USING (is_published = true);

-- Allow admin full access (you may need to adjust this based on your auth setup)
CREATE POLICY "Allow admin full access to rankings" ON public_rankings
  FOR ALL USING (true);
