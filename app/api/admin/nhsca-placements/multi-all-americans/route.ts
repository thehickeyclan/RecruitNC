import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAdminAuth } from "@/lib/cached-auth-check"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Get multi-time NHSCA All-Americans and National Champions
 * 
 * Query params:
 * - count: 2, 3, 4, etc. (default: 2)
 * - type: "all-american" or "champion" (default: "all-american")
 * - state: state filter (default: "NC")
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get("count") || "2")
    const type = searchParams.get("type") || "all-american" // "all-american" or "champion"
    const state = searchParams.get("state") || "NC"

    // Build base query
    let query = supabase
      .from("nhsca_placements")
      .select(`
        *,
        athletes (
          id,
          name,
          highschool,
          graduationyear
        )
      `)
      .eq("state", state)

    // Filter by type
    if (type === "champion") {
      query = query.eq("placement", 1)
    } else {
      // All-American = placement <= 8
      query = query.not("placement", "is", null).lte("placement", 8)
    }

    const { data: placements, error } = await query.order("year", { ascending: false })

    if (error) {
      console.error("Error fetching placements:", error)
      return NextResponse.json({ error: "Failed to fetch placements" }, { status: 500 })
    }

    if (!placements || placements.length === 0) {
      return NextResponse.json({
        count: 0,
        results: [],
        message: `No ${type === "champion" ? "champions" : "All-Americans"} found`
      })
    }

    // Group by athlete and count
    const athleteMap = new Map<string, any>()

    for (const placement of placements) {
      const key = placement.athlete_id || placement.athlete_name
      
      if (!athleteMap.has(key)) {
        athleteMap.set(key, {
          athlete_id: placement.athlete_id,
          athlete_name: placement.athlete_name,
          name: placement.athletes?.name || placement.athlete_name,
          highschool: placement.athletes?.highschool || null,
          graduationyear: placement.athletes?.graduationyear || null,
          placements: [],
          count: 0,
          match_status: placement.athlete_id ? "matched" : "unmatched"
        })
      }

      const athlete = athleteMap.get(key)!
      athlete.placements.push({
        year: placement.year,
        placement: placement.placement,
        weight_class: placement.weight_class,
        division: placement.division,
        record: placement.record
      })
      athlete.count++
    }

    // Filter to exact count
    const results = Array.from(athleteMap.values())
      .filter(athlete => athlete.count === count)
      .map(athlete => ({
        ...athlete,
        placements: athlete.placements.sort((a: any, b: any) => b.year - a.year),
        years: athlete.placements.map((p: any) => p.year).sort((a: number, b: number) => b - a)
      }))
      .sort((a, b) => {
        // Sort by count (desc), then by name
        if (b.count !== a.count) return b.count - a.count
        return a.name.localeCompare(b.name)
      })

    return NextResponse.json({
      count: results.length,
      type: type === "champion" ? "National Champions" : "All-Americans",
      target_count: count,
      state,
      results
    })

  } catch (error: any) {
    console.error("Error in multi-all-americans endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}






