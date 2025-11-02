import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createBrowserClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Update stage API: Starting request")

    let supabase = await createClient()
    let user = null

    // Try cookie-based authentication first
    const cookieHeader = request.headers.get("cookie")
    console.log("[v0] Update stage API: Cookie header present:", !!cookieHeader)

    const {
      data: { user: cookieUser },
      error: cookieError,
    } = await supabase.auth.getUser()

    if (cookieUser) {
      console.log("[v0] Update stage API: Cookie auth successful")
      user = cookieUser
    } else {
      // Fall back to bearer token authentication for mobile/iframe
      console.log("[v0] Update stage API: Cookie auth failed, trying bearer token")
      const authHeader = request.headers.get("authorization")

      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7)
        console.log("[v0] Update stage API: Bearer token found")

        // Create a new client with the bearer token
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
          error: tokenError,
        } = await supabase.auth.getUser()

        if (tokenUser) {
          console.log("[v0] Update stage API: Bearer token auth successful")
          user = tokenUser
        } else {
          console.log("[v0] Update stage API: Bearer token auth failed:", tokenError)
        }
      }
    }

    if (!user) {
      console.log("[v0] Update stage: No user found after all auth attempts")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Update stage API: Parsing request body")
    const { athleteId, stage, schoolId } = await request.json()

    console.log("[v0] Update stage API called:", { athleteId, stage, schoolId, userId: user.id })

    const { data: existing } = await supabase
      .from("college_coach_stars")
      .select("*")
      .eq("coach_user_id", user.id)
      .eq("athlete_id", athleteId)
      .single()

    console.log("[v0] Existing record:", existing)

    const { data, error } = await supabase
      .from("college_coach_stars")
      .upsert(
        {
          coach_user_id: user.id,
          athlete_id: athleteId,
          pipeline_stage: stage,
          starred_at: existing?.starred_at || new Date().toISOString(),
        },
        {
          onConflict: "coach_user_id,athlete_id",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("[v0] Update stage: Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Update stage: Success:", data)

    return NextResponse.json({ success: true, data, stage })
  } catch (error) {
    console.error("[v0] Update stage: Critical error:", error)
    console.error("[v0] Update stage: Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Failed to update stage",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
