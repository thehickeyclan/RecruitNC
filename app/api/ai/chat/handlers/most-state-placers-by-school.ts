import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleMostStatePlacersBySchool: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()

  // Query all state placers (place 1-6)
  const { data, error } = await adminClient
    .from("wrestling_nchsaa_results")
    .select("school, wrestler_name")
    .gte("place", 1)
    .lte("place", 6)
    .not("school", "is", null)
    .neq("school", "")
    .not("school", "ilike", "unknown")
    .not("wrestler_name", "is", null)
    .neq("wrestler_name", "")
    .limit(100000)

  if (error) {
    console.error("[Handler] most_state_placers_by_school error:", error)
    throw error
  }

  // Group by school and count unique wrestlers
  const bySchool: Record<string, Set<string>> = {}
  data?.forEach((r: any) => {
    if (!bySchool[r.school]) {
      bySchool[r.school] = new Set()
    }
    bySchool[r.school].add(r.wrestler_name)
  })

  const schoolCounts = Object.entries(bySchool)
    .map(([school, names]) => ({
      school,
      count: names.size,
      totalPlacements: data?.filter((r: any) => r.school === school).length || 0,
    }))
    .sort((a, b) => {
      // Sort by unique wrestler count first, then by total placements
      if (b.count !== a.count) {
        return b.count - a.count
      }
      return b.totalPlacements - a.totalPlacements
    })

  return {
    aggregateResult: {
      schoolCounts,
      type: "most_state_placers_by_school",
    },
  }
}

