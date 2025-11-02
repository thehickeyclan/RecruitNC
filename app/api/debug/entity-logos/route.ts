import { NextResponse } from "next/server"
import { getLogoUrl } from "@/lib/logo-mappings"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Test specific problematic entities
    const testEntities = [
      { type: "college", name: "Appalachian State University" },
      { type: "college", name: "App State" },
      { type: "college", name: "Appalachian State" },
      { type: "highschool", name: "McDowell" },
      { type: "highschool", name: "McDowell High School" },
      { type: "highschool", name: "Cardinal Gibbons" },
      { type: "highschool", name: "Cardinal Gibbons High School" },
      { type: "club", name: "RAW" },
      { type: "club", name: "RAW Wrestling Club" },
      { type: "club", name: "Team Tar Heel" },
    ]

    // Get all logo mappings from the database
    const { data: allMappings, error: mappingsError } = await supabase.from("logo_mappings").select("*")

    if (mappingsError) {
      return NextResponse.json({ error: "Failed to fetch logo mappings" }, { status: 500 })
    }

    // Test each entity
    const results = await Promise.all(
      testEntities.map(async (entity) => {
        const logoUrl = await getLogoUrl(entity.type, entity.name)
        return {
          type: entity.type,
          name: entity.name,
          logoUrl,
          found: !!logoUrl,
        }
      }),
    )

    // Get Hayden's and Liam's data
    const { data: hayden, error: haydenError } = await supabase
      .from("athletes")
      .select("*")
      .ilike("name", "%Hayden%")
      .single()

    const { data: liam, error: liamError } = await supabase
      .from("athletes")
      .select("*")
      .ilike("name", "%Liam%")
      .single()

    return NextResponse.json({
      results,
      allMappings,
      hayden: haydenError ? { error: haydenError.message } : hayden,
      liam: liamError ? { error: liamError.message } : liam,
    })
  } catch (error) {
    console.error("Error in entity-logos debug endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
