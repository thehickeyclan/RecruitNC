import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    console.log("🔍 Direct test: Looking for UNC Chapel Hill logo...")

    // Direct database query
    const { data, error } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", "college")
      .ilike("entity_name", "%UNC%")
      .limit(5)

    console.log("📊 Database results:", data)
    console.log("❌ Database error:", error)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        query: "Looking for UNC in college logos",
      })
    }

    return NextResponse.json({
      success: true,
      results: data,
      count: data?.length || 0,
    })
  } catch (error) {
    console.error("Exception:", error)
    return NextResponse.json({
      success: false,
      error: "Exception occurred",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
