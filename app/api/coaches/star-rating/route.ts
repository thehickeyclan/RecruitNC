import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { athleteId, rating, viewAsCoachId } = body

    // Validate rating (1-5 or 0 to unrate)
    if (rating !== null && rating !== 0 && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: "Rating must be between 1 and 5, or 0 to unrate" }, { status: 400 })
    }

    // Determine which coach's rating to update
    const targetCoachId = viewAsCoachId || user.id

    console.log("[v0] Updating star rating:", {
      athleteId,
      rating,
      targetCoachId,
      isAdmin: viewAsCoachId ? true : false,
    })

    // Update the star rating for this coach-athlete pairing
    const { data, error } = await supabase
      .from("college_coach_stars")
      .update({
        star_rating: rating === 0 ? null : rating,
      })
      .eq("coach_user_id", targetCoachId)
      .eq("athlete_id", athleteId)
      .select()
      .single()

    if (error) {
      console.error("Error updating star rating:", error)
      return NextResponse.json({ 
        error: "Failed to update star rating",
        details: error.message 
      }, { status: 500 })
    }

    console.log("[v0] Star rating updated successfully:", data)

    return NextResponse.json({
      success: true,
      star_rating: data.star_rating,
    })
  } catch (error) {
    console.error("Star rating API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

