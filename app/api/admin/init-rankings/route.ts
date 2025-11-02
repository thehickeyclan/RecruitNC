import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // First create the check_table_exists function
    await createCheckTableExistsFunction(supabase)

    // Then create the prospect_rankings table
    await createProspectRankingsTable(supabase)

    return NextResponse.json({ success: true, message: "Rankings table initialized successfully" })
  } catch (error) {
    console.error("Error initializing rankings table:", error)
    return NextResponse.json({ success: false, error: "Failed to initialize rankings table" }, { status: 500 })
  }
}

async function createCheckTableExistsFunction(supabase: any) {
  const sql = `
    -- Function to check if a table exists
    CREATE OR REPLACE FUNCTION check_table_exists(table_name TEXT)
    RETURNS BOOLEAN AS $$
    DECLARE
      table_exists BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = $1
      ) INTO table_exists;
      
      RETURN table_exists;
    END;
    $$ LANGUAGE plpgsql;
  `

  const { error } = await supabase.rpc("exec_sql", { sql })

  if (error) {
    console.error("Error creating check_table_exists function:", error)
    // Continue anyway, as the function might already exist
  }
}

async function createProspectRankingsTable(supabase: any) {
  // Check if the table already exists
  const { data: tableExists, error: checkError } = await supabase.rpc("check_table_exists", {
    table_name: "prospect_rankings",
  })

  if (checkError) {
    console.error("Error checking if table exists:", checkError)
    // Continue anyway, as we'll try to create the table
  }

  if (tableExists) {
    console.log("prospect_rankings table already exists")
    return
  }

  // SQL to create the table
  const sql = `
    CREATE TABLE IF NOT EXISTS prospect_rankings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      athlete_id UUID NOT NULL,
      graduation_year INT NOT NULL,
      overall_rank INT NOT NULL,
      weight_class VARCHAR(255) NOT NULL,
      region VARCHAR(255),
      folkstyle_rank INT,
      freestyle_rank INT,
      greco_rank INT,
      ranking_notes TEXT,
      verified BOOLEAN DEFAULT FALSE,
      last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      CONSTRAINT fk_athlete
        FOREIGN KEY(athlete_id)
        REFERENCES athletes(id)
        ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_prospect_rankings_graduation_year ON prospect_rankings(graduation_year);
    CREATE INDEX IF NOT EXISTS idx_prospect_rankings_overall_rank ON prospect_rankings(overall_rank);
    CREATE INDEX IF NOT EXISTS idx_prospect_rankings_athlete_id ON prospect_rankings(athlete_id);
    
    ALTER TABLE athletes ADD COLUMN IF NOT EXISTS academic_info JSONB;
    ALTER TABLE athletes ADD COLUMN IF NOT EXISTS physical_metrics JSONB;
    ALTER TABLE athletes ADD COLUMN IF NOT EXISTS technical_assessment TEXT;
    ALTER TABLE athletes ADD COLUMN IF NOT EXISTS tournament_history JSONB[];
    ALTER TABLE athletes ADD COLUMN IF NOT EXISTS verified_achievements BOOLEAN[] DEFAULT '{}';
    ALTER TABLE athletes ADD COLUMN IF NOT EXISTS coach_endorsements JSONB[] DEFAULT '{}';
  `

  const { error } = await supabase.rpc("exec_sql", { sql })

  if (error) {
    throw new Error(`Error creating prospect_rankings table: ${error.message}`)
  }
}
