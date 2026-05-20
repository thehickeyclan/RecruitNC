import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET: Fetch match results */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: results, error } = await supabase
      .from("nhsca_duals_results")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[results-get]", error)
      return NextResponse.json({ results: [] })
    }

    return NextResponse.json({ results: results || [] })
  } catch (e) {
    console.error("[results-get]", e)
    return NextResponse.json({ results: [] })
  }
}
/** POST: Admin enters match results */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { pool, match_id, team1_name, team2_name, team1_score, team2_score } = body

    if (!pool || !match_id || team1_score === undefined || team2_score === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Insert result into database
    const { error } = await supabase
      .from("nhsca_duals_results")
      .insert({
        pool,
        match_id,
        team1_name,
        team2_name,
        team1_score: parseInt(team1_score),
        team2_score: parseInt(team2_score),
        created_by: user.id,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error("[results]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[results]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
