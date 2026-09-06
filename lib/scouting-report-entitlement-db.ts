/**
 * The database half of the scouting report entitlement — reads the facts, then hands them to
 * `resolveEntitlement`, which holds the actual rules and is tested without a database.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  isSubscriptionLive,
  resolveEntitlement,
  type ScoutingEntitlement,
} from "@/lib/scouting-report-entitlement"
import { canAccessScoutingReport, scoutingReportAllowlist } from "@/lib/scouting-report-release"

/**
 * Does this account own the athlete's profile, or is it linked as their parent?
 *
 * Both count as "their own", because a scouting report about a minor is as much the parent's
 * as the wrestler's, and a parent who cannot see their own child's report would be the first
 * complaint.
 */
export async function isOwnAthlete(
  supabase: SupabaseClient,
  userId: string,
  athleteId: string,
): Promise<boolean> {
  const [{ data: owned }, { data: linked }] = await Promise.all([
    supabase.from("athletes").select("id").eq("id", athleteId).eq("claimed_by_user_id", userId).maybeSingle(),
    supabase
      .from("parent_athlete_links")
      .select("athlete_id")
      .eq("user_id", userId)
      .eq("athlete_id", athleteId)
      .maybeSingle(),
  ])
  return Boolean(owned || linked)
}

export async function hasActiveSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("recruitnc_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle()
  return isSubscriptionLive(data)
}

export async function hasPurchasedReport(
  supabase: SupabaseClient,
  userId: string,
  athleteId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("scouting_report_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("athlete_id", athleteId)
    .maybeSingle()
  return Boolean(data)
}

/**
 * Everything needed to decide access, in as few round trips as the rules allow.
 *
 * Free reasons are resolved first and short-circuit the paid lookups: a college coach never
 * triggers a subscription query, so the common case stays cheap and a billing outage cannot
 * lock out the people who were never paying.
 */
export async function loadScoutingEntitlement(
  supabase: SupabaseClient,
  params: {
    userId: string
    email: string | null
    athleteId: string
    isAdmin: boolean
    isCollegeCoach: boolean
  },
): Promise<ScoutingEntitlement> {
  const allowlistActive = scoutingReportAllowlist().length > 0
  if (allowlistActive) {
    return resolveEntitlement({
      allowlistActive: true,
      allowlisted: canAccessScoutingReport({
        email: params.email,
        isCollegeCoach: params.isCollegeCoach,
        isAdmin: params.isAdmin,
      }),
      isAdmin: params.isAdmin,
      isCollegeCoach: params.isCollegeCoach,
      isOwnProfile: false,
      hasActiveSubscription: false,
      hasPurchasedThisAthlete: false,
    })
  }

  if (params.isAdmin || params.isCollegeCoach) {
    return resolveEntitlement({
      allowlistActive: false,
      allowlisted: false,
      isAdmin: params.isAdmin,
      isCollegeCoach: params.isCollegeCoach,
      isOwnProfile: false,
      hasActiveSubscription: false,
      hasPurchasedThisAthlete: false,
    })
  }

  const [own, subscribed, purchased] = await Promise.all([
    isOwnAthlete(supabase, params.userId, params.athleteId),
    hasActiveSubscription(supabase, params.userId),
    hasPurchasedReport(supabase, params.userId, params.athleteId),
  ])

  return resolveEntitlement({
    allowlistActive: false,
    allowlisted: false,
    isAdmin: false,
    isCollegeCoach: false,
    isOwnProfile: own,
    hasActiveSubscription: subscribed,
    hasPurchasedThisAthlete: purchased,
  })
}
