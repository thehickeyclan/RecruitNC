import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createBrowserClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { PIPELINE_STAGES } from "@/lib/recruiting/pipeline"
import { setProgramStage } from "@/lib/recruiting/program-stage"

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

    if (!athleteId || !PIPELINE_STAGES.includes(stage)) {
      return NextResponse.json({ error: "A wrestler and a valid stage are required" }, { status: 400 })
    }

    // The stage is the program's: every staff row for this wrestler moves together.
    try {
      await setProgramStage(createAdminClient(), user.id, athleteId, stage)
    } catch (error) {
      console.error("[v0] Update stage: Database error:", error)
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save" }, { status: 500 })
    }

    return NextResponse.json({ success: true, stage })
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
