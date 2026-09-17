import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadCollegeInterest } from "@/lib/admin-college-interest"

/**
 * Which colleges viewed which athletes. Admin only.
 *
 * Names programs, not coaches — the same line the athlete-facing endpoint holds. An admin can
 * already see individual viewers through /api/admin/analytics/profile-viewers; this one exists
 * to answer the roster-wide question ("who is getting college looks") without turning into a
 * log of named adults reading minors' profiles.
 */
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const admin = createAdminClient()
    const { data: me } = await admin
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .single()

    if (!(me?.is_admin === true || me?.role === "admin")) {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
    }

    const range = new URL(req.url).searchParams.get("range")?.trim() || "all"
    const report = await loadCollegeInterest(admin, range)
    return NextResponse.json({ ok: true, range, ...report })
  } catch (e) {
    console.error("[admin/college-interest]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
