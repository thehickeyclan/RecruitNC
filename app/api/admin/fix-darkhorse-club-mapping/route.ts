import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    console.log("🔧 Starting Darkhorse club mapping fix...")

    // Check if Darkhorse mapping already exists
    const { data: existingMapping, error: checkError } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", "club")
      .ilike("entity_name", "%darkhorse%")
      .maybeSingle()

    if (checkError) {
      console.error("Error checking existing Darkhorse mapping:", checkError)
      return NextResponse.json({ error: "Database error checking existing mapping" }, { status: 500 })
    }

    if (existingMapping) {
      console.log("✅ Darkhorse mapping already exists:", existingMapping)
      return NextResponse.json({
        success: true,
        message: "Darkhorse mapping already exists",
        mapping: existingMapping,
      })
    }

    // Create new Darkhorse mapping
    const { data: newMapping, error: insertError } = await supabase
      .from("logo_mappings")
      .insert([
        {
          entity_name: "Darkhorse",
          entity_type: "club",
          logo_url: "/wrestling-club-logo.png", // Use generic club logo as fallback
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("Error creating Darkhorse mapping:", insertError)
      return NextResponse.json({ error: "Failed to create Darkhorse mapping" }, { status: 500 })
    }

    console.log("✅ Created new Darkhorse mapping:", newMapping)

    return NextResponse.json({
      success: true,
      message: "Successfully created Darkhorse club mapping",
      mapping: newMapping,
    })
  } catch (error) {
    console.error("Unexpected error in fix-darkhorse-club-mapping:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
