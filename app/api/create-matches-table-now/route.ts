import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    // Create the matches table with proper SQL
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
      console.error("Error creating matches table:", error)
      return Response.json(
        {
          error: "Failed to create matches table",
          details: error.message,
        },
        { status: 500 },
      )
    }

    return Response.json({
      success: true,
      message: "Matches table created successfully",
      data,
    })
  } catch (error) {
    console.error("Error in create matches table:", error)
    return Response.json(
      {
        error: "Failed to create matches table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
