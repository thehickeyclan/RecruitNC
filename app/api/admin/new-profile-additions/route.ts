import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
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

    const adminSupabase = createAdminClient()
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const iso = ninetyDaysAgo.toISOString()

    const { data: athletes, error } = await adminSupabase
      .from("athletes")
      .select("id, name, highschool, graduationyear, claimed_at, profile_verified, photourl")
      .not("claimed_by_user_id", "is", null)
      .gte("claimed_at", iso)
      .order("claimed_at", { ascending: false })
      .limit(200)

    if (error) {
      console.error("[new-profile-additions] Error:", error)
      return NextResponse.json({ error: "Failed to fetch new additions", details: error.message }, { status: 500 })
    }

    return NextResponse.json({ athletes: athletes || [] })
  } catch (err) {
    console.error("[new-profile-additions] Error:", err)
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
