import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createBrowserClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { setProgramApplied } from "@/lib/recruiting/program-stage"

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

    // The whole staff sees it: written to every staff row for this wrestler (lib/recruiting/program-stage.ts).
    const saved = await setProgramApplied(createAdminClient(), user.id, athleteId, hasApplied, appliedTimestamp)
    return NextResponse.json({ success: true, has_applied: saved.has_applied, applied_date: saved.applied_date })
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
