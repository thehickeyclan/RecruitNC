-- Add draft/publish status to athletes table
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ranking_status TEXT DEFAULT 'published';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ranking_version INTEGER DEFAULT 1;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id);

-- Create ranking versions table for versioning and rollback
CREATE TABLE IF NOT EXISTS prospect_ranking_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES athletes(id),
  version_number INTEGER NOT NULL,
  prospect_ranking INTEGER,
  ranking_status TEXT NOT NULL DEFAULT 'draft',
  graduation_year INTEGER,
  gender TEXT,
  weight_class TEXT,
  ranking_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  published_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  is_current_draft BOOLEAN DEFAULT false,
  is_current_published BOOLEAN DEFAULT false
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_prospect_ranking_versions_athlete_id ON prospect_ranking_versions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_prospect_ranking_versions_status ON prospect_ranking_versions(ranking_status);
CREATE INDEX IF NOT EXISTS idx_prospect_ranking_versions_current_draft ON prospect_ranking_versions(is_current_draft) WHERE is_current_draft = true;
CREATE INDEX IF NOT EXISTS idx_prospect_ranking_versions_current_published ON prospect_ranking_versions(is_current_published) WHERE is_current_published = true;

-- Create ranking publication requests table
CREATE TABLE IF NOT EXISTS ranking_publication_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  graduation_year INTEGER NOT NULL,
  gender TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  request_notes TEXT,
  review_notes TEXT,
  athlete_changes JSONB, -- Store the ranking changes being requested
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for publication requests
CREATE INDEX IF NOT EXISTS idx_ranking_publication_requests_status ON ranking_publication_requests(status);
CREATE INDEX IF NOT EXISTS idx_ranking_publication_requests_year_gender ON ranking_publication_requests(graduation_year, gender);
CREATE INDEX IF NOT EXISTS idx_ranking_publication_requests_requested_by ON ranking_publication_requests(requested_by);

-- Enable RLS on new tables
ALTER TABLE prospect_ranking_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_publication_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for prospect_ranking_versions
CREATE POLICY "Admins can view all ranking versions" ON prospect_ranking_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR role = 'admin')
    )
  );

CREATE POLICY "Admins can insert ranking versions" ON prospect_ranking_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR role = 'admin')
    )
  );

-- Create policies for ranking_publication_requests
CREATE POLICY "Admins can view all publication requests" ON ranking_publication_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR role = 'admin')
    )
  );

CREATE POLICY "Admins can create publication requests" ON ranking_publication_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR role = 'admin')
    )
  );

CREATE POLICY "Admins can update publication requests" ON ranking_publication_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR role = 'admin')
    )
  );

-- Create function to create a new ranking version
CREATE OR REPLACE FUNCTION create_ranking_version(
  p_athlete_id UUID,
  p_prospect_ranking INTEGER,
  p_graduation_year INTEGER,
  p_gender TEXT,
  p_weight_class TEXT,
  p_ranking_notes TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'draft'
)
RETURNS UUID AS $$
DECLARE
  v_version_number INTEGER;
  v_version_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO v_version_number
  FROM prospect_ranking_versions 
  WHERE athlete_id = p_athlete_id;

  -- Clear current draft flag for this athlete
  UPDATE prospect_ranking_versions 
  SET is_current_draft = false 
  WHERE athlete_id = p_athlete_id AND is_current_draft = true;

  -- Insert new version
  INSERT INTO prospect_ranking_versions (
    athlete_id,
    version_number,
    prospect_ranking,
    ranking_status,
    graduation_year,
    gender,
    weight_class,
    ranking_notes,
    created_by,
    is_current_draft
  ) VALUES (
    p_athlete_id,
    v_version_number,
    p_prospect_ranking,
    p_status,
    p_graduation_year,
    p_gender,
    p_weight_class,
    p_ranking_notes,
    auth.uid(),
    CASE WHEN p_status = 'draft' THEN true ELSE false END
  ) RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to publish rankings
CREATE OR REPLACE FUNCTION publish_rankings(
  p_graduation_year INTEGER,
  p_gender TEXT,
  p_publication_request_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_published_count INTEGER := 0;
BEGIN
  -- Clear current published flags for this year/gender
  UPDATE prospect_ranking_versions 
  SET is_current_published = false 
  WHERE graduation_year = p_graduation_year 
    AND gender = p_gender 
    AND is_current_published = true;

  -- Publish current draft versions
  UPDATE prospect_ranking_versions 
  SET 
    ranking_status = 'published',
    is_current_published = true,
    is_current_draft = false,
    published_by = auth.uid(),
    published_at = NOW()
  WHERE graduation_year = p_graduation_year 
    AND gender = p_gender 
    AND is_current_draft = true;

  GET DIAGNOSTICS v_published_count = ROW_COUNT;

  -- Update athletes table with published rankings
  UPDATE athletes 
  SET 
    prospect_ranking = prv.prospect_ranking,
    ranking_status = 'published',
    ranking_version = prv.version_number,
    last_published_at = NOW(),
    published_by = auth.uid()
  FROM prospect_ranking_versions prv
  WHERE athletes.id = prv.athlete_id
    AND prv.graduation_year = p_graduation_year
    AND prv.gender = p_gender
    AND prv.is_current_published = true;

  -- Update publication request if provided
  IF p_publication_request_id IS NOT NULL THEN
    UPDATE ranking_publication_requests 
    SET 
      status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      published_at = NOW()
    WHERE id = p_publication_request_id;
  END IF;

  RETURN v_published_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for current published rankings
CREATE OR REPLACE VIEW current_published_rankings AS
SELECT 
  prv.*,
  a.name as athlete_name,
  a.firstName,
  a.lastName,
  a.highschool,
  a.photourl,
  up.full_name as published_by_name
FROM prospect_ranking_versions prv
LEFT JOIN athletes a ON prv.athlete_id = a.id
LEFT JOIN user_profiles up ON prv.published_by = up.user_id
WHERE prv.is_current_published = true
ORDER BY prv.graduation_year, prv.gender, prv.prospect_ranking;

-- Create view for current draft rankings
CREATE OR REPLACE VIEW current_draft_rankings AS
SELECT 
  prv.*,
  a.name as athlete_name,
  a.firstName,
  a.lastName,
  a.highschool,
  a.photourl,
  up.full_name as created_by_name
FROM prospect_ranking_versions prv
LEFT JOIN athletes a ON prv.athlete_id = a.id
LEFT JOIN user_profiles up ON prv.created_by = up.user_id
WHERE prv.is_current_draft = true
ORDER BY prv.graduation_year, prv.gender, prv.prospect_ranking;
