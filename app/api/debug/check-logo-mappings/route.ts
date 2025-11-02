import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Check what's actually in the logo_mappings table
    const { data: allMappings, error } = await supabase
      .from("logo_mappings")
      .select("*")
      .order("entity_type", { ascending: true })

    if (error) {
      console.error("Error fetching logo mappings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by entity type for easier reading
    const groupedMappings = allMappings?.reduce(
      (acc, mapping) => {
        if (!acc[mapping.entity_type]) {
          acc[mapping.entity_type] = []
        }
        acc[mapping.entity_type].push({
          name: mapping.entity_name,
          logo_url: mapping.logo_url,
          id: mapping.id,
        })
        return acc
      },
      {} as Record<string, any[]>,
    )

    return NextResponse.json({
      success: true,
      total_mappings: allMappings?.length || 0,
      mappings_by_type: groupedMappings,
      raw_data: allMappings,
    })
  } catch (error) {
    console.error("Exception in check-logo-mappings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
