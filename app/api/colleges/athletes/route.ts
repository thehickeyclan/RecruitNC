import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const college = searchParams.get("college")
    const gender = searchParams.get("gender") || "all"
    const year = searchParams.get("year") || "all"

    console.log(`College Athletes API called with: college=${college}, gender=${gender}, year=${year}`)

    if (!college) {
      return NextResponse.json({ error: "College parameter is required" }, { status: 400 })
    }

    let query = supabase
      .from("athletes")
      .select("id, name, highschool, college, gender, graduationyear, commitmentdate, rankings, weightclass, photo_url")
      .ilike("college", `%${college}%`)
      .not("highschool", "is", null)

    // Apply gender filter with case-insensitive matching
    if (gender !== "all") {
      if (gender === "male") {
        query = query.or("gender.ilike.male,gender.ilike.m,gender.ilike.men")
      } else if (gender === "female") {
        query = query.or("gender.ilike.female,gender.ilike.f,gender.ilike.women")
      }
    }

    // Apply year filter
    if (year !== "all") {
      query = query.eq("graduationyear", Number.parseInt(year))
    }

    const { data: athletes, error } = await query.order("commitmentdate", { ascending: false })

    if (error) {
      console.error("College Athletes query error:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch college athletes",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log(`College Athletes API found ${athletes?.length || 0} athletes for ${college}`)

    return NextResponse.json({
      athletes: athletes || [],
      total: athletes?.length || 0,
    })
  } catch (error) {
    console.error("College Athletes API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
