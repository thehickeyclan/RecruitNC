import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, division } = body

    console.log("Attempting database save:", { name, division })

    // First, test if we can connect to Supabase
    const { data: connectionTest, error: connectionError } = await supabase.from("athletes").select("count").limit(1)

    if (connectionError) {
      console.error("Connection test failed:", connectionError)
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          details: connectionError.message,
          step: "connection_test",
        },
        { status: 500 },
      )
    }

    console.log("Connection test passed")

    // Try to create a test entry in a simple table
    // Let's try the college_division_mappings table since it's simpler
    const testEntry = {
      college_name: name,
      division: division,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: insertData, error: insertError } = await supabase
      .from("college_division_mappings")
      .insert([testEntry])
      .select()

    if (insertError) {
      console.error("Insert failed:", insertError)

      // Try to get more details about the table structure
      const { data: tableInfo, error: tableError } = await supabase
        .from("college_division_mappings")
        .select("*")
        .limit(1)

      return NextResponse.json(
        {
          success: false,
          error: "Database insert failed",
          details: insertError.message,
          step: "insert_test",
          tableAccessible: !tableError,
          tableError: tableError?.message,
        },
        { status: 500 },
      )
    }

    console.log("Insert successful:", insertData)

    return NextResponse.json({
      success: true,
      message: "Database save successful",
      data: insertData,
      step: "complete",
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected server error",
        details: error instanceof Error ? error.message : "Unknown error",
        step: "catch_block",
      },
      { status: 500 },
    )
  }
}
