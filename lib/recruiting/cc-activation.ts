import type { SupabaseClient } from "@supabase/supabase-js"

import type { AnalyticsSite } from "@/lib/analytics-site"

/**
 * Command Center activation (Matt, 2 Nov 2026): a family is activated when, within 7 days of
 * first opening the Command Center, it does something that moves recruiting - saves a school,
 * marks a coach emailed, submits an interest form, adds a visit or replies to a coach. The
 * target is half of the families who open it.
 *
 * Each of those writes one `command_center_action` row from here on, with event_data.site like
 * every other row (lib/analytics-site.ts). The admin view also reads the tables' own timestamps,
 * so families who acted before these rows existed are counted from what they actually did.
 */
export type CommandCenterAction = "school_saved" | "coach_emailed" | "interest_form" | "visit_added" | "coach_message"

export const ACTION_LABEL: Record<CommandCenterAction, string> = {
  school_saved: "Saved a school",
  coach_emailed: "Marked a coach emailed",
  interest_form: "Interest form",
  visit_added: "Added a visit",
  coach_message: "Messaged a coach",
}

export const ACTIVATION_DAYS = 7
export const ACTIVATION_TARGET = 0.5

/** Never throws: a lost analytics row must not fail the family's save. */
export async function recordCommandCenterAction(
  admin: SupabaseClient,
  input: { userId: string; action: CommandCenterAction; site: AnalyticsSite; schoolId?: string | null; athleteId?: string | null },
): Promise<void> {
  const at = new Date().toISOString()
  const { error } = await admin.from("user_analytics").insert({
    user_id: input.userId,
    event_type: "command_center_action",
    page_url: "/my-recruiting",
    event_data: { action: input.action, site: input.site, school_id: input.schoolId ?? null, athlete_id: input.athleteId ?? null, timestamp: at },
    created_at: at,
  })
  if (error) console.warn("[cc-activation] action:", error.message)
}

export type ActivationFamily = {
  userId: string
  firstVisit: string
  site: string | null
  /** Every meaningful action this family took, from any source, with its time. */
  actions: Array<{ action: CommandCenterAction; at: string }>
}

export type ActivationRow = {
  userId: string
  firstVisit: string
  site: string | null
  /** "yes" activated in the window, "no" the window closed without it, "open" still inside it. */
  state: "yes" | "no" | "open"
  first: { action: CommandCenterAction; at: string } | null
}

export function activationOf(f: ActivationFamily, now: string): ActivationRow {
  const end = new Date(Date.parse(f.firstVisit) + ACTIVATION_DAYS * 864e5).toISOString()
  const inWindow = f.actions.filter((a) => a.at >= f.firstVisit && a.at <= end).sort((a, b) => a.at.localeCompare(b.at))
  const first = inWindow[0] ?? null
  return { userId: f.userId, firstVisit: f.firstVisit, site: f.site, state: first ? "yes" : end <= now ? "no" : "open", first }
}

/** The rate over families whose 7 days are over; families still inside them are not counted either way. */
export function activationRate(rows: ActivationRow[]): { activated: number; decided: number; open: number; rate: number | null } {
  const activated = rows.filter((r) => r.state === "yes").length
  const decided = rows.filter((r) => r.state !== "open").length
  // An open family that already acted is activated: it counts now.
  return { activated, decided, open: rows.length - decided, rate: decided ? activated / decided : null }
}
