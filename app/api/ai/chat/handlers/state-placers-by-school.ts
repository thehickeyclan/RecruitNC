import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleStatePlacersBySchool: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const school = params.school

  if (!school) {
    throw new Error("state_placers_by_school requires school parameter")
  }

  // Query state placers (place 1-6) for the school
  const { data, error } = await adminClient
    .from("wrestling_nchsaa_results")
    .select("wrestler_name, year, classification, weight_class, place")
    .gte("place", 1)
    .lte("place", 6)
    .ilike("school", `%${school}%`)
    .not("school", "is", null)
    .neq("school", "")
    .not("school", "ilike", "unknown")
    .not("wrestler_name", "is", null)
    .neq("wrestler_name", "")
    .limit(100000)

  if (error) {
    console.error("[Handler] state_placers_by_school error:", error)
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
      totalPlacements: (data || []).length,
      years,
      type: "state_placers_by_school",
    },
  }
}

