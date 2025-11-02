import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get all logo mappings
    const { data: allMappings, error } = await supabase
      .from("logo_mappings")
      .select("*")
      .order("entity_type", { ascending: true })
      .order("entity_name", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by entity type
    const grouped = {
      college: [],
      highschool: [],
      club: [],
      other: [],
    }

    allMappings?.forEach((mapping) => {
      if (grouped[mapping.entity_type]) {
        grouped[mapping.entity_type].push(mapping)
      } else {
        grouped.other.push(mapping)
      }
    })

    // Test specific entities we care about
    const testEntities = [
      { type: "college", name: "UNC Chapel Hill" },
      { type: "college", name: "Campbell University" },
      { type: "college", name: "NC State" },
      { type: "highschool", name: "Cardinal Gibbons" },
      { type: "highschool", name: "Hickory Ridge" },
      { type: "highschool", name: "McDowell" },
      { type: "club", name: "Darkhorse" },
      { type: "club", name: "RAW" },
      { type: "club", name: "Team Savage" },
    ]

    const testResults = []
    for (const entity of testEntities) {
      const exactMatch = allMappings?.find(
        (m) => m.entity_type === entity.type && m.entity_name.toLowerCase() === entity.name.toLowerCase(),
      )

      const partialMatch = allMappings?.find(
        (m) => m.entity_type === entity.type && m.entity_name.toLowerCase().includes(entity.name.toLowerCase()),
      )

      testResults.push({
        ...entity,
        exactMatch: exactMatch || null,
        partialMatch: partialMatch || null,
        found: !!(exactMatch || partialMatch),
      })
    }

    return NextResponse.json({
      totalMappings: allMappings?.length || 0,
      grouped,
      testResults,
      allMappings: allMappings?.slice(0, 50), // First 50 for debugging
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
