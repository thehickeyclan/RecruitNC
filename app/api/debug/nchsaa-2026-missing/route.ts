import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNCHSAAResultsForProfile, mergeNchsaaResults } from "@/lib/nchsaa-results"

/**
 * GET /api/debug/nchsaa-2026-missing?year=2026&gender=Male
 *
 * Returns 2026 class prospects and whether each has any NCHSAA result for state year 2026.
 * Use this to verify who is missing 2026 state placement (likely name spelling in wrestling_nchsaa_results).
 * For each name in missing_2026, call /api/nchsaa-lookup?name=First+Last&year=2026&gradYear=2026
 * to see raw wrestler_name values and add them to ATHLETE_SAME_PERSON_ALIAS_GROUPS in lib/athlete-name-match.ts.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2026"
    const gender = searchParams.get("gender") || "Male"
    const gradYearNum = parseInt(year, 10)
    if (isNaN(gradYearNum)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 })
    }

    const db = createAdminClient()
    const { data: athletes, error } = await db
      .from("athletes")
      .select("id, name, wrestling_name, highschool, prospect_ranking")
      .eq("graduationyear", gradYearNum)
      .eq("gender", gender)
      .order("prospect_ranking", { ascending: true, nullsLast: true })
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const withNchsaa = await Promise.all(
      (athletes || []).map(async (a) => {
        const schoolHint = (a.highschool ?? "").toString().trim() || undefined
        const byName = await getNCHSAAResultsForProfile(db, a.name || "", gradYearNum, schoolHint)
        const wrestlingName = (a.wrestling_name || "").trim()
        const byWrestling =
          wrestlingName && wrestlingName !== (a.name || "").trim()
            ? await getNCHSAAResultsForProfile(db, wrestlingName, gradYearNum, schoolHint)
            : []
        const merged = mergeNchsaaResults(byName, byWrestling)
        const has2026 = merged.some((r) => r.year === 2026)
        const nchsaa2026 = merged.filter((r) => r.year === 2026)
        return {
          name: a.name,
          wrestling_name: wrestlingName || null,
          highschool: a.highschool,
          prospect_ranking: a.prospect_ranking,
          has_2026_state: has2026,
          nchsaa_2026: nchsaa2026,
          nchsaa_all_years: merged.map((r) => r.year),
        }
      }),
    )

    const missing2026 = withNchsaa.filter((a) => !a.has_2026_state).map((a) => a.name)
    const with2026 = withNchsaa.filter((a) => a.has_2026_state).length

    return NextResponse.json({
      year: gradYearNum,
      gender,
      total: withNchsaa.length,
      with_2026_state: with2026,
      missing_2026_state_count: missing2026.length,
      missing_2026_state: missing2026,
      per_athlete: withNchsaa,
      hint:
        missing2026.length > 0
          ? "For each name in missing_2026_state, call /api/nchsaa-lookup?name=First+Last&year=2026&gradYear=" +
            gradYearNum +
            " to see raw wrestler_name in DB; add spellings to ATHLETE_SAME_PERSON_ALIAS_GROUPS in lib/athlete-name-match.ts"
          : null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[nchsaa-2026-missing]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
