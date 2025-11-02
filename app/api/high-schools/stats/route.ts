import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const gender = searchParams.get("gender") || "all"
    const year = searchParams.get("year") || "all"

    console.log(`Stats API called with: gender=${gender}, year=${year}`)

    let query = supabase
      .from("athletes")
      .select("highschool, college, gender, graduationyear")
      .not("highschool", "is", null)
      .not("college", "is", null)
      .not("commitmentdate", "is", null)
      .neq("college", "")
      .neq("college", "Uncommitted")
      .neq("college", "TBD")

    // Apply gender filter with case-insensitive matching
    if (gender !== "all") {
      if (gender === "male") {
        query = query.or("gender.ilike.male,gender.ilike.m,gender.ilike.men")
      } else if (gender === "female") {
        query = query.or("gender.ilike.female,gender.ilike.f,gender.ilike.women")
      }
    }

    if (year !== "all") {
      // Try both string and number matching for graduationyear
      query = query.or(`graduationyear.eq.${year},graduationyear.eq.${Number.parseInt(year)}`)
    }

    let athletes, error
    try {
      const result = await query
      athletes = result.data
      error = result.error
    } catch (supabaseError) {
      console.error("Supabase query error:", supabaseError)
      // Handle rate limiting or JSON parsing errors
      if (supabaseError instanceof SyntaxError && supabaseError.message.includes("not valid JSON")) {
        return NextResponse.json(
          {
            error: "Database temporarily unavailable. Please try again in a moment.",
          },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    if (error) {
      console.error("Stats query error:", error)
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    console.log(`Stats API found ${athletes?.length || 0} athletes`)

    if (athletes && athletes.length > 0) {
      const genderSample = athletes.slice(0, 5).map((a) => ({
        gender: a.gender,
        graduationyear: a.graduationyear,
        type: typeof a.graduationyear,
      }))
      console.log("Sample athlete data:", genderSample)
    }

    const totalCommits = athletes?.length || 0

    // Handle case-insensitive gender counting
    const maleCommits =
      athletes?.filter((a) => {
        const g = a.gender?.toLowerCase()
        return g === "male" || g === "m" || g === "men"
      }).length || 0

    const femaleCommits =
      athletes?.filter((a) => {
        const g = a.gender?.toLowerCase()
        return g === "female" || g === "f" || g === "women"
      }).length || 0

    const schoolStats = new Map<string, boolean>()

    athletes?.forEach((athlete) => {
      const schoolName = athlete.highschool
      if (!schoolName) return

      const normalizedSchoolName = schoolName.toLowerCase().trim()

      // Find existing school entry using partial matching (same logic as leaderboard)
      let existingKey = null
      for (const key of schoolStats.keys()) {
        if (normalizedSchoolName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedSchoolName)) {
          existingKey = key
          break
        }
      }

      // Use the first occurrence as the canonical name
      const canonicalName = existingKey || schoolName
      schoolStats.set(canonicalName, true)
    })

    const uniqueSchools = schoolStats.size

    const result = {
      totalCommits,
      maleCommits,
      femaleCommits,
      uniqueSchools,
    }

    console.log("Stats API result:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Stats API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
