import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleCombinedAllAmerican: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const year = params.year
  const startYear = params.startYear
  const endYear = params.endYear
  const wrestlerName = params.wrestler || params.name
  const gender = params.gender // 'M' for Men, 'F' for Women, null for both

  // Query both NHSCA and Super32 All-Americans
  const queries: Promise<any>[] = []

  // NHSCA All-Americans
  let nhscaQuery = adminClient
    .from("wrestling_nhsca_results")
    .select("athlete_name, placement, year, weight, high_school, division")
    .gte("placement", 1)
    .lte("placement", 8)
    .not("athlete_name", "is", null)
    .neq("athlete_name", "")

  // Handle year filtering: single year, year range, or all years
  if (startYear && endYear) {
    nhscaQuery = nhscaQuery.gte("year", startYear).lte("year", endYear)
  } else if (year) {
    nhscaQuery = nhscaQuery.eq("year", year)
  } else if (startYear) {
    nhscaQuery = nhscaQuery.gte("year", startYear)
  } else if (endYear) {
    nhscaQuery = nhscaQuery.lte("year", endYear)
  }

  if (wrestlerName) {
    nhscaQuery = nhscaQuery.or(`athlete_name.ilike.%${wrestlerName}%`)
  }

  queries.push(nhscaQuery.limit(10000))

  // Super32 All-Americans
  let super32Query = adminClient
    .from("super32_results")
    .select("athlete_name, placement, year, weight_class, high_school, school, gender")
    .gte("placement", 1)
    .lte("placement", 8)
    .not("athlete_name", "is", null)
    .neq("athlete_name", "")

  // Filter by gender if specified
  if (gender === 'M' || gender === 'F') {
    super32Query = super32Query.eq("gender", gender)
  }

  // Handle year filtering: single year, year range, or all years
  if (startYear && endYear) {
    super32Query = super32Query.gte("year", startYear).lte("year", endYear)
  } else if (year) {
    super32Query = super32Query.eq("year", year)
  } else if (startYear) {
    super32Query = super32Query.gte("year", startYear)
  } else if (endYear) {
    super32Query = super32Query.lte("year", endYear)
  }

  if (wrestlerName) {
    super32Query = super32Query.or(`athlete_name.ilike.%${wrestlerName}%`)
  }

  queries.push(super32Query.limit(10000))

  const [nhscaResult, super32Result] = await Promise.all(queries)

  const nhscaError = nhscaResult.error
  const super32Error = super32Result.error

  if (nhscaError) {
    console.error("[Handler] combined_all_american NHSCA error:", nhscaError)
  }

  if (super32Error) {
    console.error("[Handler] combined_all_american Super32 error:", super32Error)
  }

  // Combine results
  const nhscaResults = (nhscaResult.data || []).map((aa: any) => ({
    athlete_name: aa.athlete_name,
    placement: aa.placement,
    year: aa.year,
    weight: aa.weight || aa.weight_class,
    weight_class: aa.weight || aa.weight_class,
    high_school: aa.high_school,
    tournament: "NHSCA",
    division: aa.division,
    source: "nhsca",
  }))

  const super32Results = (super32Result.data || []).map((aa: any) => ({
    athlete_name: aa.athlete_name,
    placement: aa.placement,
    year: aa.year,
    weight: aa.weight_class,
    weight_class: aa.weight_class,
    high_school: aa.high_school || aa.school,
    gender: aa.gender,
    tournament: "Super32",
    division: null,
    source: "super32",
  }))

  const combinedResults = [...nhscaResults, ...super32Results].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    if (a.tournament !== b.tournament) {
      // Group by tournament (NHSCA first, then Super32)
      return a.tournament === "NHSCA" ? -1 : 1
    }
    if (a.placement !== b.placement) return a.placement - b.placement
    const aWeight = parseInt((a.weight || "").toString().replace(/lbs?/i, "")) || 0
    const bWeight = parseInt((b.weight || "").toString().replace(/lbs?/i, "")) || 0
    return aWeight - bWeight
  })

  // Build year description for logging
  let yearDesc = ""
  if (startYear && endYear) {
    yearDesc = ` for ${startYear}-${endYear}`
  } else if (year) {
    yearDesc = ` for ${year}`
  } else if (startYear) {
    yearDesc = ` from ${startYear} onwards`
  } else if (endYear) {
    yearDesc = ` up to ${endYear}`
  }

  console.log(`[Handler] combined_all_american: Found ${nhscaResults.length} NHSCA + ${super32Results.length} Super32 = ${combinedResults.length} total All-Americans${yearDesc}${wrestlerName ? ` for ${wrestlerName}` : ""}`)

  return {
    results: combinedResults,
  }
}
