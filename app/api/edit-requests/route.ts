import { type NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import { createClient as createSSRClient } from "@/lib/supabase/server"

type AchievementItem = {
  tournament?: string
  placement?: string
  year?: string
  level?: string
  weight_class?: string
  notes?: string
  proof_url?: string
  date?: string
}

function sanitizeAchievements(input: unknown): AchievementItem[] {
  if (!Array.isArray(input)) return []
  return input
    .map((raw) => {
      const item: AchievementItem = {
        tournament: typeof raw?.tournament === "string" ? raw.tournament.trim() : undefined,
        placement: typeof raw?.placement === "string" ? raw.placement.trim() : undefined,
        year: typeof raw?.year === "string" ? raw.year.trim() : undefined,
        level: typeof raw?.level === "string" ? raw.level.trim() : undefined,
        weight_class: typeof raw?.weight_class === "string" ? raw.weight_class.trim() : undefined,
        notes: typeof raw?.notes === "string" ? raw.notes.trim() : undefined,
        proof_url: typeof raw?.proof_url === "string" ? raw.proof_url.trim() : undefined,
        date: typeof raw?.date === "string" ? raw.date.trim() : undefined,
      }
      // Remove empty fields
      const cleaned = Object.fromEntries(
        Object.entries(item).filter(([, v]) => v && String(v).length > 0),
      ) as AchievementItem
      return cleaned
    })
    .filter((i) => Object.keys(i).length > 0)
}

export async function POST(request: NextRequest) {
  try {
    const ssr = await createSSRClient()
    const {
      data: { user },
    } = await ssr.auth.getUser().catch(() => ({ data: { user: null } as const }))

    // Parse and validate body
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // will fail validation below
    }

    const { athleteId, editType, description, currentData, photoFile } = body || {}
    const achievementsRaw = body?.achievements
    const achievements = sanitizeAchievements(achievementsRaw)

    if (!athleteId || !editType) {
      return NextResponse.json(
        { error: "Missing required fields: athleteId and editType are required" },
        { status: 400 },
      )
    }

    // For achievements edits: require at least achievements or a description (either is fine)
    if (editType === "achievements") {
      const hasAchievements = achievements.length > 0
      const hasDescription = typeof description === "string" && description.trim().length > 0
      if (!hasAchievements && !hasDescription) {
        return NextResponse.json(
          {
            error: "For achievements edits, provide at least one achievement entry or a description.",
          },
          { status: 400 },
        )
      }
    } else {
      // non-achievements edits: description is still required
      if (!description || !String(description).trim()) {
        return NextResponse.json(
          {
            error: "Missing required field: description",
          },
          { status: 400 },
        )
      }
    }

    // Build the request_data object
    const requestData: Record<string, any> = {
      editType,
      description: description || null,
      currentData: currentData || {},
      photoFile: photoFile || null,
      submittedAt: new Date().toISOString(),
      reporterName: body?.reporterName ?? null,
      reporterEmail: body?.reporterEmail ?? null,
      relationship: body?.relationship ?? null,
    }

    if (editType === "achievements") {
      requestData.category = "achievements"
      requestData.action = "add" // explicit for moderation
      requestData.achievements = achievements
      // small helper to aid reviewers
      requestData.summary = {
        count: achievements.length,
        hasDescription: !!(description && String(description).trim().length > 0),
      }
    }

    // Use service role client to bypass RLS for this insert
    const admin = createSupabaseAdmin(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } },
    )

    const { data, error } = await admin
      .from("edit_requests")
      .insert({
        user_id: user?.id ?? null,
        athlete_id: athleteId,
        request_type: "edit",
        status: "pending",
        request_data: requestData,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating edit request (admin insert):", error)
      return NextResponse.json({ error: "Failed to create edit request: " + error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Edit request submitted successfully",
      data,
    })
  } catch (error) {
    console.error("Error in edit request API (POST):", error)
    return NextResponse.json({ error: "Internal server error: " + (error as Error).message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const ssr = await createSSRClient()
    const {
      data: { user },
      error: authError,
    } = await ssr.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createSSRClient()
    const { data, error } = await supabase
      .from("edit_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching edit requests:", error)
      return NextResponse.json({ error: "Failed to fetch edit requests: " + error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in edit request API (GET):", error)
    return NextResponse.json({ error: "Internal server error: " + (error as Error).message }, { status: 500 })
  }
}
