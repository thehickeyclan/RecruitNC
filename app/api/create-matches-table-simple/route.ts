import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Just try to create a simple test record to see if table exists
    const { data: testData, error: testError } = await supabase.from("matches").select("id").limit(1)

    if (!testError) {
      return Response.json({
        success: true,
        message: "Matches table already exists",
        tableExists: true,
      })
    }

    // If table doesn't exist, create it using raw SQL
    const createTableSQL = `
      CREATE TABLE matches (
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

    // Use the SQL editor approach
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
      },
      body: JSON.stringify({
        sql: createTableSQL,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return Response.json({
      success: true,
      message: "Matches table created successfully",
      tableExists: true,
    })
  } catch (error) {
    console.error("Error:", error)
    return Response.json(
      {
        error: "Failed to create table",
        message: "Go to Supabase SQL Editor and run this SQL manually:",
        sql: `
CREATE TABLE matches (
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
      },
      { status: 500 },
    )
  }
}
