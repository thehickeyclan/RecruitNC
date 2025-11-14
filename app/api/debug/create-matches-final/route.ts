import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    console.log("=== CREATING MATCHES TABLE IN VALIDATED DATABASE ===")

    // Test that we can access the connection_test table first
    const { data: testData, error: testError } = await supabase.from("connection_test").select("*").limit(1)

    if (testError) {
      return Response.json({
        success: false,
        error: "Database connection not validated",
        details: testError.message,
        suggestion: "Please run the validation SQL first",
      })
    }

    // Now create the matches table
    const { data, error } = await supabase.from("matches").select("*").limit(1)

    if (!error) {
      return Response.json({
        success: true,
        message: "✅ Matches table already exists!",
        table_exists: true,
        record_count: data?.length || 0,
      })
    }

    // Table doesn't exist, provide SQL to create it
    const createMatchesSQL = `
-- Create matches table
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wrestler_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  season TEXT NOT NULL,
  grade TEXT,
  high_school TEXT,
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  pins INTEGER DEFAULT 0,
  tech_falls INTEGER DEFAULT 0,
  decisions INTEGER DEFAULT 0,
  major_decisions INTEGER DEFAULT 0,
  forfeits_won INTEGER DEFAULT 0,
  pin_percentage DECIMAL(5,2) DEFAULT 0,
  tf_percentage DECIMAL(5,2) DEFAULT 0,
  finishing_percentage DECIMAL(5,2) DEFAULT 0,
  matches JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_matches_wrestler_id ON matches(wrestler_id);
CREATE INDEX idx_matches_name_season ON matches(first_name, last_name, season);
CREATE INDEX idx_matches_high_school ON matches(high_school);
CREATE INDEX idx_matches_season ON matches(season);

-- Set up Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policies for access
CREATE POLICY "Allow service role full access" ON matches
FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON matches TO authenticated;
GRANT ALL ON matches TO anon;
GRANT ALL ON matches TO service_role;

-- Insert sample data for Liam Hickey
INSERT INTO matches (
  wrestler_id,
  first_name,
  last_name,
  season,
  grade,
  high_school,
  total_matches,
  wins,
  losses,
  pins,
  tech_falls,
  decisions,
  major_decisions,
  forfeits_won,
  pin_percentage,
  tf_percentage,
  finishing_percentage,
  matches
) VALUES (
  'liam_hickey_2025',
  'Liam',
  'Hickey',
  '2024-25',
  '12',
  'Cardinal Gibbons',
  25,
  22,
  3,
  15,
  4,
  3,
  0,
  0,
  68.18,
  18.18,
  86.36,
  '[
    {
      "date": "2024-12-01",
      "opponent": "John Smith",
      "opponent_school": "Test High School",
      "result": "Win",
      "method": "Pin",
      "time": "2:15",
      "weight": 157,
      "venue": "Cardinal Gibbons Duals",
      "win_loss": "W",
      "opponent_percentage": "75.5%"
    },
    {
      "date": "2024-11-15",
      "opponent": "Mike Johnson",
      "opponent_school": "Another High School",
      "result": "Win",
      "method": "Tech Fall",
      "time": "4:30",
      "weight": 157,
      "venue": "Regional Tournament",
      "win_loss": "W",
      "opponent_percentage": "82.3%"
    }
  ]'::jsonb
);

-- Verify the table was created
SELECT 'Matches table created successfully!' as message;
SELECT * FROM matches WHERE wrestler_id = 'liam_hickey_2025';
`

    return Response.json({
      success: false,
      error: "Matches table doesn't exist yet",
      message: "Please run the SQL below in your Supabase dashboard",
      sql_to_run: createMatchesSQL,
      instructions: [
        "1. Copy the SQL above",
        "2. Go to your Supabase dashboard SQL Editor",
        "3. Paste and run the SQL",
        "4. Come back and test the table access",
      ],
    })
  } catch (error) {
    console.error("Create matches table error:", error)
    return Response.json({
      success: false,
      error: "Failed to check/create matches table",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function GET() {
  try {
    console.log("=== TESTING MATCHES TABLE ACCESS ===")

    // Test basic table access
    const { data, error } = await supabase.from("matches").select("*")

    if (error) {
      return Response.json({
        success: false,
        error: "Cannot access matches table",
        details: error.message,
        code: error.code,
        hint: "Make sure you've run the CREATE TABLE SQL in your dashboard",
      })
    }

    return Response.json({
      success: true,
      message: "✅ Matches table is accessible!",
      record_count: data?.length || 0,
      sample_records: data,
      table_exists: true,
      table_accessible: true,
    })
  } catch (error) {
    console.error("Test matches table error:", error)
    return Response.json({
      success: false,
      error: "Failed to test matches table",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
