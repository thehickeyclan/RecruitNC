import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

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
        is_nc_athlete
      `)
      .eq("graduationyear", year)
      .eq("gender", gender)
      .eq("is_nc_athlete", true)
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

      const nhscaResults_processed = []

      const nhscaFields = [
        { year: 2025, record: athlete.nhsca_2025_record, placement: athlete.nhsca_2025_placement },
        { year: 2024, record: athlete.nhsca_2024_record, placement: athlete.nhsca_2024_placement },
      ]

      for (const field of nhscaFields) {
        if (field.placement || field.record) {
          let resultText = `${field.year}`
          let placement = null

          if (field.placement) {
            const place = Number.parseInt(field.placement)
            if (!isNaN(place)) {
              placement = place
              if (place === 1) {
                resultText += " Champion"
              } else if (place <= 8) {
                const ordinal = place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`
                resultText += ` ${ordinal} All-American`
              } else {
                resultText += ` ${place}th Place`
              }
            } else {
              resultText += ` ${field.placement}`
            }
          }

          if (field.record) {
            resultText += ` (${field.record})`
          }

          nhscaResults_processed.push({
            text: resultText,
            placement: placement,
            year: field.year,
          })
        }
      }

      const super32Results = []
      const super32Fields = [
        { year: 2025, record: athlete.super_32_2025_record, placement: athlete.super_32_2025_placement },
        { year: 2024, record: athlete.super_32_2024_record, placement: athlete.super_32_2024_placement },
        { year: 2023, record: athlete.super_32_2023_record, placement: athlete.super_32_2023_placement },
      ]

      for (const field of super32Fields) {
        if (field.placement || field.record) {
          let resultText = `${field.year}`
          let placement = null

          if (field.placement) {
            const place = Number.parseInt(field.placement)
            if (!isNaN(place)) {
              placement = place
              if (place === 1) {
                resultText += " Champion"
              } else if (place <= 8) {
                const ordinal = place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`
                resultText += ` ${ordinal} Place`
              } else {
                resultText += ` ${place}th Place`
              }
            } else {
              resultText += ` ${field.placement}`
            }
          }

          if (field.record) {
            resultText += ` (${field.record})`
          }

          super32Results.push({
            text: resultText,
            placement: placement,
            year: field.year,
          })
        }
      }

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
        state_championship_summary:
          stateResults.length > 0 ? stateResults.map((r) => r.text).join(", ") : "No State Placement",
      })
    }

    return NextResponse.json({
      rankings,
      metadata: {
        year,
        gender,
        total_count: rankings.length,
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
