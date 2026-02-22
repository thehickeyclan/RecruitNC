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

  const { data: nchsaa2026, error: nchsaaError } = await admin
    .from("wrestling_nchsaa_results")
    .select("year, classification, weight_class, place, school, wrestler_name")
    .eq("year", 2026)

  if (nchsaaError) return NextResponse.json({ error: nchsaaError.message }, { status: 500 })
  const nchsaaRows = nchsaa2026 ?? []

  const rows: BlueMember2026Row[] = []

  for (const a of athletes) {
    const name = (a.name ?? "").toString().trim()
    const variants = nameVariants(name)
    const matched: Array<{ classification: string; weight_class: string; place: number | null; school: string }> = []
    for (const row of nchsaaRows) {
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

  return NextResponse.json({ rows })
}
