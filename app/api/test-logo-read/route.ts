import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("🔍 Testing logo read...")

    const supabase = createServerSupabaseClient()

    // Get all logo mappings
    const { data, error } = await supabase.from("logo_mappings").select("*").order("entity_type").order("entity_name")

    if (error) {
      console.error("❌ Read failed:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to read logo mappings",
          details: error,
        },
        { status: 500 },
      )
    }

    console.log("✅ Logo mappings read successfully:", data?.length, "items")

    return NextResponse.json({
      success: true,
      message: `Found ${data?.length || 0} logo mappings`,
      data,
      count: data?.length || 0,
    })
  } catch (error) {
    console.error("❌ Exception in logo read test:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
