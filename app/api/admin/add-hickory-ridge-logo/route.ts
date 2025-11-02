import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Check if Hickory Ridge mapping already exists
    const { data: existing } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", "highschool")
      .eq("entity_name", "Hickory Ridge High School")
      .single()

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Hickory Ridge logo mapping already exists",
        mapping: existing,
      })
    }

    // Add Hickory Ridge logo mapping
    const { data, error } = await supabase
      .from("logo_mappings")
      .insert({
        entity_type: "highschool",
        entity_name: "Hickory Ridge High School",
        logo_url: "/hough-high-school-logo.png", // Using similar school logo as placeholder
        division: null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding Hickory Ridge logo:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Hickory Ridge logo mapping added successfully",
      mapping: data,
    })
  } catch (error) {
    console.error("Error in add-hickory-ridge-logo:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
