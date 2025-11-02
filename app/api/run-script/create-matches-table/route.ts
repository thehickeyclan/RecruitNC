import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { join } from "path"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    console.log("Creating matches table...")

    // Read the SQL file
    const sqlPath = join(process.cwd(), "scripts", "create-matches-table.sql")
    const sql = readFileSync(sqlPath, "utf8")

    console.log("SQL to execute:", sql.substring(0, 200) + "...")

    // Execute the SQL
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql })

    if (error) {
      console.error("Error executing SQL:", error)
      return Response.json(
        {
          success: false,
          error: "Failed to create matches table",
          details: error.message,
          sql: sql,
        },
        { status: 500 },
      )
    }

    console.log("Matches table created successfully")

    // Test the table by selecting from it
    const { data: testData, error: testError } = await supabase.from("matches").select("id").limit(1)

    if (testError) {
      console.error("Table test failed:", testError)
      return Response.json({
        success: false,
        error: "Table created but test failed",
        details: testError.message,
        sql: sql,
      })
    }

    return Response.json({
      success: true,
      message: "✅ Matches table created successfully and is ready to use!",
      data: data,
    })
  } catch (error) {
    console.error("Script execution error:", error)

    // Provide the SQL for manual execution
    const fallbackSQL = `-- Create matches table for wrestling match history
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wrestler_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  season TEXT NOT NULL,
  grade TEXT NOT NULL,
  high_school TEXT NOT NULL,
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
  matches JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_wrestler_id ON matches(wrestler_id);
CREATE INDEX IF NOT EXISTS idx_matches_name_season ON matches(first_name, last_name, season);
CREATE INDEX IF NOT EXISTS idx_matches_high_school ON matches(high_school);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);`

    return Response.json(
      {
        success: false,
        error: "Failed to execute script automatically",
        details: error instanceof Error ? error.message : "Unknown error",
        sql: fallbackSQL,
        instructions: [
          "1. Go to your Supabase dashboard",
          "2. Navigate to SQL Editor",
          "3. Paste the SQL above and run it",
          "4. Try uploading match data again",
        ],
      },
      { status: 500 },
    )
  }
}
