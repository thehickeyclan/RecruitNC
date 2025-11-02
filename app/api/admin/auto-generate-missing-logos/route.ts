import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Get all unique high schools, colleges, and clubs from athletes
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("highschool, college, wrestlingClub")

    if (athletesError) {
      return NextResponse.json({ success: false, error: athletesError.message }, { status: 500 })
    }

    // Get existing logo mappings
    const { data: existingMappings, error: mappingsError } = await supabase
      .from("logo_mappings")
      .select("entity_name, entity_type")

    if (mappingsError) {
      return NextResponse.json({ success: false, error: mappingsError.message }, { status: 500 })
    }

    const existingSet = new Set(existingMappings.map((m) => `${m.entity_type}:${m.entity_name?.toLowerCase()}`))

    const newMappings = []

    // Process high schools
    const highSchools = new Set(athletes.map((a) => a.highschool).filter(Boolean))
    for (const school of highSchools) {
      const key = `highschool:${school.toLowerCase()}`
      if (!existingSet.has(key)) {
        newMappings.push({
          entity_type: "highschool",
          entity_name: school,
          logo_url: "/generic-high-school-logo.png",
          division: null,
        })
      }
    }

    // Process colleges
    const colleges = new Set(athletes.map((a) => a.college).filter(Boolean))
    for (const college of colleges) {
      const key = `college:${college.toLowerCase()}`
      if (!existingSet.has(key)) {
        newMappings.push({
          entity_type: "college",
          entity_name: college,
          logo_url: "/generic-college-logo.png",
          division: null,
        })
      }
    }

    // Process clubs
    const clubs = new Set(athletes.map((a) => a.wrestlingClub).filter(Boolean))
    for (const club of clubs) {
      const key = `club:${club.toLowerCase()}`
      if (!existingSet.has(key)) {
        newMappings.push({
          entity_type: "club",
          entity_name: club,
          logo_url: "/wrestling-club-logo.png",
          division: null,
        })
      }
    }

    // Insert new mappings in batches
    if (newMappings.length > 0) {
      const { error: insertError } = await supabase.from("logo_mappings").insert(newMappings)

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${newMappings.length} missing logo mappings`,
      mappings: newMappings,
    })
  } catch (error) {
    console.error("Error in auto-generate-missing-logos:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
