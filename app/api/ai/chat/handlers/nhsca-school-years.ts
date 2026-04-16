import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleNhscaSchoolYears: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const school = params.school

  if (!school) {
    throw new Error("School parameter required")
  }

  const { data, error } = await adminClient
    .from("wrestling_nhsca_results")
    .select("year, placement")
    .ilike("high_school", `%${school}%`)
    .gte("placement", 1)
    .lte("placement", 8)
    .not("high_school", "is", null)
    .neq("high_school", "")
    .not("high_school", "ilike", "unknown")
    .limit(100000)

  if (error) {
    console.error("[Handler] nhsca_school_years error:", error)
    throw error
  }

  // Get unique years
  const years = [...new Set((data || []).map((r: any) => r.year))].sort((a, b) => b - a)

  return {
    aggregateResult: {
      school,
      years,
      type: "nhsca_years_by_school",
    },
  }
}








