import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAdminAuth } from "@/lib/cached-auth-check"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Attempt to automatically match NHSCA placements to athlete profiles
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { year = 2025, method = "all" } = await request.json()

    let matchedCount = 0
    const results = []

    // Method 1: Exact name match
    if (method === "all" || method === "exact_name") {
      const { data, error } = await supabase.rpc("match_nhsca_exact_name", { tournament_year: year })

      if (error) {
        console.error("Exact name match error:", error)
      } else {
        matchedCount += data?.length || 0
        results.push({ method: "exact_name", matched: data?.length || 0 })
      }
    }

    // Method 2: Name + School match
    if (method === "all" || method === "name_school") {
      const { data, error } = await supabase.rpc("match_nhsca_name_school", { tournament_year: year })

      if (error) {
        console.error("Name + school match error:", error)
      } else {
        matchedCount += data?.length || 0
        results.push({ method: "name_school", matched: data?.length || 0 })
      }
    }

    // Method 3: Name + Weight match
    if (method === "all" || method === "name_weight") {
      const { data, error } = await supabase.rpc("match_nhsca_name_weight", { tournament_year: year })

      if (error) {
        console.error("Name + weight match error:", error)
      } else {
        matchedCount += data?.length || 0
        results.push({ method: "name_weight", matched: data?.length || 0 })
      }
    }

    return NextResponse.json({
      success: true,
      totalMatched: matchedCount,
      results,
      message: `Matched ${matchedCount} placements`,
    })
  } catch (error: any) {
    console.error("Match error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

/**
 * Get unmatched placements for manual review
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2025"
    const status = searchParams.get("status") || "unmatched"
    const limit = parseInt(searchParams.get("limit") || "100")

    const query = supabase.from("nhsca_placements").select("*").eq("year", parseInt(year))

    if (status === "unmatched") {
      query.eq("match_status", "unmatched")
    } else if (status === "matched") {
      query.in("match_status", ["auto_matched", "manually_matched"])
    }

    query.order("placement", { ascending: true }).order("weight_class", { ascending: true }).limit(limit)

    const { data, error } = await query

    if (error) {
      console.error("Error fetching placements:", error)
      return NextResponse.json({ error: "Failed to fetch placements" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      placements: data,
      count: data?.length || 0,
    })
  } catch (error: any) {
    console.error("Get placements error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

