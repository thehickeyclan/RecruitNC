import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { getCuratedFourTimeStatePlacers } from "@/lib/nchsaa-multi-time-state-placers"
import { normalizePlacerNameKey } from "@/lib/nchsaa-four-time-state-placers-data"

export async function handleStatePlacerCount(
  params: any,
  _request: NextRequest,
  _messageId: string | null,
): Promise<{
  results?: any[]
  aggregateResult?: any
  directResponse?: NextResponse
}> {
  const countValue = params.championshipCount ?? params.placementCount
  const wrestlerName = params.wrestlerName

  if (wrestlerName) {
    const adminClient = getSupabaseAdmin()
    const normalizedName = normalizePlacerNameKey(wrestlerName)
    const searchPattern = wrestlerName.trim().replace(/\s+/g, " ")

    const { data: rows, error } = await adminClient
      .from("wrestling_nchsaa_results")
      .select("wrestler_name, year, place")
      .gte("place", 1)
      .lte("place", 6)
      .ilike("wrestler_name", `%${searchPattern}%`)
      .limit(5000)

    if (error) {
      console.error("[Handler] state_placer_count error:", error)
      throw error
    }

    const years = new Set<number>()
    for (const r of rows ?? []) {
      if (normalizePlacerNameKey(String(r.wrestler_name ?? "")) !== normalizedName) continue
      const y = Number(r.year ?? 0)
      if (y) years.add(y)
    }
    const count = years.size
    return {
      results: [
        {
          count,
          wrestler_name: wrestlerName,
          summary: `${wrestlerName} has ${count} state placement${count !== 1 ? "s" : ""}`,
        },
      ],
    }
  }

  if (countValue === 4 || Number(countValue) === 4) {
    const n = getCuratedFourTimeStatePlacers().length
    return {
      aggregateResult: {
        type: "state_placer_count",
        count: n,
        championshipCount: 4,
      },
      results: [
        {
          count: n,
          summary: `There are ${n} wrestlers who are 4x state placers in North Carolina.`,
        },
      ],
    }
  }

  const numCount = Number(countValue)
  if (numCount === 2 || numCount === 3) {
    const adminClient = getSupabaseAdmin()
    const { data: allPlacers, error } = await adminClient
      .from("wrestling_nchsaa_results")
      .select("wrestler_name, year, place")
      .gte("place", 1)
      .lte("place", 6)
      .not("wrestler_name", "is", null)
      .neq("wrestler_name", "")
      .limit(100000)

    if (error) throw error

    const groups: Record<string, Set<number>> = {}
    for (const r of allPlacers ?? []) {
      const norm = normalizePlacerNameKey(String(r.wrestler_name ?? ""))
      if (!norm) continue
      if (!groups[norm]) groups[norm] = new Set()
      const y = Number(r.year ?? 0)
      if (y) groups[norm].add(y)
    }
    const count = Object.values(groups).filter((yrs) => yrs.size === numCount).length
    return {
      aggregateResult: {
        type: "state_placer_count",
        count,
        championshipCount: numCount,
      },
      results: [
        {
          count,
          summary: `There are ${count} wrestlers who are ${numCount}x state placers in North Carolina.`,
        },
      ],
    }
  }

  return {
    results: [{ summary: "Specify 2x, 3x, or 4x for state placer counts." }],
  }
}
