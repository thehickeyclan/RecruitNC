import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getNCHSAAResultsForProfile, mergeNchsaaResults } from "@/lib/nchsaa-results"

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
    const debug = searchParams.get("debug") === "1"

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

    // Single source of truth: same getNCHSAAResultsForProfile used by unified profile & wrestling-achievements API
    const athletesWithNchsaa = await Promise.all(
      (athletes || []).map(async (athlete) => {
        const gradYear = Number(athlete.graduationyear) || 0
        const byName = await getNCHSAAResultsForProfile(supabase, athlete.name || "", gradYear || undefined)
        const wrestlingName = (athlete.wrestling_name || "").trim()
        const byWrestling =
          wrestlingName && wrestlingName !== (athlete.name || "").trim()
            ? await getNCHSAAResultsForProfile(supabase, wrestlingName, gradYear || undefined)
            : []
        const nchsaa_results = mergeNchsaaResults(byName, byWrestling).map((r) => ({
          year: r.year,
          place: r.place,
          classification: r.classification,
          weight_class: r.weight_class,
          school: r.school,
        }))
        const debugInfo = debug
          ? {
              name: athlete.name || "",
              wrestling_name: wrestlingName || null,
              nchsaa_queries: [athlete.name || "", ...(wrestlingName && wrestlingName !== (athlete.name || "").trim() ? [wrestlingName] : [])],
              nchsaa_by_name_count: byName.length,
              nchsaa_by_wrestling_count: byWrestling.length,
              nchsaa_merged_count: nchsaa_results.length,
              nchsaa_years: [...new Set(nchsaa_results.map((r) => r.year))].sort((a, b) => b - a),
            }
          : undefined
        return { ...athlete, nchsaa_results, ...(debug && debugInfo ? { _debug: debugInfo } : {}) }
      }),
    )

    return NextResponse.json(
      {
        prospects: athletesWithNchsaa,
        year: year,
        gender: gender,
        ...(debug
          ? {
              _debug: {
                source:
                  "getNCHSAAResultsForProfile (lib/nchsaa-results.ts) — same as unified profile & /api/wrestling-achievements",
                table: "wrestling_nchsaa_results",
                total_athletes: athletesWithNchsaa.length,
                athletes_with_nchsaa: athletesWithNchsaa.filter((a) => a.nchsaa_results?.length > 0).length,
                per_athlete: athletesWithNchsaa.map((a) => (a as { _debug?: unknown })._debug).filter(Boolean),
              },
            }
          : {}),
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
