import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // First, let's check how many athletes we have from Hickory Ridge
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, highschool, college")
      .or("highschool.ilike.%Hickory Ridge%,high_school.ilike.%Hickory Ridge%")
      .not("college", "is", null)

    if (athletesError) {
      console.error("Error fetching Hickory Ridge athletes:", athletesError)
    }

    console.log("Hickory Ridge athletes found:", athletes?.length || 0)
    console.log("Athletes:", athletes)

    // Update or insert Hickory Ridge logo mapping with actual logo
    const { data: existingLogo } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", "highschool")
      .ilike("entity_name", "%Hickory Ridge%")
      .single()

    let logoResult
    if (existingLogo) {
      // Update existing logo
      const { data, error } = await supabase
        .from("logo_mappings")
        .update({
          logo_url: "/hickory-ridge-logo.png", // Using actual Hickory Ridge logo
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLogo.id)
        .select()
        .single()

      logoResult = { data, error, action: "updated" }
    } else {
      // Insert new logo mapping for both variations
      const logoMappings = [
        {
          entity_type: "highschool",
          entity_name: "Hickory Ridge High School",
          logo_url: "/hickory-ridge-logo.png",
        },
        {
          entity_type: "highschool",
          entity_name: "Hickory Ridge",
          logo_url: "/hickory-ridge-logo.png",
        },
      ]

      const { data, error } = await supabase.from("logo_mappings").insert(logoMappings).select()

      logoResult = { data, error, action: "inserted" }
    }

    if (logoResult.error) {
      console.error("Error updating Hickory Ridge logo:", logoResult.error)
      return NextResponse.json({ success: false, error: logoResult.error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Hickory Ridge logo ${logoResult.action} successfully`,
      athleteCount: athletes?.length || 0,
      athletes: athletes,
      logoMapping: logoResult.data,
    })
  } catch (error) {
    console.error("Error in update-hickory-ridge-logo:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
