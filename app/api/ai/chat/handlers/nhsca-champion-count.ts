import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleNhscaChampionCount: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const countValue = params.championshipCount

  if (!countValue) {
    // Count total national champions (all time)
    const { data, error } = await adminClient
      .from("wrestling_nhsca_results")
      .select("athlete_name")
      .eq("placement", 1)
      .not("high_school", "is", null)
      .neq("high_school", "")
      .not("high_school", "ilike", "unknown")
      .not("athlete_name", "is", null)
      .neq("athlete_name", "")
      .limit(100000)

    if (error) {
      console.error("[Handler] nhsca_champion_count error:", error)
      throw error
    }

    const uniqueChampions = new Set((data || []).map((r: any) => r.athlete_name))

    return {
      aggregateResult: {
        count: uniqueChampions.size,
        type: "nhsca_champion_count",
      },
    }
  }

  // Count wrestlers with specific number of championships (2x, 3x, 4x, etc.)
  const numCount = Number(countValue)
  const { data, error } = await adminClient
    .from("wrestling_nhsca_results")
    .select("athlete_name, year, division, weight, high_school")
    .eq("placement", 1)
    .not("high_school", "is", null)
    .neq("high_school", "")
    .not("high_school", "ilike", "unknown")
    .not("athlete_name", "is", null)
    .neq("athlete_name", "")
    .limit(100000)

  if (error) {
    console.error("[Handler] nhsca_champion_count error:", error)
    throw error
  }

  // Normalize names and group by wrestler
  const normalize = (s: string) => s?.trim().replace(/\s+/g, " ").toUpperCase() || ""
  const groups: Record<string, {
    name: string
    championships: any[]
  }> = {}

  data?.forEach((r: any) => {
    const norm = normalize(r.athlete_name)
    if (!norm) return

    if (!groups[norm]) {
      groups[norm] = {
        name: r.athlete_name,
        championships: [],
      }
    }

    groups[norm].championships.push({
      year: r.year,
      division: r.division,
      weight: r.weight,
      high_school: r.high_school,
    })
  })

  const filteredResults = Object.values(groups)
    .filter(g => g.championships.length === numCount)

  return {
    aggregateResult: {
      championshipCount: numCount,
      count: filteredResults.length,
      type: "nhsca_champion_count",
    },
  }
}

