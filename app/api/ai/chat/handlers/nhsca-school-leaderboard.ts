import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleNhscaSchoolLeaderboard: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const school = params.school

  if (school) {
    // Count All-American achievements for a specific school (not unique athletes)
    const { data, error } = await adminClient
      .from("wrestling_nhsca_results")
      .select("id")
      .ilike("high_school", `%${school}%`)
      .gte("placement", 1)
      .lte("placement", 8)
      .not("high_school", "is", null)
      .neq("high_school", "")
      .not("high_school", "ilike", "unknown")
      .limit(100000)

    if (error) {
      console.error("[Handler] nhsca_school_leaderboard error:", error)
      throw error
    }

    // Count all All-American achievements (each placement = 1 achievement)
    return {
      aggregateResult: {
        school,
        count: (data || []).length,
        type: "nhsca_school_leaderboard",
      },
    }
  } else {
    // Leaderboard: All schools with All-American achievement counts
    const { data, error } = await adminClient
      .from("wrestling_nhsca_results")
      .select("high_school")
      .gte("placement", 1)
      .lte("placement", 8)
      .not("high_school", "is", null)
      .neq("high_school", "")
      .not("high_school", "ilike", "unknown")
      .limit(100000)

    if (error) {
      console.error("[Handler] nhsca_school_leaderboard error:", error)
      throw error
    }

    // Group by school and count all achievements (each record = 1 achievement)
    const bySchool: Record<string, number> = {}
    data?.forEach((r: any) => {
      if (!bySchool[r.high_school]) {
        bySchool[r.high_school] = 0
      }
      bySchool[r.high_school]++
    })

    const schoolCounts = Object.entries(bySchool)
      .map(([school, count]) => ({
        school,
        count,
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending

    return {
      aggregateResult: {
        schoolCounts,
        type: "nhsca_school_leaderboard",
      },
    }
  }
}

