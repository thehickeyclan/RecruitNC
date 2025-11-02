import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const graduationYear = searchParams.get("year")
    const gender = searchParams.get("gender")

    let query = supabase.from("current_draft_rankings").select("*")

    if (graduationYear && graduationYear !== "all") {
      query = query.eq("graduation_year", Number.parseInt(graduationYear))
    }

    if (gender && gender !== "all") {
      query = query.eq("gender", gender)
    }

    const { data: draftRankings, error } = await query.order("prospect_ranking", { ascending: true })

    if (error) {
      console.error("Error fetching draft rankings:", error)
      return NextResponse.json({ error: "Failed to fetch draft rankings" }, { status: 500 })
    }

    return NextResponse.json({ draftRankings })
  } catch (error) {
    console.error("Error in draft rankings API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { rankings, graduationYear, gender } = await request.json()

    if (!rankings || !Array.isArray(rankings)) {
      return NextResponse.json({ error: "Rankings array is required" }, { status: 400 })
    }

    // Create draft versions for each ranking
    const promises = rankings.map(async (ranking: any) => {
      const { data, error } = await supabase.rpc("create_ranking_version", {
        p_athlete_id: ranking.athleteId,
        p_prospect_ranking: ranking.prospect_ranking,
        p_graduation_year: graduationYear,
        p_gender: gender,
        p_weight_class: ranking.weightclass,
        p_ranking_notes: ranking.notes || null,
        p_status: "draft",
      })

      if (error) {
        console.error("Error creating ranking version:", error)
        throw error
      }

      return data
    })

    await Promise.all(promises)

    return NextResponse.json({
      success: true,
      message: `Draft rankings saved for ${gender} Class of ${graduationYear}`,
    })
  } catch (error) {
    console.error("Error saving draft rankings:", error)
    return NextResponse.json({ error: "Failed to save draft rankings" }, { status: 500 })
  }
}
