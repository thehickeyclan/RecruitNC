import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteName = searchParams.get("name") || ""

    console.log("[v0] Wrestling achievements API called with name:", athleteName)

    if (!athleteName) {
      return NextResponse.json(
        {
          success: false,
          error: "Athlete name is required",
        },
        { status: 400 },
      )
    }

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    const getNameVariations = (name: string): string[] => {
      const variations = [name]

      // Handle "Last, First" format -> "First Last"
      if (name.includes(",")) {
        const [last, first] = name.split(",").map((s) => s.trim())
        variations.push(`${first} ${last}`)
      }
      // Handle "First Last" format -> "Last, First"
      else {
        const parts = name.trim().split(/\s+/)
        if (parts.length >= 2) {
          const first = parts[0]
          const last = parts.slice(1).join(" ")
          variations.push(`${last}, ${first}`)
        }
      }

      return variations
    }

    const nameVariations = getNameVariations(athleteName)
    console.log("[v0] Searching with name variations:", nameVariations)

    console.log("[v0] Querying NCHSAA results for:", athleteName)

    let nchsaaResults: any[] = []
    let nchsaaError = null

    for (const nameVariation of nameVariations) {
      console.log("[v0] Trying NCHSAA query with name variation:", nameVariation)
      const { data, error } = await supabase
        .from("wrestling_nchsaa_results")
        .select("*")
        .ilike("wrestler_name", `%${nameVariation}%`)
        .order("year", { ascending: false })

      console.log("[v0] NCHSAA query result for", nameVariation, ":", {
        found: data?.length || 0,
        error: error?.message,
        sampleNames: data?.slice(0, 3).map((r) => r.wrestler_name),
      })

      if (error) {
        nchsaaError = error
        break
      }

      if (data && data.length > 0) {
        nchsaaResults = data
        console.log("[v0] Found NCHSAA results with name variation:", nameVariation)
        console.log("[v0] Full results:", JSON.stringify(data, null, 2))
        break
      }
    }

    console.log("[v0] NCHSAA query result:", {
      resultsCount: nchsaaResults?.length || 0,
      error: nchsaaError,
      sampleResult: nchsaaResults?.[0] || null,
    })

    if (nchsaaError) {
      console.error("[v0] NCHSAA query error:", nchsaaError)
      throw nchsaaError
    }

    console.log("[v0] Querying NHSCA results for:", athleteName)

    let nhscaResults: any[] = []
    let nhscaError = null

    // Try each name variation until we find results
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
