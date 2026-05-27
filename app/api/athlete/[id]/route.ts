import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSuper32FromTable, getUltimateClubDualsFromTables } from "@/lib/tournament-tables"
import { getNHSCAForAthlete, resolveGraduationYear } from "@/lib/athlete-nhsca"
import {
  getNCHSAAResultsForProfile,
  mergeNchsaaResults,
  nchsaaJsonToProfileRows,
} from "@/lib/nchsaa-results"
import {
  getNhscaDuals2026LiveProfileResults,
  getNhscaDuals2026RegistrationPlaceholders,
  mergeNationalTeamResultsForProfile,
} from "@/lib/national-team-live-profile-results"
import { recruitNcDebugLogProfile } from "@/lib/recruitnc-debug"
import { getNationalTeamResults } from "@/lib/tournament-utils"

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

    const gradYear = resolveGraduationYear(athlete as Record<string, unknown>)
    const highSchool = (athlete.highschool ?? athlete.highSchool ?? "").toString().trim()
    const name = (athlete.name ?? "").toString().trim()
    const wrestlingName = (athlete.wrestling_name ?? "").toString().trim()
    /** getSuper32FromTable / getUltimateClubDualsFromTables already apply getNameVariants internally; only pass primary + distinct wrestling name. */
    const nameBases: string[] = []
    if (name) nameBases.push(name)
    if (wrestlingName && wrestlingName.toLowerCase() !== name.toLowerCase()) nameBases.push(wrestlingName)
    const athleteRow = athlete as Record<string, unknown>
    const [nhscaMerged, super32FromTable, nationalTeamFromTables, nchsaaMergedRows, nhscaDualsLive, nhscaDualsRegistration] =
      await Promise.all([
      getNHSCAForAthlete(supabase, athleteRow),
      (async () => {
        const bases = nameBases.filter(Boolean)
        if (!bases.length) return []
        const tries = await Promise.all(
          bases.map((n) => getSuper32FromTable(supabase, n, gradYear, { highSchool: highSchool || undefined })),
        )
        for (const rows of tries) {
          if (rows.length) return rows
        }
        return []
      })(),
      (async () => {
        const bases = nameBases.filter(Boolean)
        if (!bases.length) return []
        const tries = await Promise.all(bases.map((n) => getUltimateClubDualsFromTables(supabase, n, highSchool || undefined)))
        for (const rows of tries) {
          if (rows.length) return rows
        }
        return []
      })(),
      (async () => {
        try {
          const [byName, byWrestling] = await Promise.all([
            getNCHSAAResultsForProfile(supabase, name, gradYear, highSchool || undefined),
            wrestlingName && wrestlingName !== name
              ? getNCHSAAResultsForProfile(supabase, wrestlingName, gradYear, highSchool || undefined)
              : Promise.resolve([] as Awaited<ReturnType<typeof getNCHSAAResultsForProfile>>),
          ])
          const fromAthleteRow = nchsaaJsonToProfileRows(athleteRow.nchsaa_results, name)
          return mergeNchsaaResults(mergeNchsaaResults(byName, byWrestling), fromAthleteRow)
        } catch (e) {
          console.warn("[RecruitNC] GET /api/athlete/[id]: NCHSAA merge failed", e)
          try {
            return nchsaaJsonToProfileRows(athleteRow.nchsaa_results, name)
          } catch {
            return []
          }
        }
      })(),
      getNhscaDuals2026LiveProfileResults(supabase, nameBases),
      getNhscaDuals2026RegistrationPlaceholders(supabase, id.trim(), {
        name,
        highSchool,
        gradYear,
      }),
    ])
    const nchsaa_profile = nchsaaMergedRows.map((r) => ({
      year: r.year,
      place: r.place,
      classification: r.classification,
      weight_class: r.weight_class,
    }))
    const nationalTeamFromRow = getNationalTeamResults(athlete)
    const national_team_results = mergeNationalTeamResultsForProfile({
      fromTable: nationalTeamFromTables,
      fromAthleteRow: nationalTeamFromRow,
      fromLive: nhscaDualsLive,
      fromRegistration: nhscaDualsRegistration,
    })

    const athleteWithTournaments = {
      ...athlete,
      nhsca_results: nhscaMerged,
      /** Same merge as /api/wrestling-achievements `all_results.nchsaa` — one request for profiles. */
      nchsaa_profile,
      super32_results: super32FromTable.length ? super32FromTable : (athlete.super32_results ?? []),
      national_team_results,
    }

    recruitNcDebugLogProfile("GET /api/athlete/[id] bundle", {
      elapsedMs: Date.now() - start,
      athleteIdPrefix: id.trim().slice(0, 8),
      gradYear,
      nameBaseCount: nameBases.length,
      nhscaResultRows: nhscaMerged.length,
      nchsaaProfileRows: nchsaa_profile.length,
      super32FromTable: super32FromTable.length,
      nationalTeamMerged: national_team_results.length,
      nhscaDualsLiveRows: nhscaDualsLive.length,
      nhscaDualsRegistrationRows: nhscaDualsRegistration.length,
    })

    return NextResponse.json(
      { ok: true, athlete: athleteWithTournaments },
      {
        headers: {
          /** Public athlete JSON is safe to cache briefly at the edge (per-athlete URL). */
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[RecruitNC] GET /api/athlete/[id] exception", { message, elapsed: Date.now() - start })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
