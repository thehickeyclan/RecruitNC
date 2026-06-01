import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { COLLEGE_LEADERBOARD_MIN_CLASS_YEAR } from "@/lib/colleges"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolName = searchParams.get("school")
    const gender = searchParams.get("gender") || "all"
    const year = searchParams.get("year") || "all"

    if (!schoolName) {
      return NextResponse.json({ error: "School name is required" }, { status: 400 })
    }

    console.log(
      `[high-schools/athletes] school="${schoolName}" gender="${gender}" year="${year}"`,
    )

    let athletes, error
    try {
      let query = supabase
        .from("athletes")
        .select(
          "id, name, firstName, lastName, college, gender, graduationyear, commitmentdate, rankings, weightclass, photourl, headshot_url, highschool",
        )
        .ilike("highschool", `%${schoolName}%`)
        .not("college", "is", null)
        .not("highschool", "is", null)
        .neq("college", "")
        .neq("college", "Uncommitted")
        .neq("college", "TBD")
        .or("is_prospect.is.null,is_prospect.eq.false")
        .order("commitmentdate", { ascending: false })

      if (year !== "all") {
        query = query.eq("graduationyear", Number.parseInt(year, 10))
      } else {
        query = query.gte("graduationyear", COLLEGE_LEADERBOARD_MIN_CLASS_YEAR)
      }

      if (gender !== "all") {
        const genderVariations =
          gender === "male"
            ? ["male", "Male", "m", "M", "men", "Men"]
            : gender === "female"
              ? ["female", "Female", "f", "F", "women", "Women"]
              : [gender]

        query = query.in("gender", genderVariations)
      }

      const result = await query
      athletes = result.data
      error = result.error

      console.log(`[v0] Found ${athletes?.length || 0} athletes for "${schoolName}" with gender filter "${gender}"`)
      if (athletes && athletes.length > 0) {
        const uniqueSchools = [...new Set(athletes.map((a) => a.highschool))]
        const genderCounts = athletes.reduce(
          (acc, a) => {
            acc[a.gender] = (acc[a.gender] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )
        console.log(`[v0] Actual school names in database:`, uniqueSchools)
        console.log(`[v0] Gender distribution:`, genderCounts)
      }
    } catch (parseError: any) {
      console.error("❌ High School Athletes API: Database query error:", parseError)

      const errorMessage = parseError.message || parseError.toString() || ""
      if (errorMessage.includes("Too Many") || errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        return NextResponse.json(
          {
            athletes: [],
            total: 0,
            error: "Database temporarily unavailable due to high traffic. Please try again in a moment.",
          },
          { status: 429 },
        )
      }

      if (parseError.name === "SyntaxError" && errorMessage.includes("JSON")) {
        return NextResponse.json(
          {
            athletes: [],
            total: 0,
            error: "Database response error. Please try again in a moment.",
          },
          { status: 503 },
        )
      }

      // Re-throw other errors
      throw parseError
    }

    if (error) {
      console.error("Supabase query error:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch athlete data",
          details: error.message,
          athletes: [],
          total: 0,
        },
        { status: 500 },
      )
    }

    const processedAthletes = (athletes || []).map((athlete) => ({
      ...athlete,
      // Use headshot_url first, then photourl as fallback
      photo_url: athlete.headshot_url || athlete.photourl || null,
      // Ensure we have a proper display name
      display_name: athlete.name || `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim(),
    }))

    const response = NextResponse.json({
      athletes: processedAthletes,
      total: processedAthletes.length,
    })

    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")

    return response
  } catch (error) {
    console.error("API error:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    if (errorMessage.includes("Too Many") || errorMessage.includes("rate limit")) {
      return NextResponse.json(
        {
          athletes: [],
          total: 0,
          error: "Database temporarily unavailable due to high traffic. Please try again in a moment.",
        },
        { status: 429 },
      )
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        athletes: [],
        total: 0,
      },
      { status: 500 },
    )
  }
}
