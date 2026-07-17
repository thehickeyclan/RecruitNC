import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadProfileViewStats } from "@/lib/profile-view-stats"

/**
 * View counts for one athlete's profile.
 *
 * Owner (the account that claimed the profile) or admin only. This is deliberately not
 * public: it would expose which recruits are getting college attention, which is competitive
 * information about someone else's kid. Counts only — no viewer identities are returned at
 * any level, so there's nothing here to leak even to the owner.
 */
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ error: "athlete id required" }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    // Admin client: the caller's own RLS can't read athletes.claimed_by_user_id or
    // user_profiles.is_admin reliably, and we need the true owner to authorize.
    const admin = createAdminClient()

    const [{ data: athlete }, { data: profile }] = await Promise.all([
      admin.from("athletes").select("claimed_by_user_id").eq("id", id).single(),
      admin.from("user_profiles").select("is_admin, role").eq("user_id", user.id).single(),
    ])

    if (!athlete) return NextResponse.json({ error: "not found" }, { status: 404 })

    const isOwner = Boolean(athlete.claimed_by_user_id) && athlete.claimed_by_user_id === user.id
    const isAdmin = profile?.is_admin === true || profile?.role === "admin"
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const stats = await loadProfileViewStats(id)
    return NextResponse.json({ ok: true, stats })
  } catch (e) {
    console.error("[profile-views]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
