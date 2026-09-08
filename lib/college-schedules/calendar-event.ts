/**
 * A college meet, in the shape the calendar already understands.
 *
 * Kept out of the hook so it can be tested: the date handling here is the one part that
 * silently ruins a calendar, and it is pure.
 */
import type { CalendarEvent } from "@/lib/nc-united-calendar/types"

export type CollegeScheduleRow = {
  id: string
  event_date: string
  start_time: string | null
  event_type: string
  opponent: string | null
  event_name: string | null
  home_away: "home" | "away" | "neutral"
  location: string | null
  stream_url: string | null
  notes: string | null
  status: "scheduled" | "postponed" | "cancelled"
}


/**
 * A college meet as the calendar already understands events.
 *
 * Mapping into `CalendarEvent` rather than teaching the grid a second shape: the month view, the
 * list view and the detail modal all work unchanged, and a college dual sorts among NC events by
 * date the way a reader expects.
 */
export function toCalendarEvent(row: CollegeScheduleRow, teamName: string): CalendarEvent {
  const opponent = row.opponent ?? row.event_name ?? "TBA"
  const prefix = row.event_type === "dual" ? (row.home_away === "away" ? "at " : row.home_away === "home" ? "vs " : "vs ") : ""
  const cancelled = row.status === "cancelled" ? " (cancelled)" : row.status === "postponed" ? " (postponed)" : ""

  return {
    // Namespaced so a college meet can never collide with an `events` row of the same id.
    id: `college:${row.id}`,
    title: `${teamName} ${prefix}${opponent}${cancelled}`.trim(),
    // Parsed as local midnight; `new Date("2026-11-21")` is UTC and lands on the 20th in NC.
    date: new Date(`${row.event_date}T${row.start_time ?? "00:00"}:00`),
    startTime: row.start_time?.slice(0, 5),
    category: "college-schedule",
    location: row.location ?? undefined,
    description: [row.event_name && row.opponent ? row.event_name : null, row.notes].filter(Boolean).join(" · ") || undefined,
    externalLink: row.stream_url ?? undefined,
  }
}

