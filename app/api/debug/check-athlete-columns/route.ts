import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Get a sample record to see available columns
    const { data: sampleData, error } = await supabase.from("athletes").select("*").limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        message: "Database query failed",
        columns: [],
        sampleData: null,
        error: error.message,
      })
    }

    if (!sampleData || sampleData.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No data found in athletes table",
        columns: [],
        sampleData: null,
      })
    }

    const columns = Object.keys(sampleData[0])

    return NextResponse.json({
      success: true,
      message: `Found ${columns.length} columns in athletes table`,
      columns,
      sampleData: sampleData[0],
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Server error",
      columns: [],
      sampleData: null,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
