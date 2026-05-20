import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET: Public API for published duals (requires login) */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const team = searchParams.get('team')
  const day = searchParams.get('day')

  // Use the user's session to query (RLS will filter to published only)
  let query = supabase
    .from('nhsca_duals')
    .select('*')
    .eq('event_year', 2026)
    .eq('published', true)
    .order('day')
    .order('start_time')

  if (team) query = query.eq('team', team)
  if (day) query = query.eq('day', parseInt(day))

  const { data: duals, error: dualsError } = await query
  if (dualsError) {
    return NextResponse.json({ error: dualsError.message }, { status: 500 })
  }

  // Fetch matches for published duals
  const dualIds = (duals ?? []).map(d => d.id)
  let matches: Record<string, unknown>[] = []
  if (dualIds.length > 0) {
    const { data: matchData } = await supabase
      .from('nhsca_dual_matches')
      .select('*')
      .in('dual_id', dualIds)
    matches = matchData ?? []
  }

  // Fetch published announcements
  const { data: announcements } = await supabase
    .from('nhsca_duals_announcements')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(10)

  // Calculate team records
  const stats = {
    national: {
      wins: (duals ?? []).filter(d => d.team === 'national' && d.status === 'final' && d.nc_score > d.opponent_score).length,
      losses: (duals ?? []).filter(d => d.team === 'national' && d.status === 'final' && d.nc_score < d.opponent_score).length,
    },
    select: {
      wins: (duals ?? []).filter(d => d.team === 'select' && d.status === 'final' && d.nc_score > d.opponent_score).length,
      losses: (duals ?? []).filter(d => d.team === 'select' && d.status === 'final' && d.nc_score < d.opponent_score).length,
    },
  }

  return NextResponse.json({
    duals: duals ?? [],
    matches,
    announcements: announcements ?? [],
    stats,
  })
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

    const { pool, results } = await req.json()

    // Insert results into database
    const { error } = await supabase
      .from("nhsca_duals_results")
      .insert(
        results.map((r: any) => ({
          pool,
          matchup_id: r.matchupId,
          team1_score: parseInt(r.team1Score) || 0,
          team2_score: parseInt(r.team2Score) || 0,
          created_by: user.id,
          created_at: new Date().toISOString()
        }))
      )

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
