import type { SupabaseClient } from "@supabase/supabase-js"
import { isWiqCurrent, isPayingWiqMembership, isCompedWiqMembership } from "@/lib/blue-membership"

/**
 * A parent's WrestlingIQ subscriptions, for their own profile.
 *
 * The original Blue cohort was never migrated off WrestlingIQ — deliberately, because asking
 * thirty-odd families to re-enter card details is itself a churn moment. The cost is that those
 * parents opened their profile and saw no subscription at all: the page reads `blue_memberships`,
 * which is the Stripe side only. A family paying $51 a month for years had nothing to look at.
 *
 * So this shows them what we know, read-only, and says plainly where to go to change it. We
 * cannot pause or cancel a WrestlingIQ subscription from here — there is no API and no write
 * path — and a button that looked like it could would be worse than no button.
 *
 * The link from parent to subscription runs through the athlete, which only became reliable on
 * 24 September 2026 when the import was fixed and 36 of 39 rows finally matched a wrestler.
 */

export type ParentWiqSubscription = {
  id: string
  athleteName: string
  /** What WrestlingIQ calls it, normalised: active, grace, cancelled, paused, past_due. */
  status: string
  /** True while they still have access, including a cancelled subscription inside its window. */
  current: boolean
  /** A $0 scholarship or discount place. */
  comped: boolean
  memberSince: string | null
  nextDueAt: string | null
  activeUntil: string | null
  amountFormatted: string | null
  discountCode: string | null
}

/** Athletes this user can speak for: ones they claimed, and ones they are a parent of. */
async function athleteIdsForUser(admin: SupabaseClient, userId: string): Promise<string[]> {
  const [{ data: links }, { data: claimed }] = await Promise.all([
    admin.from("parent_athlete_links").select("athlete_id").eq("user_id", userId),
    admin.from("athletes").select("id").eq("claimed_by_user_id", userId),
  ])
  const ids = new Set<string>()
  for (const l of links ?? []) if (l.athlete_id) ids.add(String(l.athlete_id))
  for (const c of claimed ?? []) if (c.id) ids.add(String(c.id))
  return [...ids]
}

export async function getWiqSubscriptionsForParent(
  admin: SupabaseClient,
  userId: string,
): Promise<ParentWiqSubscription[]> {
  const athleteIds = await athleteIdsForUser(admin, userId)
  if (athleteIds.length === 0) return []

  const { data, error } = await admin
    .from("blue_wiq_subscriptions")
    .select("id, athlete_id, wrestler_name, status, member_since, next_due_at, active_until, amount_display, amount_cents, discount_code")
    .in("athlete_id", athleteIds)

  if (error || !data) return []

  return data
    /*
     * Current only.
     *
     * Including ended subscriptions filled the panel with history — one test account showed two
     * cancelled 2025 rows for the same wrestler above the one that matters. A panel headed
     * "Subscription" should show the subscription, not every subscription there has ever been.
     * `isWiqCurrent` keeps a cancelled one while its paid window is still open, which is the
     * case a parent does need to see.
     */
    .filter((row) => isWiqCurrent(row))
    .map((row) => ({
      id: String(row.id),
      athleteName: String(row.wrestler_name ?? ""),
      status: String(row.status ?? ""),
      current: isWiqCurrent(row),
      comped: isCompedWiqMembership(row) || (!isPayingWiqMembership(row) && (row.amount_cents ?? 0) === 0),
      memberSince: row.member_since ?? null,
      nextDueAt: row.next_due_at ?? null,
      activeUntil: row.active_until ?? null,
      amountFormatted: row.amount_display ? String(row.amount_display).replace(/\s*\/\s*month$/i, "") : null,
      discountCode: row.discount_code ?? null,
    }))
    .sort((a, b) => a.athleteName.localeCompare(b.athleteName))
}
