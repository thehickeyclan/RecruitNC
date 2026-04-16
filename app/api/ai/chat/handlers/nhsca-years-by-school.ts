import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleNhscaYearsBySchool: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const school = params.school

  if (!school) {
    throw new Error("nhsca_years_by_school requires school parameter")
  }

  // Query NHSCA All-Americans for the school
  const { data, error } = await adminClient
    .from("wrestling_nhsca_results")
    .select("year, athlete_name, placement")
    .ilike("high_school", `%${school}%`)
    .gte("placement", 1)
    .lte("placement", 8)
    .not("high_school", "is", null)
    .neq("high_school", "")
    .not("high_school", "ilike", "unknown")
    .not("athlete_name", "is", null)
    .neq("athlete_name", "")
    .limit(100000)

  if (error) {
    console.error("[Handler] nhsca_years_by_school error:", error)
    throw error
  }

  // Get unique years
  const years = [...new Set((data || []).map((r: any) => r.year))].sort((a, b) => b - a)
  
  // Count unique athletes
  const uniqueAthletes = new Set((data || []).map((r: any) => r.athlete_name))

  return {
    results: data || [],
    aggregateResult: {
      school,
      years,
      count: uniqueAthletes.size,
      totalPlacements: (data || []).length,
      type: "nhsca_years_by_school",
    },
  }
}

