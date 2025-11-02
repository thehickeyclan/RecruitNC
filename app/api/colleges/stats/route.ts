import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const gender = searchParams.get("gender") || "all"
    const year = searchParams.get("year") || "all"
    // const division = searchParams.get("division") || "all"

    console.log(`College Stats API called with: gender=${gender}, year=${year}`)

    let query = supabase
      .from("athletes")
      .select("college, highschool, gender, graduationyear")
      .not("college", "is", null)
      .not("highschool", "is", null)

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

    // if (division !== "all") {
    //   query = query.ilike("college_division", `%${division}%`)
    // }

    const { data: athletes, error } = await query

    if (error) {
      console.error("College Stats query error:", error)
      return NextResponse.json({ error: "Failed to fetch college stats" }, { status: 500 })
    }

    console.log(`College Stats API found ${athletes?.length || 0} athletes`)

    if (athletes && athletes.length > 0) {
      const sampleData = athletes.slice(0, 5).map((a) => ({
        gender: a.gender,
        graduationyear: a.graduationyear,
        type: typeof a.graduationyear,
      }))
      console.log("Sample college athlete data:", sampleData)
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

    const uniqueColleges = new Set(athletes?.map((a) => a.college)).size || 0

    const result = {
      totalCommits,
      maleCommits,
      femaleCommits,
      uniqueColleges,
    }

    console.log("College Stats API result:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("College Stats API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
