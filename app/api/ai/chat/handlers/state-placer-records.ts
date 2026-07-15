import { type NextRequest, NextResponse } from "next/server"
import {
  getCuratedFourTimeStatePlacers,
  getNchsaaStatePlacersByExactPlacementCount,
  NCHSAA_FOUR_TIME_STATE_PLACERS,
} from "@/lib/nchsaa-multi-time-state-placers"

export async function handleStatePlacerRecords(
  params: any,
  _request: NextRequest,
  _messageId: string | null,
): Promise<{
  results?: any[]
  aggregateResult?: any
  directResponse?: NextResponse
}> {
  try {
    const countValue = params.championshipCount ?? params.placementCount
    const numCount = countValue != null && countValue !== "" ? Number(countValue) : null

    console.log("[Handler] state_placer_records called with:", { countValue, numCount, params })

    if (numCount === 4 || (!numCount && (!params.wrestlerName || params.wrestlerName === ""))) {
      const results = getCuratedFourTimeStatePlacers()
      console.log("[AI] Using curated 4x state placers list - count:", results.length)
      return { results }
    }

    if (numCount === 2 || numCount === 3) {
      let filtered = await getNchsaaStatePlacersByExactPlacementCount(numCount)
      if (params.year) {
        const minYear =
          typeof params.year === "string" && params.year.includes("last")
            ? new Date().getFullYear() - parseInt(params.year.match(/\d+/)?.[0] || "10", 10)
            : null
        if (minYear) {
          filtered = filtered.filter((w) => w.placements.some((p) => p.year >= minYear))
        }
      }
      return { results: filtered }
    }

    return { results: getCuratedFourTimeStatePlacers() }
  } catch (error: unknown) {
    console.error("[Handler] state_placer_records error:", error)
    if (params.championshipCount === 4 || params.placementCount === 4 || !params.championshipCount) {
      console.log("[Handler] Error occurred, falling back to curated 4x placers list")
      return { results: [...NCHSAA_FOUR_TIME_STATE_PLACERS] }
    }
    throw error
  }
}
