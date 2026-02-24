import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { getNHSCAFromTables, getSuper32FromTable } from "@/lib/tournament-tables"

function normalizeName(name: string): string {
  if (!name) return ""
  let s = name
    .toLowerCase()
    .replace(/\s*(jr\.?|sr\.?|ii|iii|iv|i v|2nd|3rd)\s*$/gi, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return s
}

/** Returns true if the two normalized name strings refer to the same person (allowing order and suffixes). */
function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  const partsA = new Set(a.split(" ").filter((p) => p.length > 1))
  const partsB = new Set(b.split(" ").filter((p) => p.length > 1))
  if (partsA.size === 0 || partsB.size === 0) return false
  if (partsA.size !== partsB.size) return false
  for (const p of partsA) {
    if (!partsB.has(p)) return false
  }
  return true
}

function matchNCHSAAToAthlete(
  nchsaaResults: { wrestler_name: string; year: number; place: number; classification?: string; weight_class?: string; school?: string }[],
  athleteName: string,
  wrestlingName: string,
  gradYear: number
) {
  const minYear = gradYear - 4
  const maxYear = gradYear
  const athleteNorm = normalizeName(athleteName)
  const wrestlingNorm = normalizeName(wrestlingName)

  return (nchsaaResults || []).filter((r) => {
    if (r.year < minYear || r.year > maxYear) return false
    const resultNorm = normalizeName(r.wrestler_name || "")
    if (!resultNorm) return false
    if (namesMatch(resultNorm, athleteNorm) || namesMatch(resultNorm, wrestlingNorm)) return true
    const athleteParts = athleteNorm.split(" ").filter((p) => p.length > 1)
    const wrestlingParts = wrestlingNorm.split(" ").filter((p) => p.length > 1)
    const resultParts = resultNorm.split(" ").filter((p) => p.length > 1)
    const partsMatch =
      (athleteParts.length > 0 &&
        resultParts.length > 0 &&
        athleteParts.every((p) => resultParts.some((rp) => rp.includes(p) || p.includes(rp)))) ||
      (wrestlingParts.length > 0 &&
        resultParts.length > 0 &&
        wrestlingParts.every((p) => resultParts.some((rp) => rp.includes(p) || p.includes(rp))))
    return partsMatch
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2025"
    const gender = searchParams.get("gender") || "Male"
    const division = searchParams.get("division") || "all"

    const supabase = await createClient()
    const db = createAdminClient()

    // Use admin client for athletes query so we see all prospects (same as public rankings).
    // createClient() is subject to RLS and can return fewer rows.
    // Match public-rankings API: year as string, case-insensitive gender
    const yearParam = String(year || "").trim() || "2025"

    let query = db
      .from("athletes")
      .select("*")
      .eq("graduationyear", yearParam)
      .ilike("gender", String(gender || "Male"))

    if (division !== "all") {
      if (division === "") {
        query = query.or("highSchoolLogoUrl.is.null,highSchoolLogoUrl.eq.")
      } else {
        query = query.eq("highSchoolLogoUrl", division)
      }
    }

    const { data: athletes, error } = await query.order("prospect_ranking", { ascending: true, nullsLast: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    const gradYearNum = Number(yearParam) || new Date().getFullYear()

    // Fetch ALL NCHSAA results (no year filter) so we never miss a year; per-athlete filter below limits to gradYear-4..gradYear
    const { data: allNchsaa, error: nchsaaErr } = await db
      .from("wrestling_nchsaa_results")
      .select("wrestler_name, year, place, classification, weight_class, school")
      .order("year", { ascending: false })

    if (nchsaaErr) {
      console.error("[simple-ranking] NCHSAA fetch error:", nchsaaErr)
    }

    const nchsaaResults = allNchsaa || []

    const athletesWithResults = await Promise.all(
      (athletes || []).map(async (athlete) => {
        const athleteName = (athlete.name || "").trim()
        const wrestlingName = (athlete.wrestling_name || "").trim()
        const gradYear = Number(athlete.graduationyear) || gradYearNum

        const athleteNchsaa = matchNCHSAAToAthlete(
          nchsaaResults,
          athleteName,
          wrestlingName,
          gradYear
        )
          .sort((a, b) => b.year - a.year)
          .map((r) => ({
            year: r.year,
            place: r.place,
            classification: r.classification,
            weight_class: r.weight_class,
            school: r.school,
          }))

        const [nhscaFromTables, super32FromTable] = await Promise.all([
          getNHSCAFromTables(db, wrestlingName || athleteName, gradYear),
          getSuper32FromTable(db, wrestlingName || athleteName, gradYear),
        ])

        const s3223 = super32FromTable.find((r) => r.year === 2023)
        const s3224 = super32FromTable.find((r) => r.year === 2024)
        const s3225 = super32FromTable.find((r) => r.year === 2025)

        return {
          ...athlete,
          super_32_2023_record: s3223?.record || athlete.super_32_2023_record,
          super_32_2023_placement: s3223?.placement || athlete.super_32_2023_placement,
          super_32_2024_record: s3224?.record || athlete.super_32_2024_record,
          super_32_2024_placement: s3224?.placement || athlete.super_32_2024_placement,
          super_32_2025_record: s3225?.record || athlete.super_32_2025_record,
          super_32_2025_placement: s3225?.placement || athlete.super_32_2025_placement,
          nchsaa_results: athleteNchsaa,
          nhsca_results: nhscaFromTables.map((r) => ({
            year: r.year,
            placement: r.placement,
            record: r.record,
          })),
        }
      }),
    )

    return NextResponse.json({
      athletes: athletesWithResults,
      meta: { year, gender, division, count: athletesWithResults.length },
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { rankings } = await request.json()

    console.log("[v0] Simple ranking API - Received rankings:", rankings?.length || 0)
    console.log("[v0] Simple ranking API - Sample rankings:", rankings?.slice(0, 3))

    const graduationYears = [...new Set(rankings?.map((r) => r.graduationYear || "unknown"))]
    console.log("[v0] Simple ranking API - Graduation years being updated:", graduationYears)

    const supabase = await createClient()

    const updatePromises = rankings.map(async ({ id, ranking, current_ranking }) => {
      console.log(`[v0] Updating athlete ${id} from ranking ${current_ranking} to ${ranking}`)
      const { data, error } = await supabase
        .from("athletes")
        .update({
          prospect_ranking: ranking,
          // Save current ranking as previous ranking
          previous_ranking: current_ranking,
        })
        .eq("id", id)
        .select("id, name, graduationyear, prospect_ranking, previous_ranking")

      if (error) {
        console.error(`[v0] Failed to update athlete ${id}:`, error)
        return { id, success: false, error }
      } else {
        console.log(`[v0] Successfully updated athlete ${id}:`, data?.[0])
        return { id, success: true, data: data?.[0] }
      }
    })

    const results = await Promise.all(updatePromises)
    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    console.log(`[v0] Simple ranking API - Updates completed: ${successful} successful, ${failed} failed`)

    const { data: verification, error: verifyError } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, prospect_ranking, previous_ranking")
      .eq("graduationyear", "2026") // Use string format for graduation year to match public rankings API
      .eq("gender", "Male")
      .not("prospect_ranking", "is", null)
      .order("prospect_ranking", { ascending: true })

    console.log("[v0] Verification - 2026 athletes with rankings after update:", verification?.length || 0)
    console.log("[v0] Verification - Sample 2026 ranked athletes:", verification?.slice(0, 3))

    return NextResponse.json({
      success: true,
      updated: successful,
      failed: failed,
      details: results,
      verification: {
        count_2026_with_rankings: verification?.length || 0,
        sample_2026_athletes: verification?.slice(0, 3) || [],
      },
    })
  } catch (error) {
    console.error("[v0] Update error:", error)
    return NextResponse.json({ error: "Failed to update rankings" }, { status: 500 })
  }
}
