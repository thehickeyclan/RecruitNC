import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createBrowserClient } from "@supabase/supabase-js"

async function getAuthenticatedUser(request: NextRequest) {
  let supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (user && !error) {
    return { supabase, user }
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    )

    const {
      data: { user: tokenUser },
    } = await supabase.auth.getUser()

    if (tokenUser) {
      return { supabase, user: tokenUser }
    }
  }

  return { supabase, user: null }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { athleteId, hasApplied, appliedDate } = await request.json()

    if (!athleteId || typeof hasApplied !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const appliedTimestamp = hasApplied
      ? appliedDate || new Date().toISOString()
      : null

    const { data: existing } = await supabase
      .from("college_coach_stars")
      .select("*")
      .eq("coach_user_id", user.id)
      .eq("athlete_id", athleteId)
      .single()

    const { data, error } = await supabase
      .from("college_coach_stars")
      .upsert(
        {
          coach_user_id: user.id,
          athlete_id: athleteId,
          has_applied: hasApplied,
          applied_date: appliedTimestamp,
          starred_at: existing?.starred_at || new Date().toISOString(),
        },
        { onConflict: "coach_user_id,athlete_id" },
      )
      .select("has_applied, applied_date")
      .single()

    if (error) {
      console.error("[v0] Update applied: Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      has_applied: data?.has_applied ?? hasApplied,
      applied_date: data?.applied_date ?? appliedTimestamp,
    })
  } catch (error) {
    console.error("[v0] Update applied: Critical error:", error)
    return NextResponse.json(
      {
        error: "Failed to update applied status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

