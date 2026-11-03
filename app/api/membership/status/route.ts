import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { canSeeProspectRanking, hasPortalAccess } from "@/lib/ranking-visibility"
import { familyStateForUser, plansForState } from "@/lib/recruiting/plans-for-state"

export const dynamic = "force-dynamic"

/**
 * What the signed-in account already has, for the membership page to say so before anyone clicks
 * (components/recruiting/rw-membership-plans.tsx). Same rules checkout refuses on.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ signedIn: false, insider: false, commandCenter: false, via: null, plans: plansForState(null) })
  const admin = createAdminClient()
  const [{ viewer }, state] = await Promise.all([
    resolveRankingViewer({ supabase, admin }),
    familyStateForUser(admin, user.id).catch(() => null),
  ])
  const via = viewer.isAdmin
    ? "staff"
    : viewer.isBlueMember
      ? "blue"
      : viewer.hasCommandCenter || viewer.hasSubscription
        ? "membership"
        : viewer.isVerifiedCoach
          ? "coach"
          : null
  return NextResponse.json(
    {
      signedIn: true,
      email: user.email ?? null,
      insider: canSeeProspectRanking(viewer),
      commandCenter: hasPortalAccess(viewer),
      via,
      // What this family is sold, by the wrestler's state (lib/recruiting/plans-for-state.ts).
      plans: plansForState(state),
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
