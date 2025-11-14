import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    const { college_name, division } = await request.json()

    console.log("🔍 Debug: Starting insert operation")
    console.log("📝 College name:", college_name)
    console.log("📝 Division:", division)

    // Step 1: Check if table exists and its structure
    console.log("🔍 Step 1: Checking table structure...")
    const { data: tableInfo, error: tableError } = await supabase.from("college_division_mappings").select("*").limit(1)

    if (tableError) {
      console.error("❌ Table check error:", tableError)
      return NextResponse.json(
        {
          error: "Table check failed",
          details: tableError.message,
          step: "table_check",
        },
        { status: 500 },
      )
    }

    console.log("✅ Table exists, sample data:", tableInfo)

    // Step 2: Check for duplicates
    console.log("🔍 Step 2: Checking for duplicates...")
    const { data: existingData, error: duplicateError } = await supabase
      .from("college_division_mappings")
      .select("college_name")
      .ilike("college_name", college_name)

    if (duplicateError) {
      console.error("❌ Duplicate check error:", duplicateError)
      return NextResponse.json(
        {
          error: "Duplicate check failed",
          details: duplicateError.message,
          step: "duplicate_check",
        },
        { status: 500 },
      )
    }

    if (existingData && existingData.length > 0) {
      console.log("⚠️ Duplicate found:", existingData)
      return NextResponse.json(
        {
          error: "College already exists",
          existing: existingData,
          step: "duplicate_found",
        },
        { status: 400 },
      )
    }

    console.log("✅ No duplicates found")

    // Step 3: Try the insert with minimal data first
    console.log("🔍 Step 3: Attempting insert...")
    const insertData = {
      college_name: college_name.trim(),
      division: division,
    }

    console.log("📝 Insert data:", insertData)

    const { data: insertResult, error: insertError } = await supabase
      .from("college_division_mappings")
      .insert(insertData)
      .select()

    if (insertError) {
      console.error("❌ Insert error:", insertError)
      return NextResponse.json(
        {
          error: "Insert failed",
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
          step: "insert_failed",
        },
        { status: 500 },
      )
    }

    console.log("✅ Insert successful:", insertResult)

    return NextResponse.json({
      success: true,
      data: insertResult,
      message: "College added successfully",
    })
  } catch (error) {
    console.error("💥 Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : "Unknown error",
        step: "unexpected_error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "College mappings debug API",
    usage: "Send POST request with college_name and division",
  })
}
