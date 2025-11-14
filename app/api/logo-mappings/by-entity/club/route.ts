import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all logo mappings for clubs
    const { data: clubMappings, error } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", "club")
      .order("entity_name")

    if (error) {
      console.error("❌ Clubs API: Database error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch clubs from database",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Return the club mappings
    return NextResponse.json(clubMappings || [])
  } catch (error) {
    console.error("❌ Clubs API: Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
