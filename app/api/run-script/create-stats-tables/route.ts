import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Create or update the colleges table to include athlete count
        CREATE TABLE IF NOT EXISTS colleges (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          location VARCHAR(255),
          division VARCHAR(50),
          conference VARCHAR(255),
          logo_url VARCHAR(255),
          athlete_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create or update the high_schools table to include athlete count
        CREATE TABLE IF NOT EXISTS high_schools (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          location VARCHAR(255),
          conference VARCHAR(255),
          logo_url VARCHAR(255),
          athlete_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create or update the wrestling_clubs table to include athlete count
        CREATE TABLE IF NOT EXISTS wrestling_clubs (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          location VARCHAR(255),
          logo_url VARCHAR(255),
          athlete_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create a table for AI-generated insights
        CREATE TABLE IF NOT EXISTS ai_insights (
          id SERIAL PRIMARY KEY,
          category VARCHAR(50) NOT NULL, -- 'trend', 'recognition', or 'shoutout'
          text TEXT NOT NULL,
          filters JSONB, -- Store filters as JSON (e.g., {"gender": "female", "division": "D1"})
          icon VARCHAR(50),
          generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Add indexes for better query performance
        CREATE INDEX IF NOT EXISTS idx_athletes_graduationyear ON athletes(graduationyear);
        CREATE INDEX IF NOT EXISTS idx_athletes_division ON athletes(division);
        CREATE INDEX IF NOT EXISTS idx_athletes_gender ON athletes(gender);
        CREATE INDEX IF NOT EXISTS idx_athletes_team_affiliation ON athletes(team_affiliation);
        CREATE INDEX IF NOT EXISTS idx_athletes_commitmentdate ON athletes(commitmentdate);
      `,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Stats tables created successfully",
    })
  } catch (error) {
    console.error("Error creating stats tables:", error)
    return NextResponse.json({ error: "Failed to create stats tables" }, { status: 500 })
  }
}
