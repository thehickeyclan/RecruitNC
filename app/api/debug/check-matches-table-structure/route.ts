import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Check if matches table exists and get its structure
    const { data, error } = await supabase.from("matches").select("*").limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: "Failed to query matches table",
        details: error,
        tableExists: false,
      })
    }

    // Get table schema information
    const { data: schemaData, error: schemaError } = await supabase
      .rpc("get_table_schema", { table_name: "matches" })
      .single()

    return NextResponse.json({
      success: true,
      tableExists: true,
      sampleData: data,
      schema: schemaData || "Schema query not available",
      schemaError: schemaError,
      message: "Matches table structure checked successfully",
    })
  } catch (error) {
    console.error("Error checking matches table:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
