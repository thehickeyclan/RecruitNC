import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleStateSchoolStats: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const school = params.school
  const queryType = params.queryType || "champions" // "champions", "placers", "most_champions", "most_placers", "years_champions", "years_placers"

  if (queryType === "most_champions" || queryType === "most_placers") {
    // Return leaderboard of schools
    const isChampions = queryType === "most_champions"
    let query = adminClient
      .from("wrestling_nchsaa_results")
      .select("school, wrestler_name, place, year")
      .not("school", "is", null)
      .neq("school", "")
      .not("school", "ilike", "unknown")
      .not("wrestler_name", "is", null)
      .neq("wrestler_name", "")
    
    if (isChampions) {
      query = query.eq("place", 1)
    } else {
      // For placers, place >= 1 and <= 6
      query = query.gte("place", 1).lte("place", 6)
    }
    
    const { data, error } = await query.limit(100000)

    if (error) {
      console.error("[Handler] state_school_stats error:", error)
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
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending

    return {
      aggregateResult: {
        schoolCounts,
        type: isChampions ? "most_state_champions" : "most_state_placers",
      },
    }
  }

  if (queryType === "years_champions" || queryType === "years_placers") {
    // Return years when school had champions/placers
    if (!school) {
      throw new Error("School parameter required for years queries")
    }

    const isChampions = queryType === "years_champions"
    let query = adminClient
      .from("wrestling_nchsaa_results")
      .select("year, place")
      .ilike("school", `%${school}%`)
      .not("school", "is", null)
      .neq("school", "")
      .not("school", "ilike", "unknown")
    
    if (isChampions) {
      query = query.eq("place", 1)
    } else {
      // For placers, place >= 1 and <= 6
      query = query.gte("place", 1).lte("place", 6)
    }
    
    const { data, error } = await query.limit(100000)

    if (error) {
      console.error("[Handler] state_school_stats error:", error)
      throw error
    }

    // Get unique years
    const years = [...new Set((data || []).map((r: any) => r.year))].sort((a, b) => b - a)

    return {
      aggregateResult: {
        school,
        years,
        type: isChampions ? "years_state_champions" : "years_state_placers",
      },
    }
  }

  // Count champions or placers for a specific school
  if (!school) {
    throw new Error("School parameter required")
  }

    const isChampions = queryType === "champions"
    let query = adminClient
      .from("wrestling_nchsaa_results")
      .select("wrestler_name, place, year")
      .ilike("school", `%${school}%`)
      .not("school", "is", null)
      .neq("school", "")
      .not("school", "ilike", "unknown")
      .not("wrestler_name", "is", null)
      .neq("wrestler_name", "")
    
    if (isChampions) {
      query = query.eq("place", 1)
    } else {
      // For placers, place >= 1 and <= 6
      query = query.gte("place", 1).lte("place", 6)
    }
    
    const { data, error } = await query.limit(100000)

    if (error) {
      console.error("[Handler] state_school_stats error:", error)
      throw error
    }

  // Normalize names to handle variations (e.g., "Jon Burns" vs "Jonathan Burns")
  const normalizeName = (name: string): string => {
    let normalized = name.trim().replace(/\s+/g, " ").toUpperCase()
    // Handle common name variations
    // "JON BURNS" -> "JONATHAN BURNS"
    if (normalized === "JON BURNS") {
      normalized = "JONATHAN BURNS"
    }
    // Add other known variations here as needed
    return normalized
  }
  
  // Count unique wrestlers using normalized names
  const uniqueWrestlers = new Set((data || []).map((r: any) => normalizeName(r.wrestler_name)))
  const totalCount = (data || []).length

  return {
    aggregateResult: {
      school,
      count: uniqueWrestlers.size,
      totalChampionships: isChampions ? totalCount : undefined,
      totalPlacements: !isChampions ? totalCount : undefined,
      type: isChampions ? "state_champions_by_school" : "state_placers_by_school",
    },
  }
}

