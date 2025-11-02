import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Create the table directly
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS commitment_submissions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          graduation_year INTEGER NOT NULL,
          gender TEXT NOT NULL,
          weight_class TEXT,
          high_school TEXT NOT NULL,
          club TEXT,
          college TEXT NOT NULL,
          achievements TEXT,
          notes TEXT,
          athlete_image_url TEXT,
          entities JSONB,
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_commitment_submissions_status ON commitment_submissions(status);
        CREATE INDEX IF NOT EXISTS idx_commitment_submissions_submitted_at ON commitment_submissions(submitted_at);
      `,
    })

    if (error) {
      console.error("Error creating table:", error)
      return NextResponse.json({ error: "Failed to create table", details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Table created successfully" })
  } catch (error) {
    console.error("Error in create-submissions-table-direct:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
