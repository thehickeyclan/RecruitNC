import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import {
  getNCHSAAResultsForProfile,
  mergeNchsaaResults,
  nchsaaJsonToProfileRows,
} from "@/lib/nchsaa-results"
import { getNHSCAForAthlete } from "@/lib/athlete-nhsca"
import { getNameVariants, getSuper32FromTable } from "@/lib/tournament-tables"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    let athleteName = (searchParams.get("name") || "").trim()
    let wrestlingName = (searchParams.get("wrestling_name") || "").trim()
    let graduationYearParam = searchParams.get("graduation_year")
    const athleteId = searchParams.get("athlete_id")?.trim()

    const supabase = createAdminClient()

    /** Optional JSON on `athletes` — fallback / gap-fill only. Canonical NCHSAA rows: `wrestling_nchsaa_results` (see docs/2026-STATE-QUALIFIERS-FOR-RECRUITNC.md). */
    let athleteNchsaaJson: unknown = undefined
    /** When set, NHSCA merges `nhsca_results` JSON (e.g. merged placements) with table lookup — Data Dawg / profiles need both. */
    let resolvedAthlete: Record<string, unknown> | null = null

    if (athleteId) {
      const { data: athlete } = await supabase.from("athletes").select("*").eq("id", athleteId).single()
      if (athlete) {
        resolvedAthlete = athlete as Record<string, unknown>
        athleteName = (athlete.name ?? "").toString().trim() || athleteName
        wrestlingName = (athlete.wrestling_name ?? "").toString().trim() || wrestlingName
        if (athlete.graduationyear != null) graduationYearParam = String(athlete.graduationyear)
        athleteNchsaaJson = (athlete as Record<string, unknown>).nchsaa_results
      }
    }

    const graduationYear = graduationYearParam ? parseInt(graduationYearParam, 10) : undefined

    if (!resolvedAthlete && graduationYear != null && !Number.isNaN(graduationYear) && athleteName) {
      const { data: byName } = await supabase
        .from("athletes")
        .select("*")
        .eq("graduationyear", graduationYear)
        .ilike("name", athleteName.trim())
        .limit(2)
      if (byName?.length === 1) {
        resolvedAthlete = byName[0] as Record<string, unknown>
      } else if (
        (!byName || byName.length === 0) &&
        wrestlingName &&
        wrestlingName.trim() !== athleteName.trim()
      ) {
        const { data: byWrestling } = await supabase
          .from("athletes")
          .select("*")
          .eq("graduationyear", graduationYear)
          .ilike("name", wrestlingName.trim())
          .limit(2)
        if (byWrestling?.length === 1) resolvedAthlete = byWrestling[0] as Record<string, unknown>
      }
    }

    if (!athleteName) {
      return NextResponse.json(
        { success: false, error: "Athlete name or athlete_id required" },
        { status: 400 },
      )
    }

    let byName: Awaited<ReturnType<typeof getNCHSAAResultsForProfile>> = []
    try {
      byName = await getNCHSAAResultsForProfile(supabase, athleteName, graduationYear)
    } catch (e) {
      console.warn(
        "[RecruitNC] wrestling-achievements: NCHSAA table query failed (by name); using athlete row JSON if present",
        e,
      )
    }

    let byWrestling: Awaited<ReturnType<typeof getNCHSAAResultsForProfile>> = []
    if (wrestlingName && wrestlingName !== athleteName) {
      try {
        byWrestling = await getNCHSAAResultsForProfile(supabase, wrestlingName, graduationYear)
      } catch (e) {
        console.warn(
          "[RecruitNC] wrestling-achievements: NCHSAA table query failed (wrestling name); using athlete row JSON if present",
          e,
        )
      }
    }

    const fromAthleteRow = nchsaaJsonToProfileRows(athleteNchsaaJson, athleteName)
    const nchsaaResults = mergeNchsaaResults(mergeNchsaaResults(byName, byWrestling), fromAthleteRow)

    const gradYearNum = graduationYear && !isNaN(graduationYear) ? graduationYear : new Date().getFullYear()
    const athleteForNhsca: Record<string, unknown> =
      resolvedAthlete ??
      ({
        name: athleteName,
        ...(wrestlingName ? { wrestling_name: wrestlingName } : {}),
        graduationyear: gradYearNum,
      } as Record<string, unknown>)

    const nhscaMerged = await getNHSCAForAthlete(supabase, athleteForNhsca)
    const nhscaResults = nhscaMerged.map((r) => ({
      year: r.year,
      placement: r.placement,
      record: r.record,
      weight: r.weight ?? "",
      division: r.division ?? "",
    }))

    const namesToTry = [...new Set([...getNameVariants(athleteName), ...(wrestlingName ? getNameVariants(wrestlingName) : [])])]

    const super32ByYear = new Map<number, { year: number; placement: string; record: string; weight?: string; division?: string }>()
    for (const searchName of namesToTry) {
      if (!searchName) continue
      const rows = await getSuper32FromTable(supabase, searchName, gradYearNum, {})
      for (const r of rows) {
        const y = typeof r.year === "number" ? r.year : parseInt(String(r.year), 10)
        if (!super32ByYear.has(y)) super32ByYear.set(y, { year: r.year, placement: r.placement, record: r.record, weight: r.weight, division: r.division })
      }
    }
    const super32Results = Array.from(super32ByYear.values()).sort((a, b) => b.year - a.year)

    // Process and format achievements
    const nhscaWithPlacement =
      nhscaResults?.filter((r) => {
        const pl = String(r.placement ?? "").trim()
        if (!pl) return false
        if (/^seed\s+\d+$/i.test(pl)) return false
        return true
      }) || []
    const achievements = {
      state_championships: nchsaaResults?.filter((r) => r.place === 1) || [],
      state_placers: nchsaaResults?.filter((r) => r.place && r.place <= 8) || [],
      /** Rows with a placement string (medal / place); record-only NHSCA rows are excluded here. */
      national_placers: nhscaWithPlacement,
      all_results: {
        nchsaa: nchsaaResults || [],
        nhsca: nhscaResults || [],
        super32: super32Results || [],
      },
    }

    console.log("[v0] Processed achievements:", {
      state_championships: achievements.state_championships.length,
      state_placers: achievements.state_placers.length,
      national_placers: achievements.national_placers.length,
      total_nchsaa: achievements.all_results.nchsaa.length,
      total_nhsca: achievements.all_results.nhsca.length,
      nhsca_with_placement: nhscaWithPlacement.length,
      total_super32: achievements.all_results.super32.length,
    })

    return NextResponse.json({
      success: true,
      athlete_name: athleteName,
      achievements,
      total_records: (nchsaaResults?.length || 0) + (nhscaResults?.length || 0) + super32Results.length,
    })
  } catch (error) {
    console.error("[v0] Wrestling achievements API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
