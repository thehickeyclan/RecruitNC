import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { buildSchoolClassificationMap } from "@/lib/classification-data"
import { buildPublicProfileTournamentData } from "@/lib/public-profile-data"
import { getNHSCAFromTables, getSuper32FromTable } from "@/lib/tournament-tables"

async function getNCHSAAResults(supabase: any, athleteName: string, graduationYear: number) {
  if (!graduationYear || isNaN(graduationYear)) {
    return []
  }

  const currentYear = new Date().getFullYear()
  const yearsRemaining = graduationYear - currentYear

  // Use athlete's full high-school window (gradYear-4 .. gradYear) for seniors/graduated so we show all 4 years.
  // Underclassmen: only search years that could already have results (no future years).
  let yearsToSearch: number[]
  if (yearsRemaining >= 3) {
    yearsToSearch = [currentYear]
  } else if (yearsRemaining === 2) {
    yearsToSearch = [currentYear, currentYear - 1]
  } else if (yearsRemaining === 1) {
    yearsToSearch = [currentYear, currentYear - 1, currentYear - 2]
  } else {
    const minY = Math.max(1990, graduationYear - 4)
    const maxY = Math.min(graduationYear, currentYear)
    yearsToSearch = []
    for (let y = minY; y <= maxY; y++) yearsToSearch.push(y)
  }

  const { data: results, error } = await supabase
    .from("wrestling_nchsaa_results")
    .select("*")
    .ilike("wrestler_name", `%${athleteName}%`)
    .in("year", yearsToSearch)
    .order("year", { ascending: false })

  return results || []
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2026"
    const gender = searchParams.get("gender") || "Male"

    const yearNum = parseInt(String(year), 10)
    // Public /public-rankings pages: cap how many ranked athletes we return (reduces payload + enrichment work).
    const maxPublicRank =
      yearNum === 2026 || yearNum === 2027 ? 30 : yearNum === 2028 ? 25 : null

    const supabase = createAdminClient()

    console.log("[v0] Fetching public rankings for:", { year, gender, maxPublicRank })

    let rankingsQuery = supabase
      .from("athletes")
      .select(`
        id,
        firstName,
        lastName,
        graduationyear,
        gender,
        highschool,
        weightclass,
        prospect_ranking,
        academic_gpa,
        wrestling_name,
        photourl,
        headshot_url,
        nhsca_2024_record,
        nhsca_2024_placement,
        nhsca_2025_record,
        nhsca_2025_placement,
        super_32_2023_record,
        super_32_2023_placement,
        super_32_2024_record,
        super_32_2024_placement,
        super_32_2025_record,
        super_32_2025_placement,
        nationally_ranked_wins,
        recruiting_status,
        college,
        updated_at
      `)
      .eq("graduationyear", year)
      .eq("gender", gender)
      .not("prospect_ranking", "is", null)

    if (maxPublicRank != null) {
      rankingsQuery = rankingsQuery.lte("prospect_ranking", maxPublicRank)
    }

    const { data: athletes, error } = await rankingsQuery.order("prospect_ranking", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching athletes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Found athletes:", athletes?.length || 0)

    const gradYearForLinkQuery = Number.isFinite(yearNum) ? yearNum : year

    const { data: allForYear } = await supabase
      .from("athletes")
      .select("id, name, firstname, lastname, wrestling_name, highschool")
      .eq("graduationyear", gradYearForLinkQuery)

    const linkResolution = (allForYear || []).map((a: Record<string, unknown>) => {
      const raw =
        (a.name as string)?.trim() ||
        (a.wrestling_name as string)?.trim() ||
        [a.firstName ?? a.firstname, a.lastName ?? a.lastname].filter(Boolean).join(" ").trim() ||
        ""
      const name = String(raw).replace(/\s+/g, " ").trim()
      return {
        id: a.id as string,
        name,
        highschool: (a.highschool as string) || "",
      }
    })

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({
        rankings: [],
        linkResolution,
        metadata: { year, gender, total_count: 0, last_updated: null, update_post_url: null },
      })
    }

    const schoolNames = [...new Set((athletes as { highschool?: string }[]).map((a) => a.highschool).filter(Boolean))] as string[]
    const divisionMap = await buildSchoolClassificationMap(supabase, schoolNames)

    const gradYearNum = Number.isFinite(yearNum) ? yearNum : parseInt(String(year), 10) || 0
    const rankings = await Promise.all(
      athletes.map(async (athlete) => {
        const athleteName = `${athlete.firstName} ${athlete.lastName}`

        const [nchsaaResults, nhscaToUse, super32ToUse] = await Promise.all([
          getNCHSAAResults(supabase, athleteName, Number.parseInt(athlete.graduationyear, 10)),
          getNHSCAFromTables(supabase, athleteName, gradYearNum),
          getSuper32FromTable(supabase, athleteName, gradYearNum),
        ])

        let nhscaFinal = nhscaToUse
        let super32Final = super32ToUse
        if (nhscaFinal.length === 0 || super32Final.length === 0) {
          const fromAthlete = buildPublicProfileTournamentData(athlete)
          if (nhscaFinal.length === 0) nhscaFinal = fromAthlete.nhscaResults
          if (super32Final.length === 0) super32Final = fromAthlete.super32Results
        }

        let stateResults = nchsaaResults.map((result: { year: number; place: number; classification?: string }) => {
          const { year: y, place, classification } = result
          if (place === 1) return { text: `${y} ${classification || ""} State Champion`, placement: 1, year: y }
          if (place <= 8) {
            const ordinal = place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`
            return { text: `${y} ${classification || ""} State ${ordinal}`, placement: place, year: y }
          }
          return { text: `${y} ${classification || ""} State Qualifier`, placement: null, year: y }
        })
        stateResults.sort((a, b) => b.year - a.year)

        const stateChampionships = stateResults.filter((r) => r.placement === 1)
        const championshipCount = stateChampionships.length
        const stateChampionshipSummary =
          championshipCount >= 2 && championshipCount <= 4
            ? `${championshipCount}x State Champion`
            : stateResults.length > 0
              ? stateResults.map((r) => r.text).join(", ")
              : "No State Placement"

        const toApiResult = (r: { year: number; placement: string; record: string }) => {
          const text = `${r.year}${r.placement ? ` ${r.placement}` : ""}${r.record ? ` (${r.record})` : ""}`.trim()
          const placement = r.placement === "Champion" ? 1 : parseInt(r.placement) || null
          return { text, placement, year: r.year }
        }
        const nhscaResults_processed = nhscaFinal.map(toApiResult)
        const super32Results = super32Final.map(toApiResult)

        const hasRankedWin = !!(
          athlete.nationally_ranked_wins &&
          typeof athlete.nationally_ranked_wins === "string" &&
          athlete.nationally_ranked_wins.trim() !== "" &&
          athlete.nationally_ranked_wins.toLowerCase() !== "none" &&
          athlete.nationally_ranked_wins !== "0"
        )

        return {
          id: athlete.id,
          name: athlete.wrestling_name || athleteName,
          graduationyear: athlete.graduationyear,
          gender: athlete.gender,
          highschool: athlete.highschool || "-",
          high_school_division: divisionMap[(athlete.highschool || "").trim()] ?? null,
          weight_display: athlete.weightclass ? `${athlete.weightclass} lbs` : "TBD",
          prospect_ranking: athlete.prospect_ranking,
          academic_gpa: athlete.academic_gpa,
          photourl: athlete.photourl || athlete.headshot_url,
          has_ranked_win: hasRankedWin,
          nationally_ranked_wins: athlete.nationally_ranked_wins,
          recruiting_status: athlete.recruiting_status,
          college: athlete.college,
          nhsca_results: nhscaResults_processed,
          nhsca_record_display:
            nhscaResults_processed.length > 0 ? nhscaResults_processed.map((r) => r.text).join(", ") : "No Record",
          super_32_results: super32Results,
          super_32_record_display: super32Results.length > 0 ? super32Results.map((r) => r.text).join(", ") : "No Record",
          state_results: stateResults,
          state_championship_summary: stateChampionshipSummary,
        }
      }),
    )

    // Calculate the most recent updated_at timestamp from all athletes
    const lastUpdated = athletes && athletes.length > 0
      ? athletes.reduce((latest, athlete) => {
          if (!athlete.updated_at) return latest
          const athleteDate = new Date(athlete.updated_at)
          return !latest || athleteDate > latest ? athleteDate : latest
        }, null as Date | null)
      : null

    // Generate update post URL based on date and year
    // Format: /rankings/updates?year=2026&date=2025-01-15
    const updatePostUrl = lastUpdated
      ? `/rankings/updates?year=${year}&date=${lastUpdated.toISOString().split("T")[0]}`
      : null

    const res = NextResponse.json({
      rankings,
      linkResolution,
      metadata: {
        year,
        gender,
        total_count: rankings.length,
        last_updated: lastUpdated ? lastUpdated.toISOString() : null,
        update_post_url: updatePostUrl,
      },
    })
    res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300")
    return res
  } catch (error) {
    console.error("[v0] Public rankings API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
