import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // First, let's check if the column already exists
    const { data: existingColumns, error: checkError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "matches")
      .eq("column_name", "athlete_id")

    if (checkError) {
      console.error("Error checking existing columns:", checkError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to check existing columns",
          details: checkError.message,
        },
        { status: 500 },
      )
    }

    if (existingColumns && existingColumns.length > 0) {
      return NextResponse.json({
        success: true,
        message: "athlete_id column already exists in matches table",
        columnInfo: existingColumns,
      })
    }

    // If we can't use RPC, we'll need to use a different approach
    // Let's try to create a test record to see the current schema
    const { data: sampleMatch, error: sampleError } = await supabase.from("matches").select("*").limit(1).single()

    if (sampleError && sampleError.code !== "PGRST116") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot access matches table",
          details: sampleError.message,
        },
        { status: 500 },
      )
    }

    // Return current schema info and instructions
    return NextResponse.json({
      success: false,
      error: "Cannot add column via API - manual SQL required",
      currentSchema: sampleMatch ? Object.keys(sampleMatch) : "No data to analyze",
      instructions: "Please run this SQL manually in your Supabase SQL editor:",
      sql: `
        -- Add athlete_id column to matches table
        ALTER TABLE matches ADD COLUMN IF NOT EXISTS athlete_id UUID;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_matches_athlete_id ON matches(athlete_id);
      `,
    })
  } catch (error) {
    console.error("Error in add-athlete-id-simple:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
