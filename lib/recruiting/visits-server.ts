import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { familyAthleteIds } from "@/lib/coach-messages"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { reminderFromRow, type Reminder } from "@/lib/recruiting/reminders"
import { visitFromRow, type Visit } from "@/lib/recruiting/visits"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/** Postgres "relation does not exist": scripts/add-command-center-visits-reminders.sql has not been run. */
export const TABLE_MISSING = "42P01"

/** Every visit for the family's wrestlers, soonest first. `available` is false before the table exists. */
export async function loadVisits(admin: SupabaseClient, athleteIds: string[]): Promise<{ available: boolean; visits: Visit[] }> {
  if (!athleteIds.length) return { available: true, visits: [] }
  const { data, error } = await admin.from("recruiting_visits").select("*").in("athlete_id", athleteIds).order("starts_on", { ascending: true })
  if (error) {
    if (error.code !== TABLE_MISSING) console.error("[visits] read failed", error.message)
    return { available: false, visits: [] }
  }
  return { available: true, visits: (data ?? []).map((r) => visitFromRow(r as Record<string, unknown>)) }
}

/** The family's reminders still to come, and the last week's sent ones. */
export async function loadReminders(admin: SupabaseClient, userId: string): Promise<{ available: boolean; reminders: Reminder[] }> {
  const since = new Date(Date.now() - 7 * 864e5).toISOString()
  const { data, error } = await admin.from("family_reminders").select("*").eq("user_id", userId).gte("remind_at", since).order("remind_at", { ascending: true }).limit(100)
  if (error) {
    if (error.code !== TABLE_MISSING) console.error("[reminders] read failed", error.message)
    return { available: false, reminders: [] }
  }
  return { available: true, reminders: (data ?? []).map((r) => reminderFromRow(r as Record<string, unknown>)) }
}

/**
 * The signed-in family, for a write. Writes always act as the real signed-in account, never a
 * previewed family (lib/recruiting/portal-viewer.ts), and need Command Center access.
 */
export async function familyWriter(): Promise<{ admin: SupabaseClient; userId: string; athleteIds: string[] } | { error: string; status: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Sign in first.", status: 401 }
  const admin = createAdminClient()
  if (!hasPortalAccess((await resolveRankingViewer({ supabase, admin })).viewer)) return { error: "Part of the Recruiting Command Center.", status: 403 }
  return { admin, userId: user.id, athleteIds: await familyAthleteIds(admin, user.id) }
}
