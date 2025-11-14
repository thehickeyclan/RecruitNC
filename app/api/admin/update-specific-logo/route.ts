import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { entityType, entityName, logoUrl } = await request.json()

    if (!entityType || !entityName || !logoUrl) {
      return NextResponse.json({ success: false, error: "All fields are required" }, { status: 400 })
    }

    const supabase = createClient()

    // Check if mapping already exists
    const { data: existing, error: checkError } = await supabase
      .from("logo_mappings")
      .select("id")
      .eq("entity_type", entityType)
      .eq("entity_name", entityName)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      return NextResponse.json({ success: false, error: checkError.message }, { status: 500 })
    }

    if (existing) {
      // Update existing mapping
      const { error: updateError } = await supabase
        .from("logo_mappings")
        .update({ logo_url: logoUrl })
        .eq("id", existing.id)

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Updated logo for ${entityName}`,
      })
    } else {
      // Create new mapping
      const { error: insertError } = await supabase.from("logo_mappings").insert({
        entity_type: entityType,
        entity_name: entityName,
        logo_url: logoUrl,
        division: null,
      })

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Created logo mapping for ${entityName}`,
      })
    }
  } catch (error) {
    console.error("Error in update-specific-logo:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
