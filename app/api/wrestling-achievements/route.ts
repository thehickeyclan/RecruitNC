import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { escapeForIlike, getNCHSAAResultsForProfile, mergeNchsaaResults } from "@/lib/nchsaa-results"
import { getSuper32FromTable } from "@/lib/tournament-tables"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteName = (searchParams.get("name") || "").trim()
    const wrestlingName = (searchParams.get("wrestling_name") || "").trim()
    const graduationYearParam = searchParams.get("graduation_year")
    const graduationYear = graduationYearParam ? parseInt(graduationYearParam, 10) : undefined

    if (!athleteName) {
      return NextResponse.json(
        { success: false, error: "Athlete name is required" },
        { status: 400 },
      )
    }

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: { get: () => null, set: () => {}, remove: () => {} },
    })

    const byName = await getNCHSAAResultsForProfile(supabase, athleteName, graduationYear)
    const byWrestling =
      wrestlingName && wrestlingName !== athleteName
        ? await getNCHSAAResultsForProfile(supabase, wrestlingName, graduationYear)
        : []
    const nchsaaResults = mergeNchsaaResults(byName, byWrestling)

    const nameVariations = [athleteName]
    const noApostrophe = athleteName.replace(/'/g, "").trim()
    if (noApostrophe && noApostrophe !== athleteName) nameVariations.push(noApostrophe)
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
      const pattern = `%${escapeForIlike(nameVariation)}%`
      const { data, error } = await supabase
        .from("wrestling_nhsca_results")
        .select("*")
        .ilike("athlete_name", pattern)
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

    const gradYearNum = graduationYear && !isNaN(graduationYear) ? graduationYear : new Date().getFullYear()
    const super32Rows = await getSuper32FromTable(supabase, athleteName, gradYearNum, {})
    const super32Results = super32Rows.map((r) => ({
      year: r.year,
      placement: r.placement,
      record: r.record,
      weight: r.weight,
      division: r.division,
    }))

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
        super32: super32Results || [],
      },
    }

    console.log("[v0] Processed achievements:", {
      state_championships: achievements.state_championships.length,
      state_placers: achievements.state_placers.length,
      national_placers: achievements.national_placers.length,
      total_nchsaa: achievements.all_results.nchsaa.length,
      total_nhsca: achievements.all_results.nhsca.length,
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
        error: error.message,
      },
      { status: 500 },
    )
  }
}
