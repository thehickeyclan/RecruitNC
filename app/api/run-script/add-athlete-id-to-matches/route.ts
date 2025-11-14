import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Try to add the athlete_id column using direct SQL
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Add athlete_id column to matches table
        ALTER TABLE matches 
        ADD COLUMN IF NOT EXISTS athlete_id UUID;

        -- Create index for fast lookups
        CREATE INDEX IF NOT EXISTS idx_matches_athlete_id ON matches(athlete_id);

        -- Add foreign key constraint
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_matches_athlete_id'
          ) THEN
            ALTER TABLE matches 
            ADD CONSTRAINT fk_matches_athlete_id 
            FOREIGN KEY (athlete_id) REFERENCES athletes(id) 
            ON DELETE CASCADE;
          END IF;
        END $$;

        -- Return verification
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'matches' 
        AND column_name = 'athlete_id';
      `,
    })

    if (error) {
      console.error("Error adding athlete_id column:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to add athlete_id column",
          details: error.message,
          manualSql: `
-- Run this SQL manually in your Supabase SQL Editor:

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS athlete_id UUID;

CREATE INDEX IF NOT EXISTS idx_matches_athlete_id ON matches(athlete_id);

ALTER TABLE matches 
ADD CONSTRAINT fk_matches_athlete_id 
FOREIGN KEY (athlete_id) REFERENCES athletes(id) 
ON DELETE CASCADE;
          `,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "athlete_id column added successfully",
      data,
    })
  } catch (error) {
    console.error("Error in add-athlete-id-to-matches:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        manualSql: `
-- Run this SQL manually in your Supabase SQL Editor:

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS athlete_id UUID;

CREATE INDEX IF NOT EXISTS idx_matches_athlete_id ON matches(athlete_id);

ALTER TABLE matches 
ADD CONSTRAINT fk_matches_athlete_id 
FOREIGN KEY (athlete_id) REFERENCES athletes(id) 
ON DELETE CASCADE;
        `,
      },
      { status: 500 },
    )
  }
}
