-- Create audit logging table for prospect ranking changes
CREATE TABLE IF NOT EXISTS prospect_ranking_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES athletes(id),
  old_ranking INTEGER,
  new_ranking INTEGER,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  graduation_year INTEGER,
  gender TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_prospect_ranking_audit_athlete_id ON prospect_ranking_audit(athlete_id);
CREATE INDEX IF NOT EXISTS idx_prospect_ranking_audit_created_at ON prospect_ranking_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_ranking_audit_changed_by ON prospect_ranking_audit(changed_by);

-- Enable RLS
ALTER TABLE prospect_ranking_audit ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all audit logs
CREATE POLICY "Admins can view all audit logs" ON prospect_ranking_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR role = 'admin')
    )
  );

-- Create policy for system to insert audit logs
CREATE POLICY "System can insert audit logs" ON prospect_ranking_audit
  FOR INSERT WITH CHECK (true);

-- Create function to automatically log ranking changes
CREATE OR REPLACE FUNCTION log_prospect_ranking_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if prospect_ranking actually changed
  IF OLD.prospect_ranking IS DISTINCT FROM NEW.prospect_ranking THEN
    INSERT INTO prospect_ranking_audit (
      athlete_id,
      old_ranking,
      new_ranking,
      changed_by,
      graduation_year,
      gender
    ) VALUES (
      NEW.id,
      OLD.prospect_ranking,
      NEW.prospect_ranking,
      auth.uid(),
      NEW.graduationyear,
      NEW.gender
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log ranking changes
DROP TRIGGER IF EXISTS prospect_ranking_audit_trigger ON athletes;
CREATE TRIGGER prospect_ranking_audit_trigger
  AFTER UPDATE ON athletes
  FOR EACH ROW
  EXECUTE FUNCTION log_prospect_ranking_change();

-- Create view for easy audit log viewing
CREATE OR REPLACE VIEW prospect_ranking_audit_view AS
SELECT 
  pra.id,
  pra.athlete_id,
  a.name as athlete_name,
  a.firstName,
  a.lastName,
  pra.old_ranking,
  pra.new_ranking,
  pra.graduation_year,
  pra.gender,
  up.full_name as changed_by_name,
  up.email as changed_by_email,
  pra.change_reason,
  pra.created_at
FROM prospect_ranking_audit pra
LEFT JOIN athletes a ON pra.athlete_id = a.id
LEFT JOIN user_profiles up ON pra.changed_by = up.user_id
ORDER BY pra.created_at DESC;
