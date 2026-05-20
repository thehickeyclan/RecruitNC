import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const, userId: user.id }
}

// Weight classes for HS boys
const WEIGHT_CLASSES = ['106','113','120','126','132','138','145','152','160','170','182','195','220','285'] as const

// Auto-calculate team points from outcome
function getTeamPoints(outcome: string): { nc: number; opp: number } {
  switch (outcome) {
    case 'nc_fall':
    case 'nc_forfeit':
      return { nc: 6, opp: 0 }
    case 'nc_tech_fall':
      return { nc: 5, opp: 0 }
    case 'nc_major':
      return { nc: 4, opp: 0 }
    case 'nc_decision':
      return { nc: 3, opp: 0 }
    case 'opp_fall':
    case 'opp_forfeit':
      return { nc: 0, opp: 6 }
    case 'opp_tech_fall':
      return { nc: 0, opp: 5 }
    case 'opp_major':
      return { nc: 0, opp: 4 }
    case 'opp_decision':
      return { nc: 0, opp: 3 }
    case 'double_forfeit':
    case 'pending':
    default:
      return { nc: 0, opp: 0 }
  }
}

export type NhscaDual = {
  id: string
  event_year: number
  team: 'national' | 'select'
  opponent: string
  day: number
  pool_round: string | null
  mat_number: number | null
  start_time: string | null
  status: 'upcoming' | 'live' | 'final'
  nc_score: number
  opponent_score: number
  published: boolean
  notes: string | null
  last_updated_at: string
  created_at: string
}

export type NhscaDualMatch = {
  id: string
  dual_id: string
  weight_class: string
  nc_wrestler: string | null
  opponent_wrestler: string | null
  outcome: string
  bout_score: string | null
  nc_team_points: number
  opponent_team_points: number
  manual_override: boolean
  notes: string | null
}

export type NhscaAnnouncement = {
  id: string
  team: 'all' | 'national' | 'select'
  body: string
  published: boolean
  created_at: string
}

/** GET: List all duals with their matches */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const searchParams = request.nextUrl.searchParams
  const team = searchParams.get('team')
  const day = searchParams.get('day')

  let query = admin.from('nhsca_duals').select('*').eq('event_year', 2026).order('day').order('start_time')
  if (team) query = query.eq('team', team)
  if (day) query = query.eq('day', parseInt(day))

  const { data: duals, error: dualsError } = await query
  if (dualsError) {
    return NextResponse.json({ error: dualsError.message }, { status: 500 })
  }

  // Fetch matches for all duals
  const dualIds = (duals ?? []).map(d => d.id)
  let matches: NhscaDualMatch[] = []
  if (dualIds.length > 0) {
    const { data: matchData } = await admin
      .from('nhsca_dual_matches')
      .select('*')
      .in('dual_id', dualIds)
    matches = (matchData ?? []) as NhscaDualMatch[]
  }

  // Fetch announcements
  const { data: announcements } = await admin
    .from('nhsca_duals_announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  // Stats
  const stats = {
    national: {
      wins: (duals ?? []).filter(d => d.team === 'national' && d.status === 'final' && d.nc_score > d.opponent_score).length,
      losses: (duals ?? []).filter(d => d.team === 'national' && d.status === 'final' && d.nc_score < d.opponent_score).length,
      totalDuals: (duals ?? []).filter(d => d.team === 'national').length,
      liveDuals: (duals ?? []).filter(d => d.team === 'national' && d.status === 'live').length,
    },
    select: {
      wins: (duals ?? []).filter(d => d.team === 'select' && d.status === 'final' && d.nc_score > d.opponent_score).length,
      losses: (duals ?? []).filter(d => d.team === 'select' && d.status === 'final' && d.nc_score < d.opponent_score).length,
      totalDuals: (duals ?? []).filter(d => d.team === 'select').length,
      liveDuals: (duals ?? []).filter(d => d.team === 'select' && d.status === 'live').length,
    },
  }

  return NextResponse.json({
    duals: duals ?? [],
    matches,
    announcements: announcements ?? [],
    stats,
    weightClasses: WEIGHT_CLASSES,
  })
}

/** POST: Create a new dual */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const body = await request.json()

  const { team, opponent, day, pool_round, mat_number, start_time, notes } = body

  if (!team || !opponent || !day) {
    return NextResponse.json({ error: "team, opponent, and day are required" }, { status: 400 })
  }

  // Create the dual
  const { data: dual, error: dualError } = await admin
    .from('nhsca_duals')
    .insert({
      event_year: 2026,
      team,
      opponent,
      day: parseInt(day),
      pool_round: pool_round || null,
      mat_number: mat_number ? parseInt(mat_number) : null,
      start_time: start_time || null,
      status: 'upcoming',
      notes: notes || null,
      created_by: auth.userId,
    })
    .select()
    .single()

  if (dualError) {
    return NextResponse.json({ error: dualError.message }, { status: 500 })
  }

  // Create all 14 weight class match stubs
  const matchInserts = WEIGHT_CLASSES.map(wc => ({
    dual_id: dual.id,
    weight_class: wc,
    outcome: 'pending',
    nc_team_points: 0,
    opponent_team_points: 0,
  }))

  const { error: matchError } = await admin.from('nhsca_dual_matches').insert(matchInserts)
  if (matchError) {
    console.error('[nhsca-duals] Failed to create match stubs:', matchError)
  }

  return NextResponse.json({ dual })
}

/** PATCH: Update a dual or match */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const body = await request.json()
  const { type, id, ...updates } = body

  if (type === 'dual') {
    const { error } = await admin
      .from('nhsca_duals')
      .update({ ...updates, last_updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (type === 'match') {
    // Auto-calculate points if not manual override
    let finalUpdates = { ...updates }
    if (updates.outcome && !updates.manual_override) {
      const points = getTeamPoints(updates.outcome)
      finalUpdates.nc_team_points = points.nc
      finalUpdates.opponent_team_points = points.opp
    }
    finalUpdates.updated_at = new Date().toISOString()

    const { error } = await admin
      .from('nhsca_dual_matches')
      .update(finalUpdates)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (type === 'announcement') {
    const { error } = await admin
      .from('nhsca_duals_announcements')
      .update(updates)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 })
}

/** DELETE: Delete a dual or announcement */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const id = searchParams.get('id')

  if (!type || !id) {
    return NextResponse.json({ error: "type and id are required" }, { status: 400 })
  }

  if (type === 'dual') {
    // Matches cascade delete automatically
    const { error } = await admin.from('nhsca_duals').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (type === 'announcement') {
    const { error } = await admin.from('nhsca_duals_announcements').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 })
}
