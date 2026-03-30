import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNameVariants, getSuper32FromTable, getUltimateClubDualsFromTables } from "@/lib/tournament-tables"
import { getNHSCAForAthlete, resolveGraduationYear } from "@/lib/athlete-nhsca"
import {
  getNCHSAAResultsForProfile,
  mergeNchsaaResults,
  nchsaaJsonToProfileRows,
} from "@/lib/nchsaa-results"
import { recruitNcDebugLogProfile } from "@/lib/recruitnc-debug"
import { getNationalTeamResults, mergeNationalTeamResults } from "@/lib/tournament-utils"

const NHSCA_DUALS_2026_SLUG = "nhsca-duals-2026"

/** If athlete is on the paid roster for 2026 NHSCA Duals, returns { member: true, record } (record from registration or "0-0"); else { member: false }. */
async function getNhscaDuals2026RosterStatus(
  supabase: SupabaseClient,
  athleteId: string,
  athlete: { name: string; highSchool: string; gradYear: number }
): Promise<{ member: boolean; record: string }> {
  try {
    const { data: byId, error } = await supabase
      .from("national_team_event_registrations")
      .select("id, record")
      .eq("event_slug", NHSCA_DUALS_2026_SLUG)
      .eq("status", "paid")
      .eq("athlete_id", athleteId)
      .limit(1)
    if (!error && byId && byId.length > 0) {
      const r = byId[0] as { record?: string }
      return { member: true, record: (r.record ?? "").trim() || "0-0" }
    }
  } catch {
    // athlete_id or record column may not exist yet; fall back to name match
  }

  const nameVariants = new Set(
    getNameVariants(athlete.name).map((n) => n.trim().toLowerCase())
  )
  const gradStr = String(athlete.gradYear)
  const highNorm = (athlete.highSchool ?? "").trim().toLowerCase()

  const { data: rows } = await supabase
    .from("national_team_event_registrations")
    .select("athlete_first_name, athlete_last_name, high_school, graduation_year, record")
    .eq("event_slug", NHSCA_DUALS_2026_SLUG)
    .eq("status", "paid")

  if (!rows?.length) return { member: false, record: "0-0" }
  for (const r of rows as { athlete_first_name?: string; athlete_last_name?: string; high_school?: string; graduation_year?: string; record?: string }[]) {
    const regFull = [r.athlete_first_name, r.athlete_last_name].filter(Boolean).join(" ").trim().toLowerCase()
    if (!regFull) continue
    const regGrad = (r.graduation_year ?? "").toString().trim()
    const regSchool = (r.high_school ?? "").trim().toLowerCase()
    if (nameVariants.has(regFull) && regGrad === gradStr && (!highNorm || regSchool === highNorm)) {
      return { member: true, record: (r.record ?? "").trim() || "0-0" }
    }
  }
  return { member: false, record: "0-0" }
}

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
    const namesToTry = [...new Set([...getNameVariants(name), ...(wrestlingName ? getNameVariants(wrestlingName) : [])])]
    const athleteRow = athlete as Record<string, unknown>
    const [nhscaMerged, super32FromTable, nationalTeamFromTables, nchsaaMergedRows] = await Promise.all([
      getNHSCAForAthlete(supabase, athleteRow),
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
      (async () => {
        try {
          let byName = await getNCHSAAResultsForProfile(supabase, name, gradYear)
          let byWrestling: Awaited<ReturnType<typeof getNCHSAAResultsForProfile>> = []
          if (wrestlingName && wrestlingName !== name) {
            byWrestling = await getNCHSAAResultsForProfile(supabase, wrestlingName, gradYear)
          }
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
    ])
    const nchsaa_profile = nchsaaMergedRows.map((r) => ({
      year: r.year,
      place: r.place,
      classification: r.classification,
      weight_class: r.weight_class,
    }))
    const nationalTeamFromRow = getNationalTeamResults(athlete)
    let national_team_results = mergeNationalTeamResults(nationalTeamFromTables, nationalTeamFromRow)

    // 2026 NHSCA Duals: if athlete is on the roster (national_team_event_registrations), show as Member with record (or 0-0 until set in admin)
    const nhsca2026 = await getNhscaDuals2026RosterStatus(supabase, id.trim(), {
      name,
      highSchool,
      gradYear,
    })
    if (nhsca2026.member) {
      const has2026 = national_team_results.some((r) => r.event === "NHSCA Duals" && r.year === 2026)
      if (!has2026) {
        const isPlaceholder = !nhsca2026.record || nhsca2026.record === "0-0"
        national_team_results = [
          { event: "NHSCA Duals", year: 2026, record: nhsca2026.record || "0-0", isPlaceholder },
          ...national_team_results,
        ]
      }
    }

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
      nameVariantCount: namesToTry.length,
      nhscaResultRows: nhscaMerged.length,
      nchsaaProfileRows: nchsaa_profile.length,
      super32FromTable: super32FromTable.length,
      nationalTeamMerged: national_team_results.length,
      nhscaDuals2026Member: nhsca2026.member,
    })

    return NextResponse.json({ ok: true, athlete: athleteWithTournaments })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[RecruitNC] GET /api/athlete/[id] exception", { message, elapsed: Date.now() - start })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
