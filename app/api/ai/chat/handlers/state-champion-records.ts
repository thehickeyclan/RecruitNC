import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import {
  getNchsaaStateChampionsByExactTitleCount,
  NCHSAA_FOUR_TIME_STATE_CHAMPIONS,
} from "@/lib/nchsaa-multi-time-state-champions"

export async function handleStateChampionRecords(
  params: any,
  request: NextRequest,
  messageId: string | null
): Promise<{
  results?: any[]
  aggregateResult?: any
  directResponse?: NextResponse
}> {
  try {
    const countValue = params.championshipCount
    const numCount = countValue ? Number(countValue) : null

    console.log("[Handler] state_champion_records called with:", { countValue, numCount, params })

    if (numCount === 4) {
      console.log("[AI] Using curated 4x state champions list - count:", NCHSAA_FOUR_TIME_STATE_CHAMPIONS.length)
      return { results: [...NCHSAA_FOUR_TIME_STATE_CHAMPIONS] }
    }

    if (!numCount && (!params.wrestlerName || params.wrestlerName === "")) {
      console.log("[Handler] No championshipCount specified, defaulting to 4x for state champion records query")
      return { results: [...NCHSAA_FOUR_TIME_STATE_CHAMPIONS] }
    }

    if (numCount === 2 || numCount === 3) {
      let filtered = await getNchsaaStateChampionsByExactTitleCount(numCount)
      if (params.year) {
        const minYear =
          typeof params.year === "string" && params.year.includes("last")
            ? new Date().getFullYear() - parseInt(params.year.match(/\d+/)?.[0] || "10")
            : null
        if (minYear) {
          filtered = filtered.filter((w: any) => w.championships.some((c: any) => c.year >= minYear))
        }
      }
      return { results: filtered }
    }

    const adminClient = getSupabaseAdmin()
    const { data: allChampions, error } = await adminClient
      .from("wrestling_nchsaa_results")
      .select("wrestler_name, year, classification, weight_class, school, place")
      .eq("place", 1)
      .not("school", "is", null)
      .neq("school", "")
      .not("school", "ilike", "unknown")
      .not("wrestler_name", "is", null)
      .neq("wrestler_name", "")
      .limit(100000)

    if (error) {
      console.error("[Handler] state_champion_records error:", error)
      throw error
    }

    const normalize = (s: string) => s?.trim().replace(/\s+/g, " ").toUpperCase() || ""
    const groups: Record<string, any[]> = {}

    allChampions?.forEach((c: any) => {
      const norm = normalize(c.wrestler_name)
      if (norm) {
        if (!groups[norm]) groups[norm] = []
        groups[norm].push(c)
      }
    })

    const filtered: any[] = []
    Object.entries(groups).forEach(([, champs]) => {
      if (numCount && champs.length === numCount) {
        const sortedChamps = champs.sort((a, b) => a.year - b.year)
        filtered.push({
          wrestler_name: sortedChamps[0].wrestler_name,
          championship_count: champs.length,
          championships: sortedChamps.map((c: any) => ({
            year: c.year,
            classification: c.classification,
            weight_class: c.weight_class,
            school: c.school,
          })),
          schools: [...new Set(sortedChamps.map((c: any) => c.school))],
          classifications: [...new Set(sortedChamps.map((c: any) => c.classification))],
          weight_classes: [...new Set(sortedChamps.map((c: any) => c.weight_class))],
        })
      }
    })

    if (params.year) {
      const minYear =
        typeof params.year === "string" && params.year.includes("last")
          ? new Date().getFullYear() - parseInt(params.year.match(/\d+/)?.[0] || "10")
          : null

      if (minYear) {
        return {
          results: filtered.filter((w: any) => w.championships.some((c: any) => c.year >= minYear)),
        }
      }
    }

    return { results: filtered }
  } catch (error: any) {
    console.error("[Handler] state_champion_records error:", error)
    if (params.championshipCount === 4 || !params.championshipCount) {
      console.log("[Handler] Error occurred, falling back to curated 4x list")
      return { results: [...NCHSAA_FOUR_TIME_STATE_CHAMPIONS] }
    }
    throw error
  }
}
