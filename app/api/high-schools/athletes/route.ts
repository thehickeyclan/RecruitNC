import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolName = searchParams.get("school")
    const gender = searchParams.get("gender") || "all"

    if (!schoolName) {
      return NextResponse.json({ error: "School name is required" }, { status: 400 })
    }

    console.log(`[v0] Searching for athletes from school: "${schoolName}" with gender: "${gender}"`)

    let athletes, error
    try {
      let query = supabase
        .from("athletes")
        .select(
          "id, name, firstName, lastName, college, gender, graduationyear, commitmentdate, rankings, weightclass, photourl, headshot_url, highschool",
        )
        .ilike("highschool", `%${schoolName}%`)
        .not("college", "is", null)
        .not("commitmentdate", "is", null) // Only include athletes with commitment dates
        .neq("college", "") // Ensure college is not an empty string
        .neq("college", "Uncommitted") // Ensure college is not "Uncommitted"
        .neq("college", "TBD") // Ensure college is not "TBD"
        .order("commitmentdate", { ascending: false })

      if (gender !== "all") {
        // Handle both "male"/"female" and "Male"/"Female" formats
        const genderVariations =
          gender === "male"
            ? ["male", "Male", "m", "M"]
            : gender === "female"
              ? ["female", "Female", "f", "F"]
              : [gender]

        query = query.in("gender", genderVariations)
        console.log(`[v0] Filtering by gender variations:`, genderVariations)
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
