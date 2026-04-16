import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleStateChampionsBySchool: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const school = params.school

  if (!school) {
    throw new Error("state_champions_by_school requires school parameter")
  }

  // Query state champions (place = 1) for the school
  const { data, error } = await adminClient
    .from("wrestling_nchsaa_results")
    .select("wrestler_name, year, classification, weight_class, place")
    .eq("place", 1)
    .ilike("school", `%${school}%`)
    .not("school", "is", null)
    .neq("school", "")
    .not("school", "ilike", "unknown")
    .not("wrestler_name", "is", null)
    .neq("wrestler_name", "")
    .limit(100000)

  if (error) {
    console.error("[Handler] state_champions_by_school error:", error)
    throw error
  }

  // Count unique wrestlers
  const uniqueWrestlers = new Set((data || []).map((r: any) => r.wrestler_name))
  
  // Get unique years
  const years = [...new Set((data || []).map((r: any) => r.year))].sort((a, b) => b - a)

  return {
    results: data || [],
    aggregateResult: {
      school,
      count: uniqueWrestlers.size,
      totalChampionships: (data || []).length,
      years,
      type: "state_champions_by_school",
    },
  }
}

