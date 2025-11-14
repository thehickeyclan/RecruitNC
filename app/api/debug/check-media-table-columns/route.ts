import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Check if table exists and get columns
    const { data, error } = await supabase.from("media_items").select("*").limit(1)

    if (error && error.code === "42P01") {
      return NextResponse.json({
        success: false,
        needsSetup: true,
        message: "Media items table does not exist",
        columns: [],
      })
    }

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        columns: [],
      })
    }

    // Get column names from the first record
    const columns = data && data.length > 0 ? Object.keys(data[0]) : []

    return NextResponse.json({
      success: true,
      message: "Table exists and accessible",
      columns,
      sampleRecord: data?.[0] || null,
    })
  } catch (error) {
    console.error("Check columns error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      columns: [],
    })
  }
}
