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
      isBlueMember: (memberships ?? []).length > 0,
      hasSubscription: isSubscriptionLive(subscription ?? null),
      isOwnProfile,
    },
  }
}

/** What a locked surface says, and where it sends them. */
export const RANKING_PAYWALL = {
  error: "Rankings are for NC United Blue members and verified college coaches.",
  upgradeHref: "/blue",
} as const

export { normalizeRole }
