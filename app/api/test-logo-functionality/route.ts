import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Test database connection
    const { data: testData, error: testError } = await supabase.from("logo_mappings").select("count").limit(1)

    if (testError) {
      return NextResponse.json({
        success: false,
        error: "Database connection failed",
        details: testError.message,
      })
    }

    // Test specific logo lookups
    const testCases = [
      { type: "college", name: "Campbell University" },
      { type: "highschool", name: "Cardinal Gibbons" },
      { type: "club", name: "NC United" },
    ]

    const results = []

    for (const testCase of testCases) {
      const { data, error } = await supabase
        .from("logo_mappings")
        .select("logo_url, entity_name, entity_type")
        .eq("entity_type", testCase.type)
        .ilike("entity_name", `%${testCase.name}%`)
        .limit(1)

      results.push({
        testCase,
        found: data && data.length > 0,
        data: data?.[0] || null,
        error: error?.message || null,
      })
    }

    // Get total count of logo mappings
    const { count, error: countError } = await supabase
      .from("logo_mappings")
      .select("*", { count: "exact", head: true })

    return NextResponse.json({
      success: true,
      totalMappings: count,
      testResults: results,
      countError: countError?.message || null,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Server error",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
