import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleNhscaAllAmericanCount: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const year = params.year
  
  // Determine gender filter from query or params
  const query = (params.query || params.search || "").toLowerCase()
  const genderFilter = params.gender || 
    (query.includes("women") || query.includes("woman") || query.includes("girls") || query.includes("girl") ? "F" :
     query.includes("men") || query.includes("man") || query.includes("boys") || query.includes("boy") ? "M" : null)
  
  // Build query
  let dbQuery = adminClient
    .from("wrestling_nhsca_results")
    .gte("placement", 1)
    .lte("placement", 8)
    .not("high_school", "is", null)
    .neq("high_school", "")
    .not("high_school", "ilike", "unknown")
    .not("athlete_name", "is", null)
    .neq("athlete_name", "")
  
  // Apply gender filter
  if (genderFilter === "M") {
    // Men only - exclude girls divisions
    dbQuery = dbQuery
      .not("division", "ilike", "%girl%")
      .not("division", "ilike", "%women%")
  } else if (genderFilter === "F") {
    // Women only - only girls divisions
    dbQuery = dbQuery
      .or("division.ilike.%girl%,division.ilike.%women%")
  }
  // If genderFilter is null, include both (no filter)

  if (year) {
    // Count unique athletes for specific year
    const { data, error } = await dbQuery
      .select("athlete_name")
      .eq("year", year)
      .limit(100000)

    if (error) {
      console.error("[Handler] nhsca_all_american_count error:", error)
      throw error
    }

    // No state filter needed - this is a North Carolina-only resource
    // Count unique athletes
    const uniqueAthletes = new Set((data || []).map((r: any) => r.athlete_name))

    return {
      aggregateResult: {
        year,
        count: uniqueAthletes.size,
        gender: genderFilter || "all",
        type: "nhsca_all_american_count",
      },
    }
  } else {
    // Count by year (all years)
    // If no gender specified, get both men's and women's data separately
    if (!genderFilter) {
      // Get men's data
      const { data: menData, error: menError } = await adminClient
        .from("wrestling_nhsca_results")
        .select("year, athlete_name, placement")
        .gte("placement", 1)
        .lte("placement", 8)
        .not("high_school", "is", null)
        .neq("high_school", "")
        .not("high_school", "ilike", "unknown")
        .not("athlete_name", "is", null)
        .neq("athlete_name", "")
        .not("division", "ilike", "%girl%")
        .not("division", "ilike", "%women%")
        .order("year", { ascending: false })
        .limit(100000)
      
      // Get women's data
      const { data: womenData, error: womenError } = await adminClient
        .from("wrestling_nhsca_results")
        .select("year, athlete_name, placement")
        .gte("placement", 1)
        .lte("placement", 8)
        .not("high_school", "is", null)
        .neq("high_school", "")
        .not("high_school", "ilike", "unknown")
        .not("athlete_name", "is", null)
        .neq("athlete_name", "")
        .or("division.ilike.%girl%,division.ilike.%women%")
        .order("year", { ascending: false })
        .limit(100000)
      
      if (menError || womenError) {
        console.error("[Handler] nhsca_all_american_count error:", menError || womenError)
        throw menError || womenError
      }
      
      // Group men's data by year
      const menByYear: Record<number, Set<string>> = {}
      menData?.forEach((r: any) => {
        if (!menByYear[r.year]) {
          menByYear[r.year] = new Set()
        }
        menByYear[r.year].add(r.athlete_name)
      })
      
      // Group women's data by year
      const womenByYear: Record<number, Set<string>> = {}
      womenData?.forEach((r: any) => {
        if (!womenByYear[r.year]) {
          womenByYear[r.year] = new Set()
        }
        womenByYear[r.year].add(r.athlete_name)
      })
      
      // Combine all years
      const allYears = new Set([...Object.keys(menByYear).map(Number), ...Object.keys(womenByYear).map(Number)])
      
      const yearCounts = Array.from(allYears).map((y) => {
        const menCount = menByYear[y]?.size || 0
        const womenCount = womenByYear[y]?.size || 0
        return {
          year: y,
          count: menCount + womenCount,
          menCount,
          womenCount,
        }
      }).sort((a, b) => b.year - a.year)
      
      // Find best year for men, women, and combined
      const bestMen = yearCounts.length > 0 
        ? yearCounts.reduce((best, current) => current.menCount > best.menCount ? current : best)
        : null
      const bestWomen = yearCounts.length > 0 
        ? yearCounts.reduce((best, current) => current.womenCount > best.womenCount ? current : best)
        : null
      const bestCombined = yearCounts.length > 0 
        ? yearCounts.reduce((best, current) => current.count > best.count ? current : best)
        : null
      
      return {
        aggregateResult: {
          yearCounts,
          bestYear: bestCombined?.year || null,
          count: bestCombined?.count || 0,
          bestMenYear: bestMen?.year || null,
          menCount: bestMen?.menCount || 0,
          bestWomenYear: bestWomen?.year || null,
          womenCount: bestWomen?.womenCount || 0,
          gender: "all",
          type: "nhsca_all_american_count",
        },
      }
    } else {
      // Gender specified - use existing logic
      const { data, error } = await dbQuery
        .select("year, athlete_name, placement")
        .order("year", { ascending: false })
        .limit(100000)

      if (error) {
        console.error("[Handler] nhsca_all_american_count error:", error)
        throw error
      }

      // No state filter needed - this is a North Carolina-only resource
      // Group by year and count unique athletes
      const byYear: Record<number, Set<string>> = {}
      data?.forEach((r: any) => {
        if (!byYear[r.year]) {
          byYear[r.year] = new Set()
        }
        byYear[r.year].add(r.athlete_name)
      })

      const yearCounts = Object.entries(byYear)
        .map(([y, names]) => ({
          year: parseInt(y),
          count: names.size,
        }))
        .sort((a, b) => b.year - a.year)

      // Find the year with the most All-Americans
      const bestYear = yearCounts.length > 0 
        ? yearCounts.reduce((best, current) => current.count > best.count ? current : best)
        : null

      return {
        aggregateResult: {
          yearCounts,
          bestYear: bestYear?.year || null,
          count: bestYear?.count || 0,
          gender: genderFilter,
          type: "nhsca_all_american_count",
        },
      }
    }
  }
}

