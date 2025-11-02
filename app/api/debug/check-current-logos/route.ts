import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get all logo mappings
    const { data: allMappings, error: allError } = await supabase.from("logo_mappings").select("*").order("entity_name")

    if (allError) {
      console.error("Error fetching all mappings:", allError)
      return NextResponse.json({
        success: false,
        error: "Failed to fetch logo mappings",
        details: allError.message,
        totalMappings: 0,
        typeCounts: {},
        allMappings: [],
        testResults: [],
        hickoryRidgeMappings: [],
        appalachianStateMappings: [],
      })
    }

    // Count by type
    const typeCounts: Record<string, number> = {}
    allMappings?.forEach((mapping) => {
      typeCounts[mapping.entity_type] = (typeCounts[mapping.entity_type] || 0) + 1
    })

    // Find specific mappings
    const hickoryRidgeMappings =
      allMappings?.filter((mapping) => mapping.entity_name.toLowerCase().includes("hickory ridge")) || []

    const appalachianStateMappings =
      allMappings?.filter((mapping) => mapping.entity_name.toLowerCase().includes("appalachian")) || []

    // Test specific searches
    const testEntities = [
      { name: "Hickory Ridge", type: "highschool" },
      { name: "Hickory Ridge High School", type: "highschool" },
      { name: "Appalachian State", type: "college" },
      { name: "Appalachian State University", type: "college" },
      { name: "Cardinal Gibbons", type: "highschool" },
    ]

    const testResults = []

    for (const entity of testEntities) {
      // Test exact match
      const { data: exactMatch, error: exactError } = await supabase
        .from("logo_mappings")
        .select("*")
        .eq("entity_type", entity.type)
        .ilike("entity_name", entity.name)
        .maybeSingle()

      // Test partial matches
      const { data: partialMatches, error: partialError } = await supabase
        .from("logo_mappings")
        .select("*")
        .eq("entity_type", entity.type)
        .ilike("entity_name", `%${entity.name}%`)
        .limit(5)

      testResults.push({
        searchEntity: entity,
        exactMatch,
        exactError: exactError?.message || null,
        partialMatches: partialMatches || [],
        partialError: partialError?.message || null,
      })
    }

    return NextResponse.json({
      success: true,
      totalMappings: allMappings?.length || 0,
      typeCounts,
      allMappings: allMappings || [],
      testResults,
      hickoryRidgeMappings,
      appalachianStateMappings,
    })
  } catch (error) {
    console.error("Error in check-current-logos:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
      totalMappings: 0,
      typeCounts: {},
      allMappings: [],
      testResults: [],
      hickoryRidgeMappings: [],
      appalachianStateMappings: [],
    })
  }
}
