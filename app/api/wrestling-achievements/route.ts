import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { getNCHSAAResultsForProfile } from "@/lib/nchsaa-results"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteName = searchParams.get("name") || ""

    if (!athleteName) {
      return NextResponse.json(
        { success: false, error: "Athlete name is required" },
        { status: 400 },
      )
    }

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: { get: () => null, set: () => {}, remove: () => {} },
    })

    const nchsaaResults = await getNCHSAAResultsForProfile(supabase, athleteName)

    const nameVariations = [athleteName]
    if (athleteName.includes(",")) {
      const [last, first] = athleteName.split(",").map((s) => s.trim())
      if (first && last) nameVariations.push(`${first} ${last}`)
    } else {
      const parts = athleteName.trim().split(/\s+/)
      if (parts.length >= 2) nameVariations.push(`${parts.slice(1).join(" ")}, ${parts[0]}`)
    }

    let nhscaResults: any[] = []
    let nhscaError = null
    for (const nameVariation of nameVariations) {
      const { data, error } = await supabase
        .from("wrestling_nhsca_results")
        .select("*")
        .ilike("athlete_name", `%${nameVariation}%`)
        .order("year", { ascending: false })

      if (error) {
        nhscaError = error
        break
      }

      if (data && data.length > 0) {
        nhscaResults = data
        console.log("[v0] Found NHSCA results with name variation:", nameVariation)
        break
      }
    }

    console.log("[v0] NHSCA query result:", {
      resultsCount: nhscaResults?.length || 0,
      error: nhscaError,
      sampleResult: nhscaResults?.[0] || null,
    })

    if (nhscaError) {
      console.error("[v0] NHSCA query error:", nhscaError)
      throw nhscaError
    }

    // Process and format achievements
    const achievements = {
      state_championships: nchsaaResults?.filter((r) => r.place === 1) || [],
      state_placers: nchsaaResults?.filter((r) => r.place && r.place <= 8) || [],
      national_placers: nhscaResults?.filter((r) => r.placement && r.placement <= 8) || [],
      all_results: {
        nchsaa: nchsaaResults || [],
        nhsca: nhscaResults || [],
        super32: [], // TODO: Add super32 table and query when available
      },
    }

    console.log("[v0] Processed achievements:", {
      state_championships: achievements.state_championships.length,
      state_placers: achievements.state_placers.length,
      national_placers: achievements.national_placers.length,
      total_nchsaa: achievements.all_results.nchsaa.length,
      total_nhsca: achievements.all_results.nhsca.length,
    })

    return NextResponse.json({
      success: true,
      athlete_name: athleteName,
      achievements,
      total_records: (nchsaaResults?.length || 0) + (nhscaResults?.length || 0),
    })
  } catch (error) {
    console.error("[v0] Wrestling achievements API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
