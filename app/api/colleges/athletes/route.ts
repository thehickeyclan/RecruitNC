import { type NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { COLLEGE_LEADERBOARD_MIN_CLASS_YEAR } from "@/lib/colleges"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/** Columns known to exist on athletes — avoid projected_weight etc. that break prod (42703). */
const ATHLETE_SELECT =
  "id, name, highschool, college, gender, graduationyear, commitmentdate, weightclass, photourl, photo_url, headshot_url"

const ATHLETE_SELECT_FALLBACK =
  "id, name, highschool, college, gender, graduationyear, commitmentdate, weightclass, photourl"

function buildCollegeAthletesQuery(
  client: SupabaseClient,
  select: string,
  college: string,
  gender: string,
  year: string,
) {
  let query = client
    .from("athletes")
    .select(select)
    .ilike("college", `%${college}%`)
    .not("highschool", "is", null)
    .neq("college", "")
    .neq("college", "Uncommitted")
    .neq("college", "TBD")
    .or("is_prospect.is.null,is_prospect.eq.false")

  if (gender !== "all") {
    const genderValues =
      gender === "male"
        ? ["male", "Male", "m", "M", "men", "Men"]
        : gender === "female"
          ? ["female", "Female", "f", "F", "women", "Women"]
          : [gender]
    query = query.in("gender", genderValues)
  }

  if (year !== "all") {
    query = query.eq("graduationyear", Number.parseInt(year, 10))
  } else {
    query = query.gte("graduationyear", COLLEGE_LEADERBOARD_MIN_CLASS_YEAR)
  }

  return query.order("commitmentdate", { ascending: false })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const college = searchParams.get("college")?.trim()
    const gender = searchParams.get("gender") || "all"
    const year = searchParams.get("year") || "all"

    if (!college) {
      return NextResponse.json({ error: "College parameter is required" }, { status: 400 })
    }

    let { data: athletes, error } = await buildCollegeAthletesQuery(
      supabase,
      ATHLETE_SELECT,
      college,
      gender,
      year,
    )

    if (error && /column athletes\.(photo_url|headshot_url)/i.test(error.message)) {
      const fallback = await buildCollegeAthletesQuery(
        supabase,
        ATHLETE_SELECT_FALLBACK,
        college,
        gender,
        year,
      )
      athletes = fallback.data
      error = fallback.error
    }

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

    const normalizedAthletes =
      athletes?.map((athlete) => ({
        ...athlete,
        photourl: athlete.photourl ?? athlete.photo_url ?? athlete.headshot_url ?? null,
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
