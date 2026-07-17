import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadAdminProfileViewers } from "@/lib/admin-profile-viewers"

/**
 * Who viewed one athlete's profile — names included. Admin only.
 *
 * Deliberately separate from /api/athletes/[id]/profile-views, which serves the athlete and
 * returns counts with no identities. Keeping them apart means the identity-bearing payload
 * only ever exists behind the admin check; there's no flag on the athlete endpoint that could
 * be flipped to expose viewers.
 */
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    // Auth before argument validation: a 400 for a stranger confirms the endpoint's shape.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    // Admin client for the check itself: is_admin lives on a row the caller may not read.
    const admin = createAdminClient()
    const { data: me } = await admin
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .single()

    if (!(me?.is_admin === true || me?.role === "admin")) {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
    }

    const athleteId = new URL(req.url).searchParams.get("athleteId")?.trim()
    if (!athleteId) return NextResponse.json({ error: "athleteId is required" }, { status: 400 })

    const result = await loadAdminProfileViewers(athleteId)
    if (!result) return NextResponse.json({ error: "Could not load viewers" }, { status: 500 })

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error("[admin/profile-viewers]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
