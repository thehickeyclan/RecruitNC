import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import {
  buildCommitmentCardHonorBadges,
} from "@/lib/commitment-card-honors"

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

    const highSchoolHint =
      (resolvedAthlete
        ? (resolvedAthlete.highschool ?? resolvedAthlete.highSchool ?? "").toString()
        : (searchParams.get("high_school") ?? searchParams.get("highschool") ?? "")
      ).trim() || undefined

    const gradYearNum = graduationYear && !isNaN(graduationYear) ? graduationYear : new Date().getFullYear()
    const athleteForMerge: Record<string, unknown> =
      resolvedAthlete ??
      ({
        name: athleteName,
        ...(wrestlingName ? { wrestling_name: wrestlingName } : {}),
        graduationyear: gradYearNum,
        highschool: highSchoolHint,
        nchsaa_results: athleteNchsaaJson,
      } as Record<string, unknown>)

    const { nchsaa: nchsaaResults, nhsca: nhscaMerged, super32: super32Merged } =
      await loadAthleteTournamentBundle(supabase, athleteForMerge)

    const nhscaResults = nhscaMerged.map((r) => ({
      year: r.year,
      placement: r.placement,
      record: r.record,
      weight: r.weight ?? "",
      division: r.division ?? "",
    }))

    const super32Results = super32Merged.map((r) => ({
      year: r.year,
      placement: r.placement,
      record: r.record,
      weight: r.weight,
      division: r.division,
    }))

    // Process and format achievements
    const nhscaWithPlacement =
      nhscaResults?.filter((r) => {
        const pl = String(r.placement ?? "").trim()
        if (!pl) return false
        if (/^seed\s+\d+$/i.test(pl)) return false
        return true
      }) || []
    const placeNum = (row: { place?: unknown }) => {
      const v = row?.place
      if (v == null || v === "") return NaN
      const n = Number(v)
      return Number.isNaN(n) ? NaN : n
    }
    const achievements = {
      state_championships: nchsaaResults?.filter((r) => placeNum(r) === 1) || [],
      state_placers: nchsaaResults?.filter((r) => {
        const n = placeNum(r)
        return !Number.isNaN(n) && n >= 2 && n <= 24
      }) || [],
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

    /** Full DB row → same honor rules as commitment card, merged with table-backed state rows (fixes list cards missing `additional_achievements` / `nchsaa_results`). */
    let commitment_card_honor_badges: string[] | undefined
    if (resolvedAthlete) {
      try {
        commitment_card_honor_badges = buildCommitmentCardHonorBadges({
          athlete: resolvedAthlete,
          nchsaaMergedRows: nchsaaResults,
          nhscaMergedRows: nhscaResults,
          super32MergedRows: super32Results,
        })
      } catch (e) {
        console.error("[RecruitNC] wrestling-achievements: commitment_card_honor_badges failed:", e)
      }
    }

    return NextResponse.json({
      success: true,
      athlete_name: athleteName,
      achievements,
      total_records: (nchsaaResults?.length || 0) + (nhscaResults?.length || 0) + super32Results.length,
      ...(commitment_card_honor_badges != null ? { commitment_card_honor_badges } : {}),
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
