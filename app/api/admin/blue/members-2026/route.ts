import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadProfileTournamentData } from "@/lib/profile-tournament-data"

export const dynamic = "force-dynamic"

export type BlueMember2026Row = {
  member_name: string
  grad_year: number | null
  high_school: string
  profile_weight: string
  state_year: number | null
  state_classification: string
  state_weight: string
  placement: string
  state_school: string
}

export type BlueMembers2026Stats = {
  totalMembers: number
  stateChamps2026: number
  statePlacers2026: number
  stateQualifiers2026: number
  twoXStateChamps: number
  threeXStateChamps: number
  fourXStateChamps: number
  allAmericans: number
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

function placementLabel(place: number | null | undefined): string {
  if (place == null || place === 0) return "SQ"
  if (place === 1) return "Champion"
  if (place === 2) return "2nd"
  if (place === 3) return "3rd"
  if (place === 4) return "4th"
  return `${place}th`
}

/** GET: Blue members and 2026 NCHSAA. Same code path as unified profile + rankings: loadProfileTournamentData per athlete, then Blue filter. */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const blueAthleteIds = new Set<string>()
  const { data: memberships } = await admin
    .from("blue_memberships")
    .select("athlete_id")
    .in("status", ["active", "pending_payment", "alumni"])
  if (memberships?.length) memberships.forEach((r) => blueAthleteIds.add(r.athlete_id))
  const { data: athletesWithFlag } = await admin.from("athletes").select("id").ilike("ncUnitedTeam", "%blue%")
  if (athletesWithFlag?.length) athletesWithFlag.forEach((a) => blueAthleteIds.add(a.id))

  const emptyStats = { totalMembers: 0, stateChamps2026: 0, statePlacers2026: 0, stateQualifiers2026: 0, twoXStateChamps: 0, threeXStateChamps: 0, fourXStateChamps: 0, allAmericans: 0 }
  if (blueAthleteIds.size === 0) return NextResponse.json({ rows: [], stats: emptyStats })

  const { data: athletes, error: athletesError } = await admin
    .from("athletes")
    .select("id, name, highschool, graduationyear, weightclass")
    .in("id", Array.from(blueAthleteIds))

  if (athletesError) return NextResponse.json({ error: athletesError.message }, { status: 500 })
  if (!athletes?.length) return NextResponse.json({ rows: [], stats: emptyStats })

  const rows: BlueMember2026Row[] = []
  const champYearsByMember = new Map<string, Set<number>>()

  const results = await Promise.all(
    athletes.map(async (a) => {
      let data: Awaited<ReturnType<typeof loadProfileTournamentData>> = { nchsaa: [], nhsca: [], super32: [] }
      try {
        data = await loadProfileTournamentData(admin, a)
      } catch {
        // table missing or query error
      }
      return { a, name: (a.name ?? "").toString().trim(), ...data }
    })
  )

  for (const { a, name, nchsaa, nhsca } of results) {
    const champYears = new Set<number>()
    for (const r of nchsaa) {
      if (r.place === 1) champYears.add(r.year)
    }
    champYearsByMember.set(name, champYears)

    const year2026 = nchsaa.filter((r) => r.year === 2026)
    if (year2026.length === 0) {
      rows.push({
        member_name: name || "—",
        grad_year: a.graduationyear != null ? Number(a.graduationyear) : null,
        high_school: (a.highschool ?? "").toString() || "—",
        profile_weight: (a.weightclass ?? "").toString() || "—",
        state_year: null,
        state_classification: "—",
        state_weight: "—",
        placement: "—",
        state_school: "—",
      })
    } else {
      year2026.sort((x, y) => (x.classification || "").localeCompare(y.classification || "") || (x.weight_class || "").localeCompare(y.weight_class || ""))
      for (const r of year2026) {
        rows.push({
          member_name: name || "—",
          grad_year: a.graduationyear != null ? Number(a.graduationyear) : null,
          high_school: (a.highschool ?? "").toString() || "—",
          profile_weight: (a.weightclass ?? "").toString() || "—",
          state_year: 2026,
          state_classification: (r.classification ?? "").toString() || "—",
          state_weight: (r.weight_class ?? "").toString() || "—",
          placement: placementLabel(r.place),
          state_school: (r.school ?? "").toString() || "—",
        })
      }
    }
  }

  rows.sort((a, b) => {
    const n = (a.member_name || "").localeCompare(b.member_name || "")
    if (n !== 0) return n
    const c = (a.state_classification || "").localeCompare(b.state_classification || "")
    if (c !== 0) return c
    return (a.state_weight || "").localeCompare(b.state_weight || "")
  })

  const uniqueMemberNames = [...new Set(rows.map((r) => r.member_name))].filter((n) => n && n !== "—")
  const memberNamesSet = new Set(uniqueMemberNames)

  const stats = {
    totalMembers: uniqueMemberNames.length,
    stateChamps2026: 0,
    statePlacers2026: 0,
    stateQualifiers2026: 0,
    twoXStateChamps: 0,
    threeXStateChamps: 0,
    fourXStateChamps: 0,
    allAmericans: 0,
  }
  stats.stateChamps2026 = new Set(rows.filter((r) => r.state_year === 2026 && r.placement === "Champion").map((r) => r.member_name)).size
  stats.statePlacers2026 = new Set(rows.filter((r) => r.state_year === 2026 && ["Champion", "2nd", "3rd", "4th"].includes(r.placement)).map((r) => r.member_name)).size
  stats.stateQualifiers2026 = new Set(rows.filter((r) => r.state_year === 2026 && r.placement === "SQ").map((r) => r.member_name)).size

  for (const [, years] of champYearsByMember) {
    const c = years.size
    if (c >= 4) stats.fourXStateChamps++
    else if (c === 3) stats.threeXStateChamps++
    else if (c === 2) stats.twoXStateChamps++
  }

  const allAmericanMembers = new Set<string>()
  for (const { name, nhsca } of results) {
    if (!memberNamesSet.has(name)) continue
    const isAllAmerican = nhsca.some(
      (r) => r.placement === "Champion" || /\d(st|nd|rd|th) All-American/.test(r.placement ?? "")
    )
    if (isAllAmerican) allAmericanMembers.add(name)
  }
  stats.allAmericans = allAmericanMembers.size

  return NextResponse.json({ rows, stats })
}
