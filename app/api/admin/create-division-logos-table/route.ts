import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Create the stored procedure if it doesn't exist
    await supabase.rpc("create_stored_procedure_for_division_logos")

    // Create the table using the stored procedure
    await supabase.rpc("create_division_logos_table")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating table:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
