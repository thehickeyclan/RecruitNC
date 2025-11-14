import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    // Create the table using raw SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS matches (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        wrestler_id TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        season TEXT,
        grade TEXT,
        high_school TEXT,
        total_matches INTEGER,
        wins INTEGER,
        losses INTEGER,
        pins INTEGER,
        tech_falls INTEGER,
        decisions INTEGER,
        major_decisions INTEGER,
        forfeits_won INTEGER,
        pin_percentage DECIMAL(5,2),
        tf_percentage DECIMAL(5,2),
        finishing_percentage DECIMAL(5,2),
        matches JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `

    const { data, error } = await supabase.rpc("exec_sql", { sql: createTableSQL })

    if (error) {
      console.error("SQL execution error:", error)
      return Response.json({
        success: false,
        error: "Failed to create table via SQL",
        details: error.message,
        sql: createTableSQL,
        message: "Copy this SQL and run it manually in Supabase SQL Editor",
      })
    }

    // Test if table was created
    const { data: testData, error: testError } = await supabase.from("matches").select("id").limit(1)

    if (testError) {
      return Response.json({
        success: false,
        error: "Table creation may have failed",
        details: testError.message,
        sql: createTableSQL,
        message: "Copy this SQL and run it manually in Supabase SQL Editor",
      })
    }

    return Response.json({
      success: true,
      message: "Matches table created successfully!",
    })
  } catch (error) {
    console.error("Error:", error)
    return Response.json({
      success: false,
      error: "Failed to create table",
      details: error instanceof Error ? error.message : "Unknown error",
      sql: `
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wrestler_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  season TEXT,
  grade TEXT,
  high_school TEXT,
  total_matches INTEGER,
  wins INTEGER,
  losses INTEGER,
  pins INTEGER,
  tech_falls INTEGER,
  decisions INTEGER,
  major_decisions INTEGER,
  forfeits_won INTEGER,
  pin_percentage DECIMAL(5,2),
  tf_percentage DECIMAL(5,2),
  finishing_percentage DECIMAL(5,2),
  matches JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
      `,
      message: "Copy this SQL and run it manually in Supabase SQL Editor",
    })
  }
}
