import type { SupabaseClient } from "@supabase/supabase-js"

import { stagedBrandForHost } from "@/lib/recruiting/national-paths"
import { onRecruitWrestlersProject } from "@/lib/recruiting/product-name"

/**
 * Which site an event happened on, stamped into user_analytics.event_data.site (Matt, 1 Nov 2026:
 * "we need to keep track of RW vs NCU"). Both sites share one database and one account, so the
 * row itself cannot tell them apart. "app" is the iPhone app, which is neither.
 */
export type AnalyticsSite = "rw" | "ncu" | "app"

/** RecruitWrestlers for its addresses, and for anything its own Vercel project serves. */
export function siteForHost(host: string | null | undefined, onRwProject = onRecruitWrestlersProject()): "rw" | "ncu" {
  if (stagedBrandForHost(host) === "national") return "rw"
  return onRwProject ? "rw" : "ncu"
}

export function siteFromRequest(request: Pick<Request, "headers">): "rw" | "ncu" {
  return siteForHost(request.headers.get("x-forwarded-host") || request.headers.get("host"))
}

/**
 * One row per claim, whichever of the claim routes made it, so claims can be counted by site.
 * Never throws: a lost analytics row must not fail a claim.
 */
export async function recordProfileClaimed(
  admin: SupabaseClient,
  input: { athleteId: string; userId: string; site: AnalyticsSite; route: string },
): Promise<void> {
  const { error } = await admin.from("user_analytics").insert({
    user_id: input.userId,
    event_type: "profile_claimed",
    page_url: input.route,
    event_data: { athlete_id: input.athleteId, site: input.site, route: input.route, timestamp: new Date().toISOString() },
    created_at: new Date().toISOString(),
  })
  if (error) console.warn("[analytics-site] profile_claimed:", error.message)
}
