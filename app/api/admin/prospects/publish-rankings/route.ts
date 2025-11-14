import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const { year, gender, rankings } = await request.json()

    console.log("[v0] Publishing rankings:", { year, gender, count: rankings.length })

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    await supabase
      .from("athletes")
      .update({ prospect_ranking: null })
      .eq("graduationyear", Number.parseInt(year))
      .eq("gender", gender)

    for (const ranking of rankings) {
      const { error: athleteError } = await supabase
        .from("athletes")
        .update({ prospect_ranking: ranking.ranking })
        .eq("id", ranking.id)

      if (athleteError) {
        console.error(`[v0] Error updating athlete ${ranking.id}:`, athleteError)
      } else {
        console.log(`[v0] Updated athlete ${ranking.name} with ranking ${ranking.ranking}`)
      }
    }

    // First, unpublish all existing rankings for this year/gender
    await supabase
      .from("public_rankings")
      .update({ is_published: false })
      .eq("graduation_year", Number.parseInt(year))
      .eq("gender", gender)

    // Delete existing published rankings for this year/gender
    await supabase.from("public_rankings").delete().eq("graduation_year", Number.parseInt(year)).eq("gender", gender)

    // Insert new published rankings
    const publishedRankings = rankings.map((ranking: any) => ({
      prospect_id: ranking.id,
      name: ranking.name,
      high_school: ranking.high_school,
      weight_class: ranking.weight_class,
      state_result: ranking.state_result,
      nhsca_record: ranking.nhsca_record,
      super32_record: ranking.super32_record,
      ranked_win: ranking.ranked_win,
      academic_gpa: ranking.academic_gpa,
      graduation_year: Number.parseInt(year),
      gender: gender,
      prospect_ranking: ranking.ranking,
      is_published: true,
      published_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from("public_rankings").insert(publishedRankings)

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[v0] Successfully published ${rankings.length} rankings for Class of ${year} ${gender}`)

    return NextResponse.json({
      success: true,
      message: `Published ${rankings.length} rankings for Class of ${year} ${gender}`,
    })
  } catch (error) {
    console.error("Error publishing rankings:", error)
    return NextResponse.json({ error: "Failed to publish rankings" }, { status: 500 })
  }
}
