import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNameVariants, getNHSCAFromTables, getSuper32FromTable, getUltimateClubDualsFromTables } from "@/lib/tournament-tables"
import { getNationalTeamResults, mergeNationalTeamResults } from "@/lib/tournament-utils"

/**
 * GET /api/athlete/[id]
 * Returns athlete with NHSCA, Super32 (and NCHSAA/National Team from row) merged from tournament tables.
 * Used by view-profile and unified-profile so tournament data appears on public profiles.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now()
  try {
    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: athlete, error } = await supabase
      .from("athletes")
      .select("*")
      .eq("id", id.trim())
      .single()

    const elapsed = Date.now() - start
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: 200 }
      )
    }
    if (!athlete) {
      return NextResponse.json({ ok: false, error: "no row" }, { status: 200 })
    }

    const gradYear = Number(athlete.graduationyear) || new Date().getFullYear()
    const highSchool = (athlete.highschool ?? athlete.highSchool ?? "").toString().trim()
    const name = (athlete.name ?? "").toString().trim()
    const wrestlingName = (athlete.wrestling_name ?? "").toString().trim()
    const namesToTry = [...new Set([...getNameVariants(name), ...(wrestlingName ? getNameVariants(wrestlingName) : [])])]
    const [nhscaFromTables, super32FromTable, nationalTeamFromTables] = await Promise.all([
      (async () => {
        const merged: Awaited<ReturnType<typeof getNHSCAFromTables>> = []
        const seen = new Set<string>()
        for (const n of namesToTry) {
          if (!n) continue
          const rows = await getNHSCAFromTables(supabase, n, gradYear)
          for (const r of rows) {
            const key = `${r.year}-${r.placement}-${r.weight ?? ""}-${r.division ?? ""}`
            if (!seen.has(key)) {
              seen.add(key)
              merged.push(r)
            }
          }
        }
        return merged.sort((a, b) => (b.year as number) - (a.year as number))
      })(),
      (async () => {
        for (const n of namesToTry) {
          if (!n) continue
          const rows = await getSuper32FromTable(supabase, n, gradYear, { highSchool: highSchool || undefined })
          if (rows.length) return rows
        }
        return []
      })(),
      (async () => {
        for (const n of namesToTry) {
          if (!n) continue
          const rows = await getUltimateClubDualsFromTables(supabase, n, highSchool || undefined)
          if (rows.length) return rows
        }
        return []
      })(),
    ])
    const nationalTeamFromRow = getNationalTeamResults(athlete)
    const national_team_results = mergeNationalTeamResults(nationalTeamFromTables, nationalTeamFromRow)
    const athleteWithTournaments = {
      ...athlete,
      nhsca_results: nhscaFromTables.length ? nhscaFromTables : (athlete.nhsca_results ?? []),
      super32_results: super32FromTable.length ? super32FromTable : (athlete.super32_results ?? []),
      national_team_results,
    }

    return NextResponse.json({ ok: true, athlete: athleteWithTournaments })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[profile-debug] GET /api/athlete/[id] exception", { message, elapsed: Date.now() - start })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
