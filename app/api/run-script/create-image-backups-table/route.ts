import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Create a table to store backups of images
        CREATE TABLE IF NOT EXISTS image_backups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
          original_url TEXT NOT NULL,
          backup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          notes TEXT
        );

        -- Create an index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_image_backups_athlete_id ON image_backups(athlete_id);

        -- Add a comment to the table
        COMMENT ON TABLE image_backups IS 'Stores backups of original athlete images';
      `,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Image backups table created successfully",
    })
  } catch (error) {
    console.error("Error creating image backups table:", error)
    return NextResponse.json({ error: "Failed to create image backups table" }, { status: 500 })
  }
}
