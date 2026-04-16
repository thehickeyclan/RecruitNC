import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleNhscaPlacerCount: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const countValue = params.championshipCount

  if (!countValue) {
    throw new Error("nhsca_placer_count requires championshipCount parameter")
  }

  const numCount = Number(countValue)
  
  // Query all NHSCA All-Americans
  const { data, error } = await adminClient
    .from("wrestling_nhsca_results")
    .select("athlete_name, placement, year, division, weight, high_school, state")
    .gte("placement", 1)
    .lte("placement", 8)
    .not("high_school", "is", null)
    .neq("high_school", "")
    .not("high_school", "ilike", "unknown")
    .not("athlete_name", "is", null)
    .neq("athlete_name", "")
    .limit(100000)

  if (error) {
    console.error("[Handler] nhsca_placer_count error:", error)
    throw error
  }

  // Normalize names and group by wrestler
  const normalize = (s: string) => s?.trim().replace(/\s+/g, " ").toUpperCase() || ""
  const groups: Record<string, number> = {}

  data?.forEach((r: any) => {
    const norm = normalize(r.athlete_name)
    if (norm) {
      groups[norm] = (groups[norm] || 0) + 1
    }
  })

  // Count wrestlers with exactly numCount All-American placements
  const count = Object.values(groups).filter(c => c === numCount).length

  return {
    aggregateResult: {
      type: "nhsca_placer_count",
      count,
      championshipCount: numCount,
    }
  }
}








