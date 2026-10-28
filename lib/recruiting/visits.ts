/**
 * Recruiting visits a family plans (Matt, 28 Oct 2026): school, official or unofficial, dates,
 * who is going and notes (scripts/add-command-center-visits-reminders.sql).
 *
 * Upcoming visits show on the home page, on the school's row in My List and on Plan. Once the last
 * day has passed the Command Center asks whether it happened; "yes" logs a visit contact
 * (lib/college-programs/contacts.ts) so the school moves forward on the list.
 */
/** "Get ready for your official visit" (app/recruiting/learn/official-visits). */
export const VISIT_GUIDE = "/recruiting/learn/official-visits"

export const VISIT_KINDS = ["official", "unofficial"] as const
export type VisitKind = (typeof VISIT_KINDS)[number]
export const VISIT_KIND_LABEL: Record<VisitKind, string> = { official: "Official visit", unofficial: "Unofficial visit" }

export const VISIT_OUTCOMES = ["planned", "happened", "missed"] as const
export type VisitOutcome = (typeof VISIT_OUTCOMES)[number]

export type Visit = {
  id: string
  athleteId: string
  schoolId: string
  kind: VisitKind
  startsOn: string
  endsOn: string | null
  who: string | null
  notes: string | null
  outcome: VisitOutcome
}

/** Where a visit stands today (YYYY-MM-DD, Eastern). */
export type VisitPhase = "upcoming" | "confirm" | "happened" | "missed"

export function visitPhase(v: Pick<Visit, "startsOn" | "endsOn" | "outcome">, today: string): VisitPhase {
  if (v.outcome === "happened") return "happened"
  if (v.outcome === "missed") return "missed"
  return (v.endsOn ?? v.startsOn) >= today ? "upcoming" : "confirm"
}

const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" })

/** "Sat, Nov 8" or "Nov 8-9" or "Nov 30 - Dec 1". */
export function visitDates(v: Pick<Visit, "startsOn" | "endsOn">): string {
  if (!v.endsOn || v.endsOn === v.startsOn) return fmt(v.startsOn, { weekday: "short", month: "short", day: "numeric" })
  const sameMonth = v.startsOn.slice(0, 7) === v.endsOn.slice(0, 7)
  return sameMonth ? `${fmt(v.startsOn, { month: "short", day: "numeric" })}-${fmt(v.endsOn, { day: "numeric" })}` : `${fmt(v.startsOn, { month: "short", day: "numeric" })} - ${fmt(v.endsOn, { month: "short", day: "numeric" })}`
}

/** Whole days from today to the visit's first day; negative once it has started. */
export function daysUntil(startsOn: string, today: string): number {
  return Math.round((Date.parse(`${startsOn}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 864e5)
}

export function daysUntilText(startsOn: string, today: string): string {
  const d = daysUntil(startsOn, today)
  if (d < 0) return "under way"
  if (d === 0) return "today"
  if (d === 1) return "tomorrow"
  return `in ${d} days`
}

export const isVisitKind = (v: unknown): v is VisitKind => typeof v === "string" && (VISIT_KINDS as readonly string[]).includes(v)
export const isVisitOutcome = (v: unknown): v is VisitOutcome => typeof v === "string" && (VISIT_OUTCOMES as readonly string[]).includes(v)
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** The fields a family sends, checked. A string is the error to show. */
export function cleanVisit(body: Record<string, unknown> | null): { kind: VisitKind; startsOn: string; endsOn: string | null; who: string | null; notes: string | null } | string {
  if (!body) return "Something went wrong. Try again."
  if (!isVisitKind(body.kind)) return "Pick official or unofficial."
  const startsOn = typeof body.startsOn === "string" && DATE.test(body.startsOn) ? body.startsOn : null
  if (!startsOn) return "Add the date of the visit."
  const endsOn = typeof body.endsOn === "string" && DATE.test(body.endsOn) && body.endsOn !== startsOn ? body.endsOn : null
  if (endsOn && endsOn < startsOn) return "The last day is before the first."
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) || null : null)
  return { kind: body.kind, startsOn, endsOn, who: text(body.who, 200), notes: text(body.notes, 2000) }
}

export function visitFromRow(row: Record<string, unknown>): Visit {
  return {
    id: String(row.id),
    athleteId: String(row.athlete_id),
    schoolId: String(row.school_id),
    kind: isVisitKind(row.kind) ? row.kind : "unofficial",
    startsOn: String(row.starts_on),
    endsOn: row.ends_on ? String(row.ends_on) : null,
    who: row.who ? String(row.who) : null,
    notes: row.notes ? String(row.notes) : null,
    outcome: isVisitOutcome(row.outcome) ? row.outcome : "planned",
  }
}
