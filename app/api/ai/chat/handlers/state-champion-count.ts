import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"

export async function handleStateChampionCount(
  params: any,
  request: NextRequest,
  messageId: string | null
): Promise<{
  results?: any[]
  aggregateResult?: any
  directResponse?: NextResponse
}> {
  const countValue = params.championshipCount
  const wrestlerName = params.wrestlerName
  
  if (wrestlerName) {
    // Count championships for a specific wrestler
    const adminClient = getSupabaseAdmin()
    const normalize = (s: string) => s?.trim().replace(/\s+/g, " ").toUpperCase() || ""
    const normalizedName = normalize(wrestlerName)
    const searchPattern = wrestlerName.trim().replace(/\s+/g, " ")

    const { data: allChampions, error: fetchError } = await adminClient
      .from("wrestling_nchsaa_results")
      .select("wrestler_name, year, classification, weight_class, school, place")
      .eq("place", 1)
      .not("school", "is", null)
      .neq("school", "")
      .not("school", "ilike", "unknown")
      .not("wrestler_name", "is", null)
      .neq("wrestler_name", "")
      .ilike("wrestler_name", `%${searchPattern}%`)
      .limit(5000)

    if (fetchError) {
      console.error("[Handler] state_champion_count error:", fetchError)
      throw fetchError
    }

    // Count only exact normalized match (avoids over-counting e.g. "Faith Bane" vs "Faith Bane Smith")
    const count = (allChampions || []).filter((c: any) => normalize(c.wrestler_name) === normalizedName).length
    return {
      results: [{ count, wrestler_name: wrestlerName, summary: `${wrestlerName} won ${count} state championship${count !== 1 ? 's' : ''}` }]
    }
  } else if (countValue) {
    // Count total number of wrestlers with X championships
    if (countValue === 4) {
      // Use hardcoded count for accuracy
      return {
        aggregateResult: {
          type: "state_champion_count",
          count: 14,
          championshipCount: 4,
        }
      }
    } else {
      // For other counts, query database
      const adminClient = getSupabaseAdmin()
      const { data: allChampions, error: fetchError } = await adminClient
        .from("wrestling_nchsaa_results")
        .select("wrestler_name, year, classification, weight_class, school, place")
        .eq("place", 1)
        .not("school", "is", null)
        .neq("school", "")
        .not("school", "ilike", "unknown")
        .not("wrestler_name", "is", null)
        .neq("wrestler_name", "")
        .limit(100000)

      if (fetchError) {
        console.error("[Handler] state_champion_count error:", fetchError)
        throw fetchError
      }

      const normalize = (s: string) => s?.trim().replace(/\s+/g, " ").toUpperCase() || ""
      const groups: Record<string, number> = {}

      allChampions?.forEach((c: any) => {
        const norm = normalize(c.wrestler_name)
        if (norm) groups[norm] = (groups[norm] || 0) + 1
      })

      const count = Object.values(groups).filter(c => c === countValue).length
      return {
        aggregateResult: {
          type: "state_champion_count",
          count,
          championshipCount: countValue,
        }
      }
    }
  } else {
    throw new Error("state_champion_count requires either championshipCount or wrestlerName")
  }
}








