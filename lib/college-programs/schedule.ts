import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { familyAthleteIds } from "@/lib/coach-messages"

/**
 * A wrestler's upcoming events (scripts/add-athlete-upcoming-events.sql).
 *
 * A minor's future whereabouts: only the wrestler's own account or a linked parent may write or
 * read it here. Past events drop out of every read; nothing is deleted for having happened.
 */

export type UpcomingEvent = { id: string; title: string; startDate: string; endDate: string | null; location: string | null }

/** Postgres "relation does not exist": the SQL has not been run yet. */
const TABLE_MISSING = "42P01"
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const MAX_EVENTS = 25

const today = () => new Date().toISOString().slice(0, 10)

function toEvent(row: Record<string, unknown>): UpcomingEvent {
  return {
    id: String(row.id),
    title: String(row.title),
    startDate: String(row.start_date),
    endDate: row.end_date ? String(row.end_date) : null,
    location: row.location ? String(row.location) : null,
  }
}

export async function ownsAthlete(admin: SupabaseClient, userId: string, athleteId: string): Promise<boolean> {
  return (await familyAthleteIds(admin, userId)).includes(athleteId)
}

/** `available: false` when the table is not there yet, so callers can hide the feature rather than fail. */
export async function listUpcomingEvents(
  admin: SupabaseClient,
  athleteId: string,
): Promise<{ available: boolean; events: UpcomingEvent[] }> {
  const { data, error } = await admin
    .from("athlete_upcoming_events")
    .select("id, title, start_date, end_date, location")
    .eq("athlete_id", athleteId)
    .gte("start_date", today())
    .order("start_date", { ascending: true })
  if (error) {
    if (error.code === TABLE_MISSING) return { available: false, events: [] }
    throw new Error(`upcoming events: read failed: ${error.message}`)
  }
  return { available: true, events: (data ?? []).map(toEvent) }
}

export type AddEventResult = { ok: true; event: UpcomingEvent } | { ok: false; status: 400 | 500; error: string }

export async function addUpcomingEvent(
  admin: SupabaseClient,
  userId: string,
  athleteId: string,
  raw: { title?: unknown; startDate?: unknown; endDate?: unknown; location?: unknown },
): Promise<AddEventResult> {
  const title = typeof raw.title === "string" ? raw.title.trim().replace(/\s+/g, " ") : ""
  const startDate = typeof raw.startDate === "string" ? raw.startDate : ""
  const endDate = typeof raw.endDate === "string" && raw.endDate ? raw.endDate : null
  const location = typeof raw.location === "string" && raw.location.trim() ? raw.location.trim().slice(0, 120) : null

  if (title.length < 2 || title.length > 120) return { ok: false, status: 400, error: "Give the event a name." }
  if (!ISO_DAY.test(startDate)) return { ok: false, status: 400, error: "Pick the date it starts." }
  if (startDate < today()) return { ok: false, status: 400, error: "That date has passed. Add events that are still to come." }
  if (endDate && (!ISO_DAY.test(endDate) || endDate < startDate)) {
    return { ok: false, status: 400, error: "The end date is before the start date." }
  }

  const existing = await listUpcomingEvents(admin, athleteId)
  if (existing.events.length >= MAX_EVENTS) return { ok: false, status: 400, error: "Remove an event before adding another." }

  const { data, error } = await admin
    .from("athlete_upcoming_events")
    .upsert(
      { athlete_id: athleteId, title, start_date: startDate, end_date: endDate, location, created_by_user_id: userId },
      { onConflict: "athlete_id,title,start_date" },
    )
    .select("id, title, start_date, end_date, location")
    .single()
  if (error || !data) return { ok: false, status: 500, error: "Could not save the event. Try again." }
  return { ok: true, event: toEvent(data) }
}

export async function removeUpcomingEvent(admin: SupabaseClient, athleteId: string, eventId: string): Promise<boolean> {
  const { error } = await admin.from("athlete_upcoming_events").delete().eq("athlete_id", athleteId).eq("id", eventId)
  return !error
}
