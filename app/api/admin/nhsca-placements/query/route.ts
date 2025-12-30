import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAdminAuth } from "@/lib/cached-auth-check"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Query endpoint for answering specific NHSCA questions
 * Examples:
 * - "What year did we have the most senior NHSCA All-Americans?"
 * - "How many freshman All-Americans in 2025?"
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const division = searchParams.get("division") // Freshman, Sophomore, Junior, Senior
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null
    const athleteName = searchParams.get("athlete") // Search by athlete name
    const queryType = searchParams.get("type") || "allAmericans" // allAmericans, champions, finalists, participants

    // Build query
    let query = supabase
      .from("nhsca_placements")
      .select("*")
      .eq("state", "NC")

    if (athleteName) {
      query = query.ilike("athlete_name", `%${athleteName.trim()}%`)
    }

    if (division) {
      query = query.eq("division", division)
    }

    if (year) {
      query = query.eq("year", year)
    }

    // Only count placers (All-Americans) unless querying participants
    if (queryType !== "participants") {
      query = query.not("placement", "is", null)
    }

    const { data: placements, error } = await query.order("year", { ascending: false })

    if (error) {
      console.error("Error fetching placements:", error)
      return NextResponse.json({ error: "Failed to fetch placements" }, { status: 500 })
    }

    if (!placements || placements.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        summary: {
          total: 0,
          byYear: {},
          bestYear: null,
        },
      })
    }

    // Group by year
    const byYear = new Map<number, {
      year: number
      allAmericans: number
      champions: number
      finalists: number
      participants: number
    }>()

    placements.forEach((p) => {
      if (!byYear.has(p.year)) {
        byYear.set(p.year, {
          year: p.year,
          allAmericans: 0,
          champions: 0,
          finalists: 0,
          participants: 0,
        })
      }

      const stats = byYear.get(p.year)!
      stats.participants++

      if (p.placement !== null && p.placement !== undefined) {
        stats.allAmericans++
        if (p.placement === 1) stats.champions++
        if (p.placement <= 2) stats.finalists++
      }
    })

    // Find best year
    let bestYear: { year: number; count: number } | null = null
    byYear.forEach((stats, year) => {
      const count = queryType === "champions" ? stats.champions :
                    queryType === "finalists" ? stats.finalists :
                    queryType === "participants" ? stats.participants :
                    stats.allAmericans

      if (!bestYear || count > bestYear.count) {
        bestYear = { year, count }
      }
    })

    // Convert to array
    const byYearArray = Array.from(byYear.values())
      .map((stats) => ({
        year: stats.year,
        allAmericans: stats.allAmericans,
        champions: stats.champions,
        finalists: stats.finalists,
        participants: stats.participants,
      }))
      .sort((a, b) => b.year - a.year)

    return NextResponse.json({
      success: true,
      query: {
        athlete: athleteName || "All",
        division: division || "All",
        year: year || "All",
        type: queryType,
      },
      results: placements,
      summary: {
        total: queryType === "champions" ? byYearArray.reduce((sum, y) => sum + y.champions, 0) :
               queryType === "finalists" ? byYearArray.reduce((sum, y) => sum + y.finalists, 0) :
               queryType === "participants" ? byYearArray.reduce((sum, y) => sum + y.participants, 0) :
               byYearArray.reduce((sum, y) => sum + y.allAmericans, 0),
        byYear: Object.fromEntries(
          byYearArray.map((s) => [
            s.year,
            {
              allAmericans: s.allAmericans,
              champions: s.champions,
              finalists: s.finalists,
              participants: s.participants,
            },
          ])
        ),
        bestYear: bestYear ? {
          year: bestYear.year,
          count: bestYear.count,
          label: queryType === "champions" ? "Champions" :
                 queryType === "finalists" ? "Finalists" :
                 queryType === "participants" ? "Participants" :
                 "All-Americans",
        } : null,
      },
    })
  } catch (error: any) {
    console.error("Query error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

