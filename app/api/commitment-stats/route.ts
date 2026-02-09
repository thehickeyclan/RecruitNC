import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCollegesByIds } from "@/lib/colleges"

export const dynamic = "force-dynamic"

/** Map colleges.division (display string) to D1/D2/D3/NAIA/NJCAA for stats. */
function bucketDivision(division: string | null | undefined): "D1" | "D2" | "D3" | "NAIA" | "NJCAA" | null {
  const v = (division ?? "").toLowerCase()
  if (/\bdivision\s*i(?!i)\b|\bd1\b|\bdi\b/.test(v)) return "D1"
  if (/\bdivision\s*ii\b|\bd2\b|\bdii\b/.test(v)) return "D2"
  if (/\bdivision\s*iii\b|\bd3\b|\bdiii\b/.test(v)) return "D3"
  if (/\bnaia\b/.test(v)) return "NAIA"
  if (/\bnjcaa\b|\bjuco\b/.test(v)) return "NJCAA"
  return null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: rows, error } = await supabase
      .from("athletes")
      .select("id, college_id, graduationyear, gender")
      .not("college", "is", null)
      .neq("college", "")
      .or("is_prospect.is.null,is_prospect.eq.false")

    if (error) {
      console.error("[commitment-stats]", error)
      return NextResponse.json(
        { success: false, error: error.message, stats: null },
        { status: 500 },
      )
    }

    const collegeIds = [...new Set((rows ?? []).map((r) => r.college_id).filter(Boolean))]
    const collegesMap = collegeIds.length > 0 ? await getCollegesByIds(supabase, collegeIds) : new Map()

    const stats = {
      totalCommitments: (rows ?? []).length,
      byYear: { "2025": 0, "2026": 0, other: 0 },
      byDivision: { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 },
      byGender: { male: 0, female: 0 },
    }

    for (const r of rows ?? []) {
      const y = r.graduationyear
      if (y === 2025) stats.byYear["2025"]++
      else if (y === 2026) stats.byYear["2026"]++
      else stats.byYear.other++

      const g = (r.gender ?? "").toLowerCase()
      if (g === "female") stats.byGender.female++
      else stats.byGender.male++

      const division = r.college_id ? collegesMap.get(r.college_id)?.division : null
      const bucket = bucketDivision(division)
      if (bucket) stats.byDivision[bucket]++
    }

    return NextResponse.json(
      { success: true, stats },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    )
  } catch (e) {
    console.error("[commitment-stats]", e)
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Failed to compute stats",
        stats: null,
      },
      { status: 500 },
    )
  }
}
