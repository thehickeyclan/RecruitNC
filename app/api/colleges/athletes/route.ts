import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { COLLEGE_LEADERBOARD_MIN_CLASS_YEAR } from "@/lib/colleges"

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
      .select(
        "id, name, highschool, college, gender, graduationyear, commitmentdate, rankings, weightclass, college_weight_class, projected_weight, photourl, photo_url",
      )
      .ilike("college", college)
      .not("highschool", "is", null)
      .neq("college", "")
      .neq("college", "Uncommitted")
      .neq("college", "TBD")
      .or("is_prospect.is.null,is_prospect.eq.false")

    // Apply gender filter with case-insensitive matching
    if (gender !== "all") {
      if (gender === "male") {
        query = query.or("gender.ilike.male,gender.ilike.m,gender.ilike.men")
      } else if (gender === "female") {
        query = query.or("gender.ilike.female,gender.ilike.f,gender.ilike.women")
      }
    }

    // Apply year filter — "all" means class of 2025+ (matches /colleges banner)
    if (year !== "all") {
      query = query.eq("graduationyear", Number.parseInt(year))
    } else {
      query = query.gte("graduationyear", COLLEGE_LEADERBOARD_MIN_CLASS_YEAR)
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

    const normalizedAthletes =
      athletes?.map((athlete) => ({
        ...athlete,
        college_weight_class: athlete.college_weight_class ?? athlete.projected_weight ?? null,
        projected_weight: athlete.projected_weight ?? athlete.college_weight_class ?? null,
        photourl: athlete.photourl ?? athlete.photo_url ?? null,
      })) ?? []

    return NextResponse.json({
      athletes: normalizedAthletes,
      total: normalizedAthletes.length,
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
