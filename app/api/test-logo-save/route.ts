import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { entity_name, entity_type, logo_url } = await request.json()

    console.log("🔍 Testing logo save with data:", { entity_name, entity_type, logo_url })

    const supabase = createServerSupabaseClient()

    // Try to insert the logo mapping
    const { data, error } = await supabase
      .from("logo_mappings")
      .insert([
        {
          entity_name,
          entity_type,
          logo_url,
        },
      ])
      .select()

    if (error) {
      console.error("❌ Insert failed:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to insert logo mapping",
          details: error,
          step: "insert",
        },
        { status: 500 },
      )
    }

    console.log("✅ Logo mapping saved successfully:", data)

    return NextResponse.json({
      success: true,
      message: "Logo mapping saved successfully",
      data,
      step: "complete",
    })
  } catch (error) {
    console.error("❌ Exception in logo save test:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
        step: "exception",
      },
      { status: 500 },
    )
  }
}
