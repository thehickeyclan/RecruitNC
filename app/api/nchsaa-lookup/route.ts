import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNCHSAAResultsForProfile, escapeForIlike } from "@/lib/nchsaa-results"

export const dynamic = "force-dynamic"

/**
 * GET /api/nchsaa-lookup?name=Max+Davis&year=2026&gradYear=2026
 *
 * Public NCHSAA name diagnostic (same logic as former /api/debug/nchsaa-lookup).
 * Use this URL on production — some environments block or mishandle /api/debug/*.
 *
 * - profile_style: getNCHSAAResultsForProfile(name, gradYear) — same as profiles / rankings
 * - raw_by_last_name: rows where wrestler_name contains the last word of the name
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = (searchParams.get("name") || "").trim()
    const yearParam = searchParams.get("year")
    const gradYearParam = searchParams.get("gradYear")

    if (!name) {
      return NextResponse.json(
        { error: "Missing name. Use ?name=First+Last and optional &year=2026&gradYear=2026" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      )
    }

    const db = createAdminClient()
    const gradYear = gradYearParam ? parseInt(gradYearParam, 10) : undefined

    const profileStyle = await getNCHSAAResultsForProfile(db, name, gradYear)

    const lastWord = name.split(/\s+/).filter(Boolean).pop() || name
    const lastPattern = "%" + escapeForIlike(lastWord) + "%"
    let rawQuery = db
      .from("wrestling_nchsaa_results")
      .select("wrestler_name, year, place, classification, weight_class, school")
      .ilike("wrestler_name", lastPattern)
      .order("year", { ascending: false })
      .limit(50)
    if (yearParam) {
      const y = parseInt(yearParam, 10)
      if (!isNaN(y)) rawQuery = rawQuery.eq("year", y)
    }
    const { data: rawByLastName } = await rawQuery

    return NextResponse.json(
      {
        endpoint: "/api/nchsaa-lookup",
        name_used: name,
        year_filter: yearParam || null,
        profile_style_count: profileStyle.length,
        profile_style: profileStyle,
        raw_by_last_name_count: rawByLastName?.length ?? 0,
        raw_by_last_name: rawByLastName ?? [],
        hint:
          profileStyle.length === 0 && (rawByLastName?.length ?? 0) > 0
            ? "Profile lookup returned 0 results but DB has rows containing the last name. Try setting the athlete's wrestling_name to one of the wrestler_name values above."
            : null,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[nchsaa-lookup]", message)
    return NextResponse.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } })
  }
}
