import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const weightClassOrder = ["125", "133", "141", "149", "157", "165", "174", "184", "197", "285", "HWT"]

type CollegeAgg = {
  id: string
  name: string
  canonical_name?: string
  division?: string
  count: number
  menCount: number
  womenCount: number
  weightClasses: Set<string>
  recent_commits: { name: string; graduation_year: number; commitment_date: string }[]
}

function normalizeCollegeEntry(agg: CollegeAgg) {
  const weightClassesArray = Array.from(agg.weightClasses).sort(
    (a, b) => weightClassOrder.indexOf(a) - weightClassOrder.indexOf(b),
  )
  return {
    ...agg,
    weightClasses: weightClassesArray.join(", "),
    recent_commits: agg.recent_commits
      .sort((a, b) => new Date(b.commitment_date).getTime() - new Date(a.commitment_date).getTime())
      .slice(0, 3),
  }
}

/** Build list from colleges table + athletes by college_id (post-migration). */
async function fetchFromCollegesTable(supabase: ReturnType<typeof createClient>) {
  const { data: colleges, error: collegesError } = await supabase
    .from("colleges")
    .select("id, name, division")

  if (collegesError || !colleges?.length) return null

  const { data: athletes, error: athletesError } = await supabase
    .from("athletes")
    .select("college_id, name, graduationyear, commitmentdate, weightclass, gender")
    .not("college_id", "is", null)

  if (athletesError) return null

  const byId = new Map<string, CollegeAgg>()
  for (const c of colleges) {
    byId.set(c.id, {
      id: c.id,
      name: c.name,
      division: c.division ?? "",
      count: 0,
      menCount: 0,
      womenCount: 0,
      weightClasses: new Set(),
      recent_commits: [],
    })
  }
  for (const a of athletes ?? []) {
    const agg = byId.get(a.college_id)
    if (!agg) continue
    const gender = a.gender?.toLowerCase() === "female" ? "Women" : "Men"
    agg.count += 1
    if (gender === "Men") agg.menCount += 1
    else agg.womenCount += 1
    if (a.weightclass) agg.weightClasses.add(a.weightclass)
    if (a.name) {
      agg.recent_commits.push({
        name: a.name,
        graduation_year: a.graduationyear || new Date().getFullYear(),
        commitment_date: a.commitmentdate || new Date().toISOString().split("T")[0],
      })
    }
  }
  return Array.from(byId.values()).map(normalizeCollegeEntry).sort((a, b) => b.count - a.count)
}

/** Fallback: group by athletes.college when colleges table missing or empty. */
async function fetchFromAthletesOnly(supabase: ReturnType<typeof createClient>) {
  const { data: athletes, error } = await supabase
    .from("athletes")
    .select("college, name, graduationyear, commitmentdate, weightclass, gender")
    .not("college", "is", null)
    .not("college", "eq", "")

  if (error || !athletes?.length) return []

  const collegeMap = new Map<string, CollegeAgg>()
  athletes.forEach((athlete: any) => {
    if (!athlete.college) return
    const collegeLower = athlete.college.toLowerCase()
    const displayName = athlete.college
    const gender = athlete.gender?.toLowerCase() === "female" ? "Women" : "Men"

    if (!collegeMap.has(collegeLower)) {
      collegeMap.set(collegeLower, {
        id: collegeLower.replace(/\s+/g, "-"),
        name: displayName,
        canonical_name: collegeLower,
        count: 1,
        menCount: gender === "Men" ? 1 : 0,
        womenCount: gender === "Women" ? 1 : 0,
        weightClasses: new Set(athlete.weightclass ? [athlete.weightclass] : []),
        recent_commits: [],
      })
    } else {
      const college = collegeMap.get(collegeLower)!
      college.count += 1
      if (gender === "Men") college.menCount += 1
      else college.womenCount += 1
      if (athlete.weightclass) college.weightClasses.add(athlete.weightclass)
      if (athlete.name) {
        college.recent_commits.push({
          name: athlete.name,
          graduation_year: athlete.graduationyear || new Date().getFullYear(),
          commitment_date: athlete.commitmentdate || new Date().toISOString().split("T")[0],
        })
      }
    }
  })
  return Array.from(collegeMap.values()).map(normalizeCollegeEntry).sort((a, b) => b.count - a.count)
}

export async function GET(request: Request) {
  try {
    console.log("🏫 Colleges API: Starting fetch")

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "100"), 500)
    const offset = (page - 1) * limit

    const supabaseClient = createClient()

    let collegesArray = await fetchFromCollegesTable(supabaseClient)
    if (collegesArray == null) {
      console.log("🏫 Colleges API: Using fallback (athletes only)")
      collegesArray = await fetchFromAthletesOnly(supabaseClient)
    } else {
      console.log(`🏫 Colleges API: Using colleges table (${collegesArray.length} colleges)`)
    }

    const totalColleges = collegesArray.length
    const paginatedColleges = collegesArray.slice(offset, offset + limit)
    const totalPages = Math.ceil(totalColleges / limit)

    console.log(`✅ Colleges API: Successfully processed ${collegesArray.length} colleges`)

    const response = NextResponse.json({
      success: true,
      colleges: paginatedColleges,
      pagination: {
        page,
        limit,
        total: totalColleges,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })

    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
    return response
  } catch (error) {
    console.error("💥 Colleges API: Unexpected error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch colleges",
      colleges: [],
    })
  }
}
