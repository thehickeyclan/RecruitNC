import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadProfileTournamentData } from "@/lib/profile-tournament-data"

export const dynamic = "force-dynamic"

export type BlueMember2026Row = {
  athlete_id: string
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
  /** Unique members who ever won state (any year). For All-time view. */
  stateChampsAllTime: number
  statePlacersAllTime: number
  stateQualifiersAllTime: number
  twoXStateChamps: number
  threeXStateChamps: number
  fourXStateChamps: number
  allAmericans: number
  super32Placers: number
  nhscaRecordWins: number
  nhscaRecordLosses: number
  super32RecordWins: number
  super32RecordLosses: number
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

/** Parse "5-2" or "4 - 3" to { wins, losses }. */
function parseRecord(record: string | null | undefined): { wins: number; losses: number } {
  const s = (record ?? "").toString().trim()
  const match = s.match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*$/)
  if (!match) return { wins: 0, losses: 0 }
  return { wins: parseInt(match[1]!, 10) || 0, losses: parseInt(match[2]!, 10) || 0 }
}

/** Default: active Blue program = class of 2026 and on. Use ?gradYears=2026,2027,2028,2029,2030 to include prior years (e.g. 2025, 2024). */
const DEFAULT_GRAD_YEARS = [2026, 2027, 2028, 2029, 2030]

