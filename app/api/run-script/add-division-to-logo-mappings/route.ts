import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    // Check if division column exists
    const { data: columns, error: columnError } = await supabase
      .rpc("exec_sql", {
        sql: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'logo_mappings' 
        AND column_name = 'division'
      `,
      })
      .catch(() => ({ data: null, error: null }))

    // If RPC doesn't work, try direct approach
    if (columnError || !columns) {
      // Try to add column directly
      const { error: alterError } = await supabase
        .rpc("exec_sql", {
          sql: `
          DO $$ 
          BEGIN 
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'logo_mappings' 
                  AND column_name = 'division'
              ) THEN
                  ALTER TABLE logo_mappings ADD COLUMN division VARCHAR(50);
              END IF;
          END $$;
        `,
        })
        .catch(() => ({ error: "RPC not available" }))

      if (alterError) {
        return NextResponse.json({
          success: false,
          error: "Please run this SQL manually in Supabase:",
          sql: `ALTER TABLE logo_mappings ADD COLUMN division VARCHAR(50);`,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Division column added successfully!",
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Please run this SQL manually in Supabase:",
      sql: `ALTER TABLE logo_mappings ADD COLUMN division VARCHAR(50);`,
    })
  }
}
