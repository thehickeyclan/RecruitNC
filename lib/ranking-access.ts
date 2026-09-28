/**
 * Resolving who is asking, once, for every surface that shows a ranking.
 *
 * The policy lives in `ranking-visibility.ts` and is one function. The *evidence* for it —
 * admin flag, verified-coach flag, role, a Blue membership paid on this account — was assembled
 * by hand in each route that needed it, which is why `/api/public-rankings` shipped asking only
 * whether somebody was signed in. A free account was the whole product: register, open the
 * rankings page, read the published top thirty of every class.
 *
 * One resolver means a new surface cannot accidentally ship a weaker check than the last one.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizeRole } from "./viewer-role"
import type { RankingViewer } from "./ranking-visibility"
import { isSubscriptionLive } from "./scouting-report-entitlement"
import { isWiqCurrent } from "./blue-membership"

/**
 * A Blue membership is read from the payer, which is how a parent qualifies.
 *
 * `blue_memberships.payer_user_id` is the account that pays — in practice a parent, paying for
 * a child who may have no account at all. Reading membership from the payer is what makes
 * "parents of Blue members" work without a separate relationship lookup.
 *
 * `past_due` counts. A card that failed this morning is a billing problem, and locking a family
 * out of the thing they pay for is the wrong way to collect.
 */
const ENTITLING_STATUSES = ["active", "trialing", "past_due"] as const

/** Stripe-side membership: any row already filtered to an entitling status. */
function isBlueFromStripe(memberships: unknown[] | null | undefined): boolean {
  return (memberships ?? []).length > 0
}

export async function resolveRankingViewer(options: {
  /** Session client, for the signed-in user and their profile. */
  supabase: SupabaseClient
  /** Service-role client, because memberships are not readable by the member's own session. */
  admin: SupabaseClient
  /** Set when the viewer is looking at one athlete, to allow them their own number. */
  athleteId?: string | null
}): Promise<{ viewer: RankingViewer; userId: string | null }> {
  const { supabase, admin } = options
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user ?? null
  if (!user) return { viewer: {}, userId: null }
  return resolveRankingViewerForUser({ admin, userId: user.id, athleteId: options.athleteId })
}

/**
 * The same decision, for a caller who already knows who is asking.
 *
 * The phone carries a bearer token rather than cookies, so it cannot use the session client
 * above — and the answer to "may this person read a ranking" must not depend on which client
 * asked. Both paths land here, which is what stops the app and the web drifting into two
 * different policies, the way reading rankings straight from the table once did.
 */
export async function resolveRankingViewerForUser(options: {
  admin: SupabaseClient
  userId: string
  athleteId?: string | null
}): Promise<{ viewer: RankingViewer; userId: string | null }> {
  const { admin } = options
  const user = { id: options.userId }
  const supabase = admin

  const [{ data: profile }, { data: memberships }, { data: subscription }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("role, is_admin, verified_coach")
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("blue_memberships")
      .select("status")
      .eq("payer_user_id", user.id)
      .in("status", [...ENTITLING_STATUSES]),
    /*
     * The paid alternative to Blue. `isSubscriptionLive` is stricter than the membership check
     * above - it excludes `past_due` - and deliberately so: Blue is a family in a wrestling
     * program we know, and a subscriber is a card.
     */
    admin
      .from("recruitnc_subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
  ])

  /*
   * The other half of Blue, and the half that has paid longest.
   *
   * The original cohort was never migrated off WrestlingIQ - deliberately, because asking
   * thirty-odd families to re-enter card details is itself a churn moment. `blue_memberships`
   * is the Stripe side only, so reading membership from it alone told a family paying $51 a
   * month for years that they needed to buy a $9.99 subscription to see the rankings their
   * membership includes. Jim Bernthal reported exactly that on announcement day.
   *
   * The link runs parent -> athlete -> subscription, the same path `blue-wiq-for-parent` uses:
   * athletes this account claimed, plus athletes it is recorded as a parent of.
   *
   * `isWiqCurrent` keeps a cancelled subscription inside its paid window, for the same reason
   * `past_due` entitles on the Stripe side: they have paid for those days.
   */
  let isWiqBlue = false
  if (!isBlueFromStripe(memberships)) {
    const [{ data: links }, { data: claimed }] = await Promise.all([
      admin.from("parent_athlete_links").select("athlete_id").eq("user_id", user.id),
      admin.from("athletes").select("id").eq("claimed_by_user_id", user.id),
    ])
    const athleteIds = [
      ...new Set([
        ...(links ?? []).map((l) => String(l.athlete_id)).filter(Boolean),
        ...(claimed ?? []).map((c) => String(c.id)).filter(Boolean),
      ]),
    ]
    if (athleteIds.length > 0) {
      const { data: wiq } = await admin
        .from("blue_wiq_subscriptions")
        .select("status, active_until")
        .in("athlete_id", athleteIds)
      isWiqBlue = (wiq ?? []).some((row) => isWiqCurrent(row as never))
    }
  }

  let isOwnProfile = false
  if (options.athleteId) {
    const { data: owned } = await admin
      .from("athletes")
      .select("id")
      .eq("id", options.athleteId)
      .eq("claimed_by_user_id", user.id)
      .maybeSingle()
    isOwnProfile = Boolean(owned)
  }

  return {
    userId: user.id,
    viewer: {
      isAdmin: profile?.is_admin === true,
      isVerifiedCoach: profile?.verified_coach === true,
      role: profile?.role ?? null,
      isBlueMember: isBlueFromStripe(memberships) || isWiqBlue,
      hasSubscription: isSubscriptionLive(subscription ?? null),
      isOwnProfile,
    },
  }
}

/** What a locked surface says, and where it sends them. */
export const RANKING_PAYWALL = {
  error: "Rankings require NC United Blue, a RecruitNC subscription, or verified college-coach access.",
  upgradeHref: "/rankings",
} as const

export { normalizeRole }
