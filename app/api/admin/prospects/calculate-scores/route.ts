import { type NextRequest, NextResponse } from "next/server"
import { buildRecruitNcRankingBoard } from "@/lib/rankings/recruitnc-ranking-engine"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Legacy ranking-manager bridge.
 *
 * The primary /admin/rankings/board and the older simple-ranking screen now
 * consume the same TOC-style résumé engine so the two admin tools cannot
 * produce competing recommendations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const year = String(Number.parseInt(String(body.year), 10))
    const gender = String(body.gender || "Male")
    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json({ error: "A valid graduation year is required" }, { status: 400 })
    }

    const athletes = await buildRecruitNcRankingBoard({
      supabase: createAdminClient(),
      year,
      gender,
    })

    return NextResponse.json({
      success: true,
      athletes: athletes.map((athlete) => ({
        ...athlete,
        recruitnc_score: athlete.ai_score,
        calculated_rank: athlete.ai_rank,
      })),
      formula: "recruitnc-toc-resume-v2",
      message: `Calculated TOC-style résumé scores for ${athletes.length} athletes`,
    })
  } catch (error) {
    console.error("[prospect-scores] TOC-style calculation failed", error)
    return NextResponse.json(
      {
        error: "Failed to calculate scores",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
