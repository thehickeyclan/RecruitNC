import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    console.log("Setting up matches table...")

    // First check if table exists
    const { data: existingTable, error: checkError } = await supabase.from("matches").select("id").limit(1)

    if (!checkError) {
      console.log("Table already exists")
      return Response.json({
        success: true,
        message: "✅ Matches table already exists and is ready to use!",
      })
    }

    console.log("Table doesn't exist, need to create it")

    // Since we can't create tables directly via the client, provide SQL
    const createTableSQL = `-- Create matches table for wrestling match history
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wrestler_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  season TEXT NOT NULL,
  grade TEXT NOT NULL,
  high_school TEXT NOT NULL,
  
  -- Season summary
  total_matches INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  losses INTEGER NOT NULL,
  pins INTEGER NOT NULL,
  tech_falls INTEGER NOT NULL,
  decisions INTEGER NOT NULL,
  major_decisions INTEGER NOT NULL,
  forfeits_won INTEGER NOT NULL,
  pin_percentage DECIMAL(5,2) NOT NULL,
  tf_percentage DECIMAL(5,2) NOT NULL,
  finishing_percentage DECIMAL(5,2) NOT NULL,
  
  -- Individual matches stored as JSONB
  matches JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_matches_wrestler_id ON matches(wrestler_id);
CREATE INDEX IF NOT EXISTS idx_matches_name_season ON matches(first_name, last_name, season);
CREATE INDEX IF NOT EXISTS idx_matches_high_school ON matches(high_school);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);
CREATE INDEX IF NOT EXISTS idx_matches_grade ON matches(grade);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_matches_updated_at_trigger ON matches;
CREATE TRIGGER update_matches_updated_at_trigger
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_matches_updated_at();`

    return Response.json({
      success: false,
      error: "Matches table does not exist. Please run the SQL manually in Supabase.",
      sql: createTableSQL,
      instructions: [
        "1. Go to your Supabase dashboard",
        "2. Navigate to SQL Editor",
        "3. Paste the SQL code above",
        "4. Click 'Run' to create the table",
        "5. Come back and try uploading again",
      ],
    })
  } catch (error) {
    console.error("Setup error:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to check table status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
