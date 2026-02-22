import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNHSCAFromTables, getSuper32FromTable, getUltimateClubDualsFromTables } from "@/lib/tournament-tables"
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
    const [nhscaFromTables, super32FromTable, nationalTeamFromTables] = await Promise.all([
      getNHSCAFromTables(supabase, athlete.name ?? "", gradYear),
      getSuper32FromTable(supabase, athlete.name ?? "", gradYear, { highSchool: highSchool || undefined }),
      getUltimateClubDualsFromTables(supabase, athlete.name ?? "", highSchool || undefined),
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
