import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getNCHSAAResultsForProfile,
  mergeNchsaaResults,
  nchsaaJsonToProfileRows,
} from "@/lib/nchsaa-results"

/**
 * Recruiting CRM + coach portal NCHSAA state lines.
 *
 * Previously: single `ilike('%Full Name%')` — fails when `wrestling_nchsaa_results.wrestler_name`
 * is "Last, First" (e.g. Hickey, Gavin) while the CRM has "Gavin Hickey".
 *
 * Now: same pipeline as unified profiles — `getNCHSAAResultsForProfile` (dual-token ILIKE + name
 * variations + plausible year window). Optional `athleteId` loads name + `wrestling_name` + graduation year.
 * (Some DBs have no `athletes.nchsaa_results` JSON column — NCHSAA rows come from `wrestling_nchsaa_results` only.)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteNameParam = (searchParams.get("athleteName") ?? "").trim()
    const athleteId = (searchParams.get("athleteId") ?? "").trim()
    const graduationYearRaw = searchParams.get("graduationYear")

    if (!graduationYearRaw) {
      return NextResponse.json({ error: "Graduation year required" }, { status: 400 })
    }

    let gradYear = parseInt(graduationYearRaw, 10)
    if (isNaN(gradYear)) {
      return NextResponse.json({ error: "Invalid graduation year" }, { status: 400 })
    }

    const supabase = createAdminClient()

    let name = athleteNameParam
    let wrestlingName = ""
    let nchsaaJson: unknown = undefined
    let schoolHint: string | undefined = (searchParams.get("highschool") ?? "").trim() || undefined

    if (athleteId) {
      const { data: row } = await supabase
        .from("athletes")
        .select("name, wrestling_name, graduationyear, highschool")
        .eq("id", athleteId)
        .maybeSingle()

      if (row) {
        const rowName = (row.name ?? "").toString().trim()
        if (rowName) name = rowName
        wrestlingName = (row.wrestling_name ?? "").toString().trim()
        const rowSchool = (row as { highschool?: unknown }).highschool
        if (!schoolHint && rowSchool != null && String(rowSchool).trim()) {
          schoolHint = String(rowSchool).trim()
        }
        const gy = Number((row as { graduationyear?: unknown }).graduationyear)
        if (Number.isFinite(gy) && gy >= 1990 && gy <= 2100) {
          gradYear = gy
        }
      }
    }

    if (!name) {
      return NextResponse.json({ error: "Athlete name or athleteId required" }, { status: 400 })
    }

    let byName: Awaited<ReturnType<typeof getNCHSAAResultsForProfile>> = []
    try {
      byName = await getNCHSAAResultsForProfile(supabase, name, gradYear, schoolHint)
    } catch (e) {
      console.warn("[RecruitNC] /api/nchsaa-results: table query (name) failed", e)
    }

    let byWrestling: Awaited<ReturnType<typeof getNCHSAAResultsForProfile>> = []
    if (wrestlingName && wrestlingName.toLowerCase() !== name.toLowerCase()) {
      try {
        byWrestling = await getNCHSAAResultsForProfile(supabase, wrestlingName, gradYear, schoolHint)
      } catch (e) {
        console.warn("[RecruitNC] /api/nchsaa-results: table query (wrestling_name) failed", e)
      }
    }

    const fromAthleteRow = nchsaaJsonToProfileRows(nchsaaJson, name)
    const merged = mergeNchsaaResults(mergeNchsaaResults(byName, byWrestling), fromAthleteRow)

    const results = merged.map((r) => ({
      year: r.year,
      place: r.place,
      classification: r.classification,
      weight_class: r.weight_class,
      school: r.school,
      wrestler_name: r.wrestler_name,
    }))

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("[RecruitNC] /api/nchsaa-results error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
