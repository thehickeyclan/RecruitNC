import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const athleteId = params.id

    // Get the athlete's information
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .select("*")
      .eq("id", athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({
        success: false,
        error: "Athlete not found",
        athleteId,
      })
    }

    const athleteName = athlete.name || `${athlete.first_name || ""} ${athlete.last_name || ""}`.trim()

    // Parse the name
    const nameParts = athleteName.split(/\s+/).filter((part) => part.length > 0)
    const firstName = nameParts[0]?.toLowerCase() || ""
    const lastName = nameParts.slice(1).join(" ").toLowerCase() || ""

    console.log(`Searching for matches for: "${athleteName}"`)
    console.log(`Parsed as: firstName="${firstName}", lastName="${lastName}"`)

    // Search for potential matches with different strategies
    const searchStrategies = [
      // Exact name match
      {
        name: "exact_name",
        query: supabase.from("matches").select("*").ilike("first_name", firstName).ilike("last_name", lastName),
      },
      // Wrestler ID contains name
      {
        name: "wrestler_id_full",
        query: supabase.from("matches").select("*").ilike("wrestler_id", `%${firstName}_${lastName}%`),
      },
      // Wrestler ID contains first name
      {
        name: "wrestler_id_first",
        query: supabase.from("matches").select("*").ilike("wrestler_id", `%${firstName}%`),
      },
      // First name fuzzy match
      {
        name: "first_name_fuzzy",
        query: supabase.from("matches").select("*").ilike("first_name", `%${firstName}%`),
      },
      // Last name fuzzy match
      {
        name: "last_name_fuzzy",
        query: supabase.from("matches").select("*").ilike("last_name", `%${lastName}%`),
      },
    ]

    const results = {}

    for (const strategy of searchStrategies) {
      try {
        const { data, error } = await strategy.query.limit(10)

        if (error) {
          results[strategy.name] = { error: error.message }
        } else {
          results[strategy.name] = {
            count: data?.length || 0,
            matches:
              data?.map((match) => ({
                id: match.id,
                wrestler_id: match.wrestler_id,
                first_name: match.first_name,
                last_name: match.last_name,
                season: match.season,
                grade: match.grade,
                high_school: match.high_school,
                total_matches: match.total_matches,
                wins: match.wins,
                losses: match.losses,
              })) || [],
          }
        }
      } catch (err) {
        results[strategy.name] = { error: err.message }
      }
    }

    // Also search for similar names in case there's a typo
    const { data: similarNames, error: similarError } = await supabase
      .from("matches")
      .select("first_name, last_name, wrestler_id")
      .or(`first_name.ilike.%${firstName.substring(0, 4)}%,last_name.ilike.%${lastName.substring(0, 4)}%`)
      .limit(20)

    return NextResponse.json({
      success: true,
      athlete: {
        id: athleteId,
        name: athleteName,
        firstName,
        lastName,
      },
      searchResults: results,
      similarNames: similarNames || [],
      totalStrategies: searchStrategies.length,
    })
  } catch (error) {
    console.error("Match finder error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
