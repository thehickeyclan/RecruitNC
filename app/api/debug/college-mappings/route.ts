import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    console.log("🔍 Checking college mappings table...")

    // Try to get all mappings
    const { data: mappings, error } = await supabase.from("college_division_mappings").select("*").order("college_name")

    if (error) {
      console.error("❌ Error fetching mappings:", error)
      return NextResponse.json({
        error: "Failed to fetch mappings",
        details: error.message,
        tableExists: false,
      })
    }

    console.log("✅ Successfully fetched mappings:", mappings?.length || 0, "records")

    return NextResponse.json({
      success: true,
      mappings: mappings || [],
      count: mappings?.length || 0,
      tableExists: true,
    })
  } catch (error) {
    console.error("💥 Unexpected error:", error)
    return NextResponse.json({
      error: "Unexpected error",
      details: error instanceof Error ? error.message : "Unknown error",
      tableExists: false,
    })
  }
}
