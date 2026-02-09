import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    console.log("🏫 Colleges API: Starting fetch")

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "100"), 500)
    const offset = (page - 1) * limit

    const supabaseClient = createClient()

    const { data: athletes, error } = await supabaseClient
      .from("athletes")
      .select("college, name, graduationyear, commitmentdate, weightclass, gender")
      .not("college", "is", null)
      .not("college", "eq", "")

    if (error) {
      console.error("❌ Colleges API: Error fetching athletes:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
        colleges: [],
      })
    }

    if (!athletes) {
      return NextResponse.json({
        success: true,
        colleges: [],
      })
    }

    console.log(`🏫 Colleges API: Processing ${athletes.length} athlete records`)

    const collegeMap = new Map()
    athletes.forEach((athlete) => {
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
        const college = collegeMap.get(collegeLower)
        college.count += 1
        if (gender === "Men") college.menCount = (college.menCount || 0) + 1
        else college.womenCount = (college.womenCount || 0) + 1
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

    const weightClassOrder = ["125", "133", "141", "149", "157", "165", "174", "184", "197", "285", "HWT"]

    const collegesArray = Array.from(collegeMap.values()).map((college) => {
      const weightClassesArray = Array.from(college.weightClasses).sort(
        (a, b) => weightClassOrder.indexOf(a) - weightClassOrder.indexOf(b),
      )
      return {
        ...college,
        weightClasses: weightClassesArray.join(", "),
        recent_commits: college.recent_commits
          .sort((a, b) => new Date(b.commitment_date).getTime() - new Date(a.commitment_date).getTime())
          .slice(0, 3),
      }
    })

    collegesArray.sort((a, b) => b.count - a.count)

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
