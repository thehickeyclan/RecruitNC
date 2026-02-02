import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Admin-only: full inventory of profiles created by users.
 * - claimedAthletes: rows in athletes with claimed_by_user_id set (created or claimed), within last N days.
 * - pendingSubmissions: rows in athlete_profile_submissions (submit-profile form, not yet in athletes).
 * Use ?days=365 (default) to extend beyond the 90-day "New Profile Additions" view.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const days = Math.min(730, Math.max(1, Number.parseInt(searchParams.get("days") || "365", 10)))
    const since = new Date()
    since.setDate(since.getDate() - days)
    const iso = since.toISOString()

    const adminSupabase = createAdminClient()

    const [athletesResult, submissionsResult] = await Promise.all([
      adminSupabase
        .from("athletes")
        .select("id, name, highschool, graduationyear, claimed_at, profile_verified, claimed_by_user_id")
        .not("claimed_by_user_id", "is", null)
        .gte("claimed_at", iso)
        .order("claimed_at", { ascending: false })
        .limit(500),
      adminSupabase
        .from("athlete_profile_submissions")
        .select("id, firstname, lastname, email, highschool, graduationyear, status, submitted_at")
        .order("submitted_at", { ascending: false })
        .limit(500),
    ])

    if (athletesResult.error) {
      console.error("[profile-inventory] athletes error:", athletesResult.error)
      return NextResponse.json(
        { error: "Failed to fetch claimed athletes", details: athletesResult.error.message },
        { status: 500 },
      )
    }
    if (submissionsResult.error) {
      console.error("[profile-inventory] submissions error:", submissionsResult.error)
      return NextResponse.json(
        { error: "Failed to fetch pending submissions", details: submissionsResult.error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      claimedAthletes: athletesResult.data || [],
      pendingSubmissions: submissionsResult.data || [],
      days,
    })
  } catch (err) {
    console.error("[profile-inventory] Error:", err)
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
