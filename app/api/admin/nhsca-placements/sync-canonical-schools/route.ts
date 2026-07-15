import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getAllCanonicalNhscaAllAmericans,
  listCanonicalNhscaAaYears,
} from "@/lib/nhsca-canonical-aa"

export const dynamic = "force-dynamic"

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Write high_school (and fill division/weight gaps) from registered yearly AA
 * rosters into nhsca_placements + wrestling_nhsca_results.
 */
export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const canon = getAllCanonicalNhscaAllAmericans()
  if (!canon.length) {
    return NextResponse.json({
      ok: true,
      years: listCanonicalNhscaAaYears(),
      updated_placements: 0,
      updated_legacy: 0,
      message: "No canonical AA years registered",
    })
  }

  const admin = createAdminClient()
  const years = [...new Set(canon.map((c) => c.year))]
  let updatedPlacements = 0
  let updatedLegacy = 0
  const unmatched: string[] = []

  for (const year of years) {
    const yearCanon = canon.filter((c) => c.year === year)
    const byNamePlace = new Map(
      yearCanon.map((c) => [`${normName(c.athlete_name)}|${c.placement}`, c]),
    )
    const byName = new Map(yearCanon.map((c) => [normName(c.athlete_name), c]))

    const { data: plc, error: plcErr } = await admin
      .from("nhsca_placements")
      .select("id, athlete_name, placement, high_school, division, weight_class")
      .eq("year", year)
      .gte("placement", 1)
      .lte("placement", 8)

    if (plcErr) {
      return NextResponse.json({ error: plcErr.message }, { status: 500 })
    }

    for (const r of plc ?? []) {
      const n = normName(String(r.athlete_name))
      const c =
        byNamePlace.get(`${n}|${Number(r.placement)}`) ||
        byName.get(n) ||
        null
      if (!c) {
        unmatched.push(`${year} placements: ${r.athlete_name} #${r.placement}`)
        continue
      }
      const needsSchool = !r.high_school || !String(r.high_school).trim()
      const needsName = normName(String(r.athlete_name)) !== normName(c.athlete_name)
      if (!needsSchool && !needsName) continue
      const patch: Record<string, unknown> = {}
      if (needsSchool) patch.high_school = c.high_school
      if (needsName) patch.athlete_name = c.athlete_name
      if (!r.division) patch.division = c.division
      if (!r.weight_class) patch.weight_class = c.weight
      const { error } = await admin.from("nhsca_placements").update(patch).eq("id", r.id)
      if (!error) updatedPlacements += 1
    }

    const { data: leg, error: legErr } = await admin
      .from("wrestling_nhsca_results")
      .select("id, athlete_name, placement, high_school, division, weight")
      .eq("year", year)
      .gte("placement", 1)
      .lte("placement", 8)

    if (legErr) {
      return NextResponse.json({ error: legErr.message }, { status: 500 })
    }

    for (const r of leg ?? []) {
      const n = normName(String(r.athlete_name))
      const c =
        byNamePlace.get(`${n}|${Number(r.placement)}`) ||
        byName.get(n) ||
        null
      if (!c) continue
      if (r.high_school && String(r.high_school).trim()) continue
      const { error } = await admin
        .from("wrestling_nhsca_results")
        .update({
          high_school: c.high_school,
          division: r.division || c.division,
          weight: r.weight || c.weight,
          athlete_name: c.athlete_name,
        })
        .eq("id", r.id)
      if (!error) updatedLegacy += 1
    }
  }

  return NextResponse.json({
    ok: true,
    years,
    updated_placements: updatedPlacements,
    updated_legacy: updatedLegacy,
    unmatched: unmatched.slice(0, 20),
  })
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const rows = getAllCanonicalNhscaAllAmericans()
  return NextResponse.json({
    years: listCanonicalNhscaAaYears(),
    total_aa: rows.length,
    by_year: Object.fromEntries(
      listCanonicalNhscaAaYears().map((y) => [
        y,
        rows.filter((r) => r.year === y).length,
      ]),
    ),
  })
}
