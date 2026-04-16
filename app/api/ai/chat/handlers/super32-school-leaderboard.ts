import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleSuper32SchoolLeaderboard: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()

  // Query Super32 All-Americans grouped by school
  const { data: super32Data, error: super32Error } = await adminClient
    .from("super32_results")
    .select("high_school, school, placement, athlete_name, year")
    .gte("placement", 1)
    .lte("placement", 8)
    .not("high_school", "is", null)
    .neq("high_school", "")
    .not("athlete_name", "is", null)
    .neq("athlete_name", "")
    .limit(10000)

  if (super32Error) {
    console.error("[Handler] super32_school_leaderboard error:", super32Error)
    throw super32Error
  }

  // Aggregate by school
  const schoolStats: Record<string, {
    school: string
    total_all_americans: number
    champions: number
    athletes: Set<string>
    years: Set<number>
  }> = {}

  ;(super32Data || []).forEach((record: any) => {
    const school = (record.high_school || record.school || "").trim()
    if (!school) return

    if (!schoolStats[school]) {
      schoolStats[school] = {
        school,
        total_all_americans: 0,
        champions: 0,
        athletes: new Set(),
        years: new Set(),
      }
    }

    schoolStats[school].total_all_americans++
    if (record.placement === 1) {
      schoolStats[school].champions++
    }
    schoolStats[school].athletes.add(record.athlete_name)
    schoolStats[school].years.add(record.year)
  })

  // Convert to array and sort
  const results = Object.values(schoolStats)
    .map((stats) => ({
      school: stats.school,
      total_all_americans: stats.total_all_americans,
      champions: stats.champions,
      unique_athletes: stats.athletes.size,
      years: Array.from(stats.years).sort((a, b) => b - a),
    }))
    .sort((a, b) => {
      // Sort by total All-Americans (desc), then champions (desc)
      if (b.total_all_americans !== a.total_all_americans) {
        return b.total_all_americans - a.total_all_americans
      }
      return b.champions - a.champions
    })

  console.log(`[Handler] super32_school_leaderboard: Found ${results.length} schools with Super32 All-Americans`)

  return {
    results,
  }
}
