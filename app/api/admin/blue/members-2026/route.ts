import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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

function nameVariants(name: string): string[] {
  const t = (name ?? "").trim()
  if (!t) return []
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return [t]
  const first = parts[0] ?? ""
  const last = parts.slice(1).join(" ")
  return [t, `${last}, ${first}`]
}

function placementLabel(place: number | null | undefined): string {
  if (place == null || place === 0) return "SQ"
  if (place === 1) return "Champion"
  if (place === 2) return "2nd"
  if (place === 3) return "3rd"
  if (place === 4) return "4th"
  return `${place}th`
}

/** GET: Blue members (active membership or athletes.ncUnitedTeam = blue) and their 2026 NCHSAA placement */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const blueAthleteIds = new Set<string>()

  const { data: memberships } = await admin
    .from("blue_memberships")
    .select("athlete_id")
    .in("status", ["active", "pending_payment", "alumni"])
  if (memberships?.length) {
    memberships.forEach((r) => blueAthleteIds.add(r.athlete_id))
  }

  const { data: athletesWithFlag } = await admin
    .from("athletes")
    .select("id")
    .ilike("ncUnitedTeam", "%blue%")
  if (athletesWithFlag?.length) {
    athletesWithFlag.forEach((a) => blueAthleteIds.add(a.id))
  }

  if (blueAthleteIds.size === 0) {
    return NextResponse.json({ rows: [] })
  }

  const ids = Array.from(blueAthleteIds)
  const { data: athletes, error: athletesError } = await admin
    .from("athletes")
    .select("id, name, highschool, graduationyear, weightclass")
    .in("id", ids)

  if (athletesError) return NextResponse.json({ error: athletesError.message }, { status: 500 })
  if (!athletes?.length) return NextResponse.json({ rows: [] })

  // Source of truth: wrestling_nchsaa_results. 2026: placers 1–4, SQ place=0; prior years placers 1–6.
  // See scripts/01-create-wrestling-tables.sql, scripts/463-add-nchsaa-qualifying-regional-columns.sql,
  // docs/2026-state-qualifier-data.md.
  const NCHSAA_TABLE = "wrestling_nchsaa_results"
  const { data: nchsaaRows, error: nchsaaError } = await admin
    .from(NCHSAA_TABLE)
    .select("year, classification, weight_class, place, school, wrestler_name")
    .eq("year", 2026)

  if (nchsaaError) {
    return NextResponse.json(
      { error: `${NCHSAA_TABLE}: ${nchsaaError.message}. Ensure the table exists and has 2026 data.` },
      { status: 500 }
    )
  }
  type NchsaaRow = { year: number; classification: string; weight_class: string; place: number | null; school: string; wrestler_name: string }
  const nchsaaRowsList: NchsaaRow[] = (nchsaaRows ?? []) as NchsaaRow[]

  const rows: BlueMember2026Row[] = []

  for (const a of athletes) {
    const name = (a.name ?? "").toString().trim()
    const variants = nameVariants(name)
    const matched: Array<{ classification: string; weight_class: string; place: number | null; school: string }> = []
    for (const row of nchsaaRowsList) {
      const rName = (row.wrestler_name ?? "").toString().trim()
      const ok = variants.some((v) => rName.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(rName.toLowerCase()))
      if (!ok) continue
      matched.push({
        classification: (row.classification ?? "").toString(),
        weight_class: (row.weight_class ?? "").toString(),
        place: row.place != null ? Number(row.place) : null,
        school: (row.school ?? "").toString(),
      })
    }

    const byKey = new Map<string, { place: number | null; school: string }>()
    for (const m of matched) {
      const key = `${m.classification}|${m.weight_class}`
      const existing = byKey.get(key)
      const placeVal = m.place === 0 || m.place == null ? 999 : m.place
      if (!existing || (existing.place === 0 || existing.place == null ? 999 : existing.place) > placeVal) {
        byKey.set(key, { place: m.place, school: m.school })
      }
    }

    if (byKey.size === 0) {
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
      const sorted = Array.from(byKey.entries()).sort((a, b) => {
        const [cA, wA] = a[0].split("|")
        const [cB, wB] = b[0].split("|")
        if (cA !== cB) return (cA || "").localeCompare(cB || "")
        return (wA || "").localeCompare(wB || "")
      })
      for (const [key, val] of sorted) {
        const [state_classification, state_weight] = key.split("|")
        rows.push({
          member_name: name || "—",
          grad_year: a.graduationyear != null ? Number(a.graduationyear) : null,
          high_school: (a.highschool ?? "").toString() || "—",
          profile_weight: (a.weightclass ?? "").toString() || "—",
          state_year: 2026,
          state_classification: state_classification || "—",
          state_weight: state_weight || "—",
          placement: placementLabel(val.place),
          state_school: val.school || "—",
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

  const membersWith2026Champ = new Set<string>()
  const membersWith2026Placer = new Set<string>()
  const membersWith2026SQ = new Set<string>()
  for (const r of rows) {
    if (!r.member_name || r.member_name === "—") continue
    if (r.state_year === 2026) {
      if (r.placement === "Champion") membersWith2026Champ.add(r.member_name)
      if (r.placement === "SQ") membersWith2026SQ.add(r.member_name)
      // 2026 NCHSAA: placers are 1–4 only; prior years 1–6
      if (["Champion", "2nd", "3rd", "4th"].includes(r.placement)) membersWith2026Placer.add(r.member_name)
    }
  }
  stats.stateChamps2026 = membersWith2026Champ.size
  stats.statePlacers2026 = membersWith2026Placer.size
  stats.stateQualifiers2026 = membersWith2026SQ.size

  const { data: allNchsaa } = await admin
    .from(NCHSAA_TABLE)
    .select("year, place, wrestler_name")
    .gte("year", 2018)
    .lte("year", 2026)
  const champYearsByMember = new Map<string, Set<number>>()
  for (const row of allNchsaa ?? []) {
    if (row.place !== 1) continue
    const rName = (row.wrestler_name ?? "").toString().trim()
    for (const a of athletes) {
      const aname = (a.name ?? "").toString().trim()
      if (!memberNamesSet.has(aname)) continue
      const variants = nameVariants(aname)
      const ok = variants.some((v) => rName.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(rName.toLowerCase()))
      if (!ok) continue
      let set = champYearsByMember.get(aname)
      if (!set) {
        set = new Set()
        champYearsByMember.set(aname, set)
      }
      set.add(Number(row.year))
    }
  }
  for (const [, years] of champYearsByMember) {
    const c = years.size
    if (c >= 4) stats.fourXStateChamps++
    else if (c === 3) stats.threeXStateChamps++
    else if (c === 2) stats.twoXStateChamps++
  }

  const nhscaTableNames = ["wrestling_nhsca_results", "nhsca_results"] as const
  let nhscaRows: Array<{ athlete_name?: string; wrestler_name?: string; placement?: number; place?: number }> = []
  for (const t of nhscaTableNames) {
    const { data, error } = await admin.from(t).select("athlete_name, wrestler_name, placement, place").limit(5000)
    if (!error && data?.length !== undefined) {
      nhscaRows = data as typeof nhscaRows
      break
    }
  }
  const allAmericanMembers = new Set<string>()
  for (const row of nhscaRows) {
    const place = row.placement ?? row.place
    if (place == null || place < 1 || place > 8) continue
    const name = (row.athlete_name ?? row.wrestler_name ?? "").toString().trim()
    const variants = nameVariants(name)
    for (const a of athletes) {
      const aname = (a.name ?? "").toString().trim()
      if (!variants.some((v) => aname.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(aname.toLowerCase()))) continue
      if (memberNamesSet.has(aname)) allAmericanMembers.add(aname)
    }
  }
  stats.allAmericans = allAmericanMembers.size

  return NextResponse.json({ rows, stats })
}
