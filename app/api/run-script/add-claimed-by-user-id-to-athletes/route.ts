import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Add the column
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        ALTER TABLE athletes 
        ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES auth.users(id);
        
        CREATE INDEX IF NOT EXISTS idx_athletes_claimed_by_user_id 
        ON athletes(claimed_by_user_id);
      `,
    })

    if (error) {
      console.error("Error adding column:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Exception:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
