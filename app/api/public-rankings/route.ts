import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { buildPublicProfileTournamentData } from "@/lib/public-profile-data"

async function getNCHSAAResults(supabase: any, athleteName: string, graduationYear: number) {
  if (!graduationYear || isNaN(graduationYear)) {
    return []
  }

  const currentYear = new Date().getFullYear()
  const yearsRemaining = graduationYear - currentYear

  // Determine how many years back to search based on class
  let yearsToSearch: number[]
  if (yearsRemaining >= 3) {
    // Class of 2028+ (freshmen/younger) - search 1 year back
    yearsToSearch = [currentYear]
  } else if (yearsRemaining === 2) {
    // Class of 2027 (sophomores) - search 2 years back
    yearsToSearch = [currentYear, currentYear - 1]
  } else if (yearsRemaining === 1) {
    yearsToSearch = [currentYear, currentYear - 1, currentYear - 2]
  } else {
    // Class of 2025 (seniors) or graduated - search 4 years back
    yearsToSearch = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]
  }

  const { data: results, error } = await supabase
    .from("wrestling_nchsaa_results")
    .select("*")
    .ilike("wrestler_name", `%${athleteName}%`)
    .in("year", yearsToSearch)
    .order("year", { ascending: false })

  return results || []
}

async function getNHSCAResultsFromTable(supabase: any, athleteName: string, graduationYear: number) {
  if (!graduationYear || isNaN(graduationYear) || !athleteName?.trim()) return []
  const { data: results } = await supabase
    .from("wrestling_nhsca_results")
    .select("*")
    .ilike("athlete_name", `%${athleteName}%`)
    .gte("year", graduationYear - 4)
    .lte("year", graduationYear)
    .order("year", { ascending: false })
  if (!results?.length) return []
  return results.map((r: any) => ({
    year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
    placement: String(r.placement ?? r.place ?? ""),
    record: (r.record ?? r.record_text ?? "").toString().trim(),
  }))
}

async function getSuper32ResultsFromTable(supabase: any, athleteName: string, graduationYear: number) {
  if (!graduationYear || isNaN(graduationYear) || !athleteName?.trim()) return []
  const { data: results } = await supabase
    .from("wrestling_super32_results")
    .select("*")
    .ilike("athlete_name", `%${athleteName}%`)
    .gte("year", graduationYear - 4)
    .lte("year", graduationYear)
    .order("year", { ascending: false })
  if (!results?.length) return []
  return results.map((r: any) => ({
    year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
    placement: String(r.placement ?? r.place ?? ""),
    record: (r.record ?? r.record_text ?? "").toString().trim(),
  }))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2026"
    const gender = searchParams.get("gender") || "Male"

    const supabase = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    console.log("[v0] Fetching public rankings for:", { year, gender })

    const { data: athletes, error } = await supabase
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
      .order("prospect_ranking", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching athletes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Found athletes:", athletes?.length || 0)

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({
        rankings: [],
        message: "No athletes found for the specified criteria",
      })
    }

    const rankings = []
    for (const athlete of athletes) {
      const athleteName = `${athlete.firstName} ${athlete.lastName}`

      const nchsaaResults = await getNCHSAAResults(supabase, athleteName, Number.parseInt(athlete.graduationyear, 10))

      let stateResults = []
      if (nchsaaResults.length > 0) {
        stateResults = nchsaaResults.map((result) => {
          const { year, place, classification } = result
          if (place === 1) {
            return { text: `${year} ${classification} State Champion`, placement: 1, year }
          } else if (place <= 8) {
            const ordinal = place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`
            return { text: `${year} ${classification} State ${ordinal}`, placement: place, year }
          } else {
            return { text: `${year} ${classification} State Qualifier`, placement: null, year }
          }
        })
      }

      stateResults.sort((a, b) => b.year - a.year)

      // Calculate state championship summary - check for 2x, 3x, or 4x state champion
      const stateChampionships = stateResults.filter((r) => r.placement === 1)
      const championshipCount = stateChampionships.length
      const stateChampionshipSummary = championshipCount >= 2 && championshipCount <= 4
        ? `${championshipCount}x State Champion`
        : stateResults.length > 0
        ? stateResults.map((r) => r.text).join(", ")
        : "No State Placement"

      // Primary: athlete row. Fallback: wrestling tables (2028 athletes often have data there)
      const { nhscaResults: nhscaForProfile, super32Results: super32ForProfile } =
        buildPublicProfileTournamentData(athlete)

      let nhscaToUse = nhscaForProfile
      if (nhscaToUse.length === 0) {
        nhscaToUse = await getNHSCAResultsFromTable(supabase, athleteName, Number.parseInt(athlete.graduationyear, 10))
      }
      let super32ToUse = super32ForProfile
      if (super32ToUse.length === 0) {
        super32ToUse = await getSuper32ResultsFromTable(supabase, athleteName, Number.parseInt(athlete.graduationyear, 10))
      }

      const toApiResult = (r: { year: number; placement: string; record: string }) => {
        const text = `${r.year}${r.placement ? ` ${r.placement}` : ""}${r.record ? ` (${r.record})` : ""}`.trim()
        const placement = r.placement === "Champion" ? 1 : parseInt(r.placement) || null
        return { text, placement, year: r.year }
      }
      const nhscaResults_processed = nhscaToUse.map(toApiResult)
      const super32Results = super32ToUse.map(toApiResult)

      const hasRankedWin = !!(
        athlete.nationally_ranked_wins &&
        typeof athlete.nationally_ranked_wins === "string" &&
        athlete.nationally_ranked_wins.trim() !== "" &&
        athlete.nationally_ranked_wins.toLowerCase() !== "none" &&
        athlete.nationally_ranked_wins !== "0"
      )

      rankings.push({
        id: athlete.id,
        name: athlete.wrestling_name || athleteName,
        graduationyear: athlete.graduationyear,
        gender: athlete.gender,
        highschool: athlete.highschool || "-",
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
      })
    }

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

    return NextResponse.json({
      rankings,
      metadata: {
        year,
        gender,
        total_count: rankings.length,
        last_updated: lastUpdated ? lastUpdated.toISOString() : null,
        update_post_url: updatePostUrl,
      },
    })
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
