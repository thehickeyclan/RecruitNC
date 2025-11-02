import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all athlete IDs liked by the user
    const { data, error } = await supabase.from("likes").select("athlete_id").eq("user_id", session.user.id)

    if (error) throw error

    const likedAthleteIds = data.map((like) => like.athlete_id)

    return NextResponse.json({ likedAthleteIds })
  } catch (error) {
    console.error("Error fetching user likes:", error)
    return NextResponse.json({ error: "Failed to fetch user likes" }, { status: 500 })
  }
}