/** GET: Blue members and 2026 NCHSAA. Same code path as unified profile + rankings. Optional ?gradYears=2026,2027,... (default: 2026–2030 = active program). */
export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const gradYearsParam = searchParams.get("gradYears") ?? ""
  const allowedGradYears = gradYearsParam
    ? gradYearsParam.split(",").map((s) => parseInt(s.trim(), 10)).filter((y) => !isNaN(y) && y >= 2018 && y <= 2035)
    : DEFAULT_GRAD_YEARS
  const gradYearSet = new Set(allowedGradYears.length ? allowedGradYears : DEFAULT_GRAD_YEARS)

  const admin = createAdminClient()

  const blueAthleteIds = new Set<string>()
  const { data: memberships } = await admin
    .from("blue_memberships")
    .select("athlete_id")
    .in("status", ["active", "pending_payment", "alumni"])
  if (memberships?.length) memberships.forEach((r) => blueAthleteIds.add(r.athlete_id))
  const { data: athletesWithFlag } = await admin.from("athletes").select("id").ilike("ncUnitedTeam", "%blue%")
  if (athletesWithFlag?.length) athletesWithFlag.forEach((a) => blueAthleteIds.add(a.id))

  const emptyStats: BlueMembers2026Stats = {
    totalMembers: 0, stateChamps2026: 0, statePlacers2026: 0, stateQualifiers2026: 0,
    stateChampsAllTime: 0, statePlacersAllTime: 0, stateQualifiersAllTime: 0,
    twoXStateChamps: 0, threeXStateChamps: 0, fourXStateChamps: 0, allAmericans: 0,
    super32Placers: 0, nhscaRecordWins: 0, nhscaRecordLosses: 0, super32RecordWins: 0, super32RecordLosses: 0,
  }
  if (blueAthleteIds.size === 0) return NextResponse.json({ rows2026: [], rowsAllYears: [], statsAllTime: emptyStats, stats2026: emptyStats })

  const { data: athletesRaw, error: athletesError } = await admin
    .from("athletes")
    .select("id, name, highschool, graduationyear, weightclass")
    .in("id", Array.from(blueAthleteIds))

  if (athletesError) return NextResponse.json({ error: athletesError.message }, { status: 500 })
  const athletes = (athletesRaw ?? []).filter((a) => {
    const y = a.graduationyear != null ? Number(a.graduationyear) : null
    return y != null && gradYearSet.has(y)
  })
  if (!athletes.length) return NextResponse.json({ rows2026: [], rowsAllYears: [], statsAllTime: emptyStats, stats2026: emptyStats })

  const rows: BlueMember2026Row[] = []
  const champYearsByMember = new Map<string, Set<number>>()
  // NCHSAA from getNCHSAAResultsForProfile has no year filter → all years; 2×/3×/4× = all-time career state titles

  const results = await Promise.all(
    athletes.map(async (a) => {
      let data: Awaited<ReturnType<typeof loadProfileTournamentData>> = { nchsaa: [], nhsca: [], super32: [] }
      try {
        data = await loadProfileTournamentData(admin, a, { allTime: true })
      } catch {
        // table missing or query error
      }
      return { a, name: (a.name ?? "").toString().trim(), ...data }
    })
  )

  const rows2026Only: BlueMember2026Row[] = []
  const rowsAllYears: BlueMember2026Row[] = []

  for (const { a, name, nchsaa, nhsca } of results) {
    const gradYear = a.graduationyear != null ? Number(a.graduationyear) : new Date().getFullYear()
    const minYear = gradYear - 4
    const maxYear = gradYear
    const nchsaaInRange = nchsaa.filter((r) => r.year >= minYear && r.year <= maxYear)

    const champYears = new Set<number>()
    for (const r of nchsaaInRange) {
      if (r.place === 1) champYears.add(r.year)
    }
    champYearsByMember.set(name, champYears)

    const year2026 = nchsaaInRange.filter((r) => r.year === 2026)
    if (year2026.length === 0) {
      rows2026Only.push({
        athlete_id: a.id,
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
        rows2026Only.push({
          athlete_id: a.id,
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

    const allYearsSorted = [...nchsaaInRange].sort(
      (x, y) => (y.year - x.year) || (x.classification || "").localeCompare(y.classification || "") || (x.weight_class || "").localeCompare(y.weight_class || "")
    )
    if (allYearsSorted.length === 0) {
      rowsAllYears.push({
        athlete_id: a.id,
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
      for (const r of allYearsSorted) {
        rowsAllYears.push({
          athlete_id: a.id,
          member_name: name || "—",
          grad_year: a.graduationyear != null ? Number(a.graduationyear) : null,
          high_school: (a.highschool ?? "").toString() || "—",
          profile_weight: (a.weightclass ?? "").toString() || "—",
          state_year: r.year,
          state_classification: (r.classification ?? "").toString() || "—",
          state_weight: (r.weight_class ?? "").toString() || "—",
          placement: placementLabel(r.place),
          state_school: (r.school ?? "").toString() || "—",
        })
      }
    }
  }

  const sortRows = (arr: BlueMember2026Row[]) =>
    arr.sort((a, b) => {
      const n = (a.member_name || "").localeCompare(b.member_name || "")
      if (n !== 0) return n
      const yr = (a.state_year ?? 0) - (b.state_year ?? 0)
      if (yr !== 0) return -yr
      const c = (a.state_classification || "").localeCompare(b.state_classification || "")
      if (c !== 0) return c
      return (a.state_weight || "").localeCompare(b.state_weight || "")
    })
  sortRows(rows2026Only)
  sortRows(rowsAllYears)

  const uniqueMemberNames = [...new Set(rows2026Only.map((r) => r.member_name))].filter((n) => n && n !== "—")
  const memberNamesSet = new Set(uniqueMemberNames)

  const stats: BlueMembers2026Stats = {
    totalMembers: uniqueMemberNames.length,
    stateChamps2026: 0,
    statePlacers2026: 0,
    stateQualifiers2026: 0,
    stateChampsAllTime: 0,
    statePlacersAllTime: 0,
    stateQualifiersAllTime: 0,
    twoXStateChamps: 0,
    threeXStateChamps: 0,
    fourXStateChamps: 0,
    allAmericans: 0,
    super32Placers: 0,
    nhscaRecordWins: 0,
    nhscaRecordLosses: 0,
    super32RecordWins: 0,
    super32RecordLosses: 0,
  }
  stats.stateChamps2026 = new Set(rows2026Only.filter((r) => r.state_year === 2026 && r.placement === "Champion").map((r) => r.member_name)).size
  stats.statePlacers2026 = new Set(rows2026Only.filter((r) => r.state_year === 2026 && ["Champion", "2nd", "3rd", "4th"].includes(r.placement)).map((r) => r.member_name)).size
  stats.stateQualifiers2026 = new Set(rows2026Only.filter((r) => r.state_year === 2026 && r.placement === "SQ").map((r) => r.member_name)).size
  stats.stateChampsAllTime = rowsAllYears.filter((r) => r.placement === "Champion").length
  stats.statePlacersAllTime = rowsAllYears.filter((r) => ["Champion", "2nd", "3rd", "4th"].includes(r.placement)).length
  stats.stateQualifiersAllTime = rowsAllYears.filter((r) => r.placement === "SQ").length

  for (const [, years] of champYearsByMember) {
    const c = years.size
    if (c >= 4) stats.fourXStateChamps++
    else if (c === 3) stats.threeXStateChamps++
    else if (c === 2) stats.twoXStateChamps++
  }

  let nhscaWins = 0, nhscaLosses = 0, super32Wins = 0, super32Losses = 0
  const allAmericanMembers = new Set<string>()
  const super32PlacerMembers = new Set<string>()

  for (const { name, nhsca, super32 } of results) {
    if (!memberNamesSet.has(name)) continue
    const isAllAmerican = nhsca.some(
      (r) => r.placement === "Champion" || /\d(st|nd|rd|th) All-American/.test(r.placement ?? "")
    )
    if (isAllAmerican) allAmericanMembers.add(name)
    const hasSuper32Placement = super32.some((r) => (r.placement ?? "").toString().trim() !== "" && r.placement !== "DNP")
    if (hasSuper32Placement) super32PlacerMembers.add(name)
    for (const r of nhsca) {
      const { wins, losses } = parseRecord(r.record)
      nhscaWins += wins
      nhscaLosses += losses
    }
    for (const r of super32) {
      const { wins, losses } = parseRecord(r.record)
      super32Wins += wins
      super32Losses += losses
    }
  }

  stats.allAmericans = allAmericanMembers.size
  stats.super32Placers = super32PlacerMembers.size
  stats.nhscaRecordWins = nhscaWins
  stats.nhscaRecordLosses = nhscaLosses
  stats.super32RecordWins = super32Wins
  stats.super32RecordLosses = super32Losses

  const statsAllTime = { ...stats }

  const stats2026: BlueMembers2026Stats = {
    ...emptyStats,
    totalMembers: stats.totalMembers,
    stateChamps2026: stats.stateChamps2026,
    statePlacers2026: stats.statePlacers2026,
    stateQualifiers2026: stats.stateQualifiers2026,
    stateChampsAllTime: 0,
    statePlacersAllTime: 0,
    stateQualifiersAllTime: 0,
    twoXStateChamps: 0,
    threeXStateChamps: 0,
    fourXStateChamps: 0,
    allAmericans: 0,
    super32Placers: 0,
    nhscaRecordWins: 0,
    nhscaRecordLosses: 0,
    super32RecordWins: 0,
    super32RecordLosses: 0,
  }
  const nhsca2026 = (r: { year?: number }) => (r.year ?? 0) === 2026
  const super322026 = (r: { year?: number }) => (r.year ?? 0) === 2026
  for (const { name, nhsca, super32 } of results) {
    if (!memberNamesSet.has(name)) continue
    const isAA2026 = nhsca.filter(nhsca2026).some(
      (r) => r.placement === "Champion" || /\d(st|nd|rd|th) All-American/.test(r.placement ?? "")
    )
    if (isAA2026) stats2026.allAmericans++
    const hasSuper322026 = super32.filter(super322026).some((r) => (r.placement ?? "").toString().trim() !== "" && r.placement !== "DNP")
    if (hasSuper322026) stats2026.super32Placers++
    for (const r of nhsca.filter(nhsca2026)) {
      const { wins, losses } = parseRecord(r.record)
      stats2026.nhscaRecordWins += wins
      stats2026.nhscaRecordLosses += losses
    }
    for (const r of super32.filter(super322026)) {
      const { wins, losses } = parseRecord(r.record)
      stats2026.super32RecordWins += wins
      stats2026.super32RecordLosses += losses
    }
  }
  return NextResponse.json({ rows2026: rows2026Only, rowsAllYears, statsAllTime, stats2026 })
}
