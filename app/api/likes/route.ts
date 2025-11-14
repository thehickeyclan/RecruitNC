import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const athleteId = searchParams.get("athleteId")

  if (!athleteId) {
    return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Get like count for the athlete
    const { count, error } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("athlete_id", athleteId)

    if (error) throw error

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Error fetching likes:", error)
    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { athleteId } = await request.json()

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("athlete_id", athleteId)
      .eq("user_id", session.user.id)
      .single()

    if (existingLike) {
      return NextResponse.json({ error: "Already liked" }, { status: 400 })
    }

    // Add like
    const { error } = await supabase.from("likes").insert({
      athlete_id: athleteId,
      user_id: session.user.id,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding like:", error)
    return NextResponse.json({ error: "Failed to add like" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const athleteId = searchParams.get("athleteId")

  if (!athleteId) {
    return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Remove like
    const { error } = await supabase.from("likes").delete().eq("athlete_id", athleteId).eq("user_id", session.user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing like:", error)
    return NextResponse.json({ error: "Failed to remove like" }, { status: 500 })
  }
}
