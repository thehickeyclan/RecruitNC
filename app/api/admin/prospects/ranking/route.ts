import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { filterNchsaaResultsForProfile } from "@/lib/nchsaa-results"

function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) return "st"
  if (j === 2 && k !== 12) return "nd"
  if (j === 3 && k !== 13) return "rd"
  return "th"
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2025"
    const gender = searchParams.get("gender") || "Male"

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    const { data: athletes, error } = await supabase
      .from("athletes")
      .select(`
        id, name, graduationyear, prospect_ranking, highschool, weightclass, 
        division, gender, academic_gpa, is_prospect, college, 
        achievements, commitmentdate, highSchoolLogoUrl, collegeLogoUrl, wrestling_name,
        recruiting_status, nationally_ranked_wins,
        nhsca_2024_placement, nhsca_2025_placement, nhsca_2024_record, nhsca_2025_record,
        super_32_2024_placement, super_32_2025_placement, super_32_2024_record, super_32_2025_record,
        additional_achievements
      `)
      .eq("graduationyear", Number.parseInt(year))
      .eq("gender", gender)
      .order("prospect_ranking", { ascending: true, nullsLast: true })
      .order("name", { ascending: true })

    if (error) {
      console.error("Athletes query error:", error)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    const { data: nchsaaResults, error: nchsaaError } = await supabase
      .from("wrestling_nchsaa_results")
      .select("wrestler_name, year, place, classification, weight_class, school")
      .order("year", { ascending: false })

    if (nchsaaError) {
      console.error("[v0] NCHSAA query error:", nchsaaError)
    }

    const nchsaa2026Count = nchsaaResults?.filter((r) => r.year === 2026).length ?? 0
    console.log("[v0] Total NCHSAA results found:", nchsaaResults?.length || 0)
    console.log("[v0] NCHSAA 2026 results:", nchsaa2026Count)
    console.log("[v0] Sample NCHSAA results:", nchsaaResults?.slice(0, 3))
    console.log("[v0] Total athletes found:", athletes?.length || 0)
    console.log(
      "[v0] Sample athlete names:",
      athletes?.slice(0, 3).map((a) => a.name),
    )

    // Use same NCHSAA matching as unified public profile: name variations + ilike-style, all years
    const athletesWithNchsaa =
      athletes?.map((athlete) => {
        const athleteNchsaaResults = filterNchsaaResultsForProfile(
          nchsaaResults || [],
          athlete.name || "",
          athlete.wrestling_name || undefined
        )

        if (athleteNchsaaResults.length > 0) {
          console.log(
            `[v0] Found ${athleteNchsaaResults.length} NCHSAA results for ${athlete.name}:`,
            athleteNchsaaResults,
          )
        }

        return {
          ...athlete,
          nchsaa_results: athleteNchsaaResults,
        }
      }) || []

    const athletesWithNchsaaData = athletesWithNchsaa.filter((a) => a.nchsaa_results && a.nchsaa_results.length > 0)
    console.log(`[v0] Athletes with NCHSAA data: ${athletesWithNchsaaData.length}/${athletesWithNchsaa.length}`)

    return NextResponse.json(
      {
        prospects: athletesWithNchsaa,
        year: year,
        gender: gender,
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { rankings, year, gender } = await request.json()

    if (!rankings || !Array.isArray(rankings)) {
      return NextResponse.json({ error: "Invalid rankings data" }, { status: 400 })
    }

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    const updates = rankings.map(({ id, prospect_ranking }) =>
      supabase.from("athletes").update({ prospect_ranking }).eq("id", id).eq("gender", gender),
    )

    const results = await Promise.all(updates)

    const errors = results.filter((result) => result.error)
    if (errors.length > 0) {
      console.error("Update errors:", errors)
      return NextResponse.json({ error: "Failed to update some rankings" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated: rankings.length,
      year: year,
      gender: gender,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
