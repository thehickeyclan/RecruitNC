import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAdminAuth } from "@/lib/cached-auth-check"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all placements
    const { data: placements, error } = await supabase
      .from("nhsca_placements")
      .select("*")
      .order("year", { ascending: false })
      .order("placement", { ascending: true, nullsFirst: false })
      .order("athlete_name", { ascending: true })

    if (error) {
      console.error("Error fetching placements:", error)
      return NextResponse.json({ error: "Failed to fetch placements" }, { status: 500 })
    }

    // Calculate stats
    const total = placements?.length || 0
    const placers = placements?.filter((p) => p.placement !== null && p.placement !== undefined).length || 0
    const nonPlacers = total - placers
    const matched = placements?.filter((p) => p.match_status !== "unmatched").length || 0
    const unmatched = total - matched
    const merged = placements?.filter((p) => p.match_status === "merged").length || 0

    return NextResponse.json({
      placements: placements || [],
      stats: {
        total,
        placers,
        nonPlacers,
        matched,
        unmatched,
        merged,
      },
    })
  } catch (error: any) {
    console.error("List placements error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

