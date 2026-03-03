import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { getNCHSAAResultsForProfile, mergeNchsaaResults } from "@/lib/nchsaa-results"
import { getNameVariants, getNHSCAFromTables, getSuper32FromTable } from "@/lib/tournament-tables"

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

    const namesToTry = [...new Set([...getNameVariants(athleteName), ...(wrestlingName ? getNameVariants(wrestlingName) : [])])]

    let nhscaResults: Awaited<ReturnType<typeof getNHSCAFromTables>> = []
    const gradYearNum = graduationYear && !isNaN(graduationYear) ? graduationYear : new Date().getFullYear()
    const seenNhsca = new Set<string>()
    for (const searchName of namesToTry) {
      if (!searchName) continue
      const rows = await getNHSCAFromTables(supabase, searchName, gradYearNum)
      for (const r of rows) {
        const key = `${r.year}-${r.placement}-${r.weight ?? ""}-${r.division ?? ""}`
        if (!seenNhsca.has(key)) {
          seenNhsca.add(key)
          nhscaResults.push(r)
        }
      }
    }
    nhscaResults.sort((a, b) => (b.year as number) - (a.year as number))

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
    const achievements = {
      state_championships: nchsaaResults?.filter((r) => r.place === 1) || [],
      state_placers: nchsaaResults?.filter((r) => r.place && r.place <= 8) || [],
      national_placers: nhscaResults?.filter((r) => r.placement) || [],
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
