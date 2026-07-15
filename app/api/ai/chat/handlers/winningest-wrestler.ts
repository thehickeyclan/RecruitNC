import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"

/**
 * Answers "Who is the all-time winningest wrestler?" using:
 * - career_winningest_wrestlers for career wins (primary)
 * - winningest_wrestlers for single-season wins (optional context)
 */
export async function handleWinningestWrestler(
  params: any,
  request: NextRequest,
  messageId: string | null
): Promise<{
  results?: any[]
  aggregateResult?: any
  directResponse?: NextResponse
}> {
  const adminClient = getSupabaseAdmin()

  // Career (all-time) winningest — primary answer
  const { data: careerTop, error: careerError } = await adminClient
    .from("career_winningest_wrestlers")
    .select("rank, name, school, record, wins, losses, years")
    .order("rank", { ascending: true })
    .limit(5)

  if (careerError) {
    console.error("[Handler] winningest_wrestler career query error:", careerError)
    throw careerError
  }

  // Single-season winningest (most wins in one season) for context
  const { data: singleSeasonTop, error: singleError } = await adminClient
    .from("winningest_wrestlers")
    .select("rank_position, rank_numeric, is_tied, wrestler_name, school, record, wins, losses, year")
    .order("wins", { ascending: false })
    .limit(5)

  if (singleError) {
    // Table might not exist in all envs; log and continue with career only
    console.warn("[Handler] winningest_wrestler single-season query error:", singleError.message)
  }

  const careerList = careerTop || []
  const singleList = singleSeasonTop || []

  if (careerList.length === 0 && singleList.length === 0) {
    return {
      results: [
        {
          summary:
            "I don't have the all-time winningest wrestler data in the wrestling results right now. Try the Record Books or NCHSAA pages for official records.",
        },
      ],
    }
  }

  // Build answer: career is "all-time" in the usual sense
  let summary: string
  if (careerList.length > 0) {
    const top = careerList[0]
    summary = `The **all-time winningest wrestler** (career) is **${top.name}** (${top.school}) with a **${top.record}** record (${top.years}).`
    if (careerList.length > 1) {
      const next = careerList.slice(1, 4).map((r: any) => `${r.name} (${r.school}) ${r.record}`).join("; ")
      summary += ` Other career leaders: ${next}.`
    }
  } else if (singleList.length > 0) {
    const top = singleList[0]
    summary = `The single-season winningest wrestler in our records is **${top.wrestler_name}** (${top.school}) with **${top.record}** (${top.year}).`
  } else {
    summary = "I couldn't find the all-time winningest wrestler in the wrestling results."
  }

  return {
    results: [
      {
        summary,
        career_top: careerList,
        single_season_top: singleList,
      },
    ],
    aggregateResult: {
      type: "winningest_wrestler",
      career_top: careerList,
      single_season_top: singleList,
    },
  }
}
