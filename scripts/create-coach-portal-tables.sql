-- Create family members table
CREATE TABLE IF NOT EXISTS coach_athlete_family (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS coach_athlete_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  document_type TEXT,
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for family members
ALTER TABLE coach_athlete_family ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own family records"
ON coach_athlete_family
FOR ALL
TO authenticated
USING (coach_user_id = auth.uid());

-- Add RLS policies for documents
ALTER TABLE coach_athlete_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own documents"
ON coach_athlete_documents
FOR ALL
TO authenticated
USING (coach_user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_family_coach_athlete ON coach_athlete_family(coach_user_id, athlete_id);
CREATE INDEX IF NOT EXISTS idx_documents_coach_athlete ON coach_athlete_documents(coach_user_id, athlete_id);
