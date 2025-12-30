import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAdminAuth } from "@/lib/cached-auth-check"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Debug endpoint to check NHSCA data for a specific year and division
 * Helps identify data quality issues
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : 2025
    const division = searchParams.get("division") || "Senior"

    // Get all placements for this year and division
    const { data: placements, error } = await supabase
      .from("nhsca_placements")
      .select("*")
      .eq("year", year)
      .eq("state", "NC")
      .ilike("division", division) // Case-insensitive match
      .order("placement", { ascending: true, nullsFirst: true })

    if (error) {
      console.error("Error fetching placements:", error)
      return NextResponse.json({ error: "Failed to fetch placements" }, { status: 500 })
    }

    // Count statistics
    const total = placements?.length || 0
    const placers = placements?.filter((p) => p.placement !== null && p.placement !== undefined).length || 0
    const nonPlacers = total - placers

    // Check for division name variations
    const divisionVariations = new Set<string>()
    placements?.forEach((p) => {
      if (p.division) {
        divisionVariations.add(p.division)
      }
    })

    // Group by placement
    const placementBreakdown: Record<number, number> = {}
    placements?.forEach((p) => {
      if (p.placement !== null && p.placement !== undefined) {
        placementBreakdown[p.placement] = (placementBreakdown[p.placement] || 0) + 1
      }
    })

    return NextResponse.json({
      success: true,
      year,
      division,
      stats: {
        total,
        placers,
        nonPlacers,
        placementBreakdown,
      },
      divisionVariations: Array.from(divisionVariations),
      samplePlacements: placements?.slice(0, 10).map((p) => ({
        athlete_name: p.athlete_name,
        division: p.division,
        placement: p.placement,
        weight_class: p.weight_class,
        record: p.record,
      })),
      allPlacements: placements,
    })
  } catch (error: any) {
    console.error("Debug error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

