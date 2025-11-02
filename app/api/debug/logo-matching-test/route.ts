import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Test entities that are commonly used
    const testEntities = [
      { name: "Appalachian State", type: "college" },
      { name: "Appalachian State University", type: "college" },
      { name: "Hickory Ridge", type: "highschool" },
      { name: "Hickory Ridge High School", type: "highschool" },
      { name: "Cardinal Gibbons", type: "highschool" },
      { name: "UNC Chapel Hill", type: "college" },
      { name: "NC State", type: "college" },
    ]

    const results = []

    for (const entity of testEntities) {
      console.log(`🧪 Testing: ${entity.type} - ${entity.name}`)

      // Simulate the same logic as the logo API
      const entityTypesToSearch =
        entity.type === "highschool" ? ["highschool", "high_school", "High-School", "Highschool"] : [entity.type]

      let found = false
      const result = {
        entity: entity.name,
        type: entity.type,
        searchedTypes: entityTypesToSearch,
        exactMatch: null as any,
        partialMatch: null as any,
        broadMatch: null as any,
        error: null as string | null,
      }

      // Try each entity type variation
      for (const entityType of entityTypesToSearch) {
        if (found) break

        // Try exact match
        const { data: exactMatch, error: exactError } = await supabase
          .from("logo_mappings")
          .select("logo_url, entity_name, entity_type")
          .eq("entity_type", entityType)
          .ilike("entity_name", entity.name)
          .maybeSingle()

        if (exactMatch?.logo_url) {
          result.exactMatch = exactMatch
          found = true
          break
        }

        // Try partial match
        const { data: partialMatches, error: partialError } = await supabase
          .from("logo_mappings")
          .select("logo_url, entity_name, entity_type")
          .eq("entity_type", entityType)
          .ilike("entity_name", `%${entity.name}%`)
          .limit(1)

        if (partialMatches && partialMatches.length > 0) {
          result.partialMatch = partialMatches[0]
          found = true
          break
        }

        // Try reverse match (search term contains database name)
        const { data: allOfType, error: allError } = await supabase
          .from("logo_mappings")
          .select("logo_url, entity_name, entity_type")
          .eq("entity_type", entityType)
          .limit(20)

        if (allOfType) {
          for (const match of allOfType) {
            if (
              entity.name.toLowerCase().includes(match.entity_name.toLowerCase()) ||
              match.entity_name.toLowerCase().includes(entity.name.toLowerCase())
            ) {
              result.partialMatch = match
              found = true
              break
            }
          }
        }
      }

      // If still not found, try broad search
      if (!found) {
        const { data: broadSearch, error: broadError } = await supabase
          .from("logo_mappings")
          .select("logo_url, entity_name, entity_type")
          .ilike("entity_name", `%${entity.name}%`)
          .limit(1)

        if (broadSearch && broadSearch.length > 0) {
          result.broadMatch = broadSearch[0]
          found = true
        }
      }

      if (!found) {
        result.error = "No logo found"
      }

      results.push(result)
    }

    // Also get database stats
    const { data: allMappings, error: statsError } = await supabase.from("logo_mappings").select("entity_type")

    const stats = {
      totalMappings: allMappings?.length || 0,
      byType: {} as Record<string, number>,
    }

    allMappings?.forEach((mapping) => {
      stats.byType[mapping.entity_type] = (stats.byType[mapping.entity_type] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      results,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in logo matching test:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
