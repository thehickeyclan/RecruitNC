-- Create commitment_submissions table
CREATE TABLE IF NOT EXISTS commitment_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  gender TEXT NOT NULL,
  weight_class TEXT,
  high_school TEXT NOT NULL,
  club TEXT,
  college TEXT NOT NULL,
  achievements TEXT,
  notes TEXT,
  athlete_image_url TEXT,
  entities JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_commitment_submissions_status ON commitment_submissions(status);

-- Create index on submitted_at for sorting
CREATE INDEX IF NOT EXISTS idx_commitment_submissions_submitted_at ON commitment_submissions(submitted_at);
