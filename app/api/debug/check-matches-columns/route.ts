import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get table structure
    const { data, error } = await supabase.from("matches").select("*").limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch matches table structure",
        details: error.message,
      })
    }

    // Get column names from the first row
    const columns = data && data.length > 0 ? Object.keys(data[0]) : []

    // Also get a sample of actual data to see what we're working with
    const { data: sampleData, error: sampleError } = await supabase.from("matches").select("*").limit(5)

    return NextResponse.json({
      success: true,
      columns,
      sampleData: sampleData || [],
      totalColumns: columns.length,
    })
  } catch (error) {
    console.error("Error checking matches columns:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
