/**
 * Two wrestlers compared, for a coach.
 *
 * Behind the same gate as the rankings: NC United Blue members, verified college coaches and
 * admins. The comparison is built from the rankings' own evidence, so giving it away would give
 * the rankings away sideways.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { compareAthletes } from "@/lib/athlete-comparison"
import { loadComparisonProfile } from "@/lib/athlete-comparison-load"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leftId = String(searchParams.get("left") ?? "").trim()
  const rightId = String(searchParams.get("right") ?? "").trim()
  if (!leftId || !rightId) {
    return NextResponse.json({ error: "Pick two wrestlers." }, { status: 400 })
  }
  if (leftId === rightId) {
    return NextResponse.json({ error: "Pick two different wrestlers." }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return NextResponse.json({ error: "Sign in to compare wrestlers." }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, is_admin, verified_coach")
    .eq("user_id", auth.user.id)
    .maybeSingle()

  const admin = createAdminClient()
  /** A Blue membership on any athlete this account pays for. */
  const { data: memberships } = await admin
    .from("blue_memberships")
    .select("status")
    .eq("payer_user_id", auth.user.id)
    .in("status", ["active", "trialing", "past_due"])

  const allowed = canSeeProspectRanking({
    isAdmin: profile?.is_admin === true,
    isVerifiedCoach: profile?.verified_coach === true,
    role: profile?.role,
    isBlueMember: (memberships ?? []).length > 0,
  })
  if (!allowed) {
    return NextResponse.json(
      { error: "Comparisons are for NC United Blue members and verified college coaches." },
      { status: 403 },
    )
  }

  const [left, right] = await Promise.all([
    loadComparisonProfile(admin, leftId),
    loadComparisonProfile(admin, rightId),
  ])
  if (!left || !right) {
    return NextResponse.json({ error: "Could not find one of those wrestlers." }, { status: 404 })
  }

  return NextResponse.json({ comparison: compareAthletes(left, right) })
}
