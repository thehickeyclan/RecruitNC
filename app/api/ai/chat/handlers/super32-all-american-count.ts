import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleSuper32AllAmericanCount: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const year = params.year
  const gender = params.gender // 'M' for Men, 'F' for Women, null for both

  // Query Super32 All-Americans count by year
  let query = adminClient
    .from("super32_results")
    .select("year, placement, gender")
    .gte("placement", 1)
    .lte("placement", 8)

  // Filter by gender if specified
  if (gender === 'M' || gender === 'F') {
    query = query.eq("gender", gender)
  }

  if (year) {
    query = query.eq("year", year)
  }

  const { data: super32Data, error: super32Error } = await query
    .order("year", { ascending: false })
    .limit(10000)

  if (super32Error) {
    console.error("[Handler] super32_all_american_count error:", super32Error)
    throw super32Error
  }

  // Aggregate by year
  const yearCounts: Record<number, { total: number; champions: number }> = {}
  
  ;(super32Data || []).forEach((record: any) => {
    const y = record.year
    if (!yearCounts[y]) {
      yearCounts[y] = { total: 0, champions: 0 }
    }
    yearCounts[y].total++
    if (record.placement === 1) {
      yearCounts[y].champions++
    }
  })

  const results = Object.entries(yearCounts)
    .map(([y, counts]) => ({
      year: parseInt(y),
      total_all_americans: counts.total,
      champions: counts.champions,
    }))
    .sort((a, b) => b.year - a.year)

  console.log(`[Handler] super32_all_american_count: Found ${results.length} years with Super32 All-Americans`)

  const aggregateResult = year
    ? results.find((r) => r.year === year)
    : results

  return {
    results,
    aggregateResult: aggregateResult 
      ? { ...aggregateResult, type: "super32_all_american_count", gender: gender || null }
      : { type: "super32_all_american_count", gender: gender || null, results },
  }
}
