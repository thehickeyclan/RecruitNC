/**
 * Turning an approved family submission into a result row.
 *
 * The "Submit a result" form exists because our coverage has holes nothing in the codebase can
 * close: Ironman, Beast of the East and Powerade are not ingested; NHSCA Duals and AAU are
 * ingested for NC United squads only; and a transfer arrives with a career we never saw. The
 * family is the only party who can fill those in.
 *
 * Which is exactly why the row it produces is marked `family-submitted` rather than `verified`.
 * All 604 existing rows are verified imports off a bracket. A parent's recollection is useful
 * and is not the same thing, and a college coach reading a scouting report is entitled to know
 * which one they are looking at. An admin approving the request is saying "this is plausible
 * and worth showing", not "I watched the match".
 */

export const FAMILY_SUBMITTED = "family-submitted"

export type SubmittedResultForm = {
  event?: string
  date?: string
  weight?: string
  placement?: string
  record?: string
  team?: string
  proof?: string
}

/** "3rd" / "3" / "Champion" -> 3 / 3 / 1. Blank or unrecognised -> null, meaning did not place. */
export function parseSubmittedPlacement(raw: string | null | undefined): number | null {
  const text = String(raw ?? "").trim().toLowerCase()
  if (!text) return null
  if (/^(champ|champion|1st|first|winner)$/.test(text)) return 1
  if (/^(runner[- ]?up|2nd|second)$/.test(text)) return 2
  const m = text.match(/^(\d{1,2})\s*(st|nd|rd|th)?$/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 && n <= 99 ? n : null
}

/** "4-2" -> { wins: 4, losses: 2 }. Anything else -> zeros, so a bad record cannot fake a run. */
export function parseSubmittedRecord(raw: string | null | undefined): { wins: number; losses: number } {
  const m = String(raw ?? "").trim().match(/^(\d{1,3})\s*[-–]\s*(\d{1,3})$/)
  if (!m) return { wins: 0, losses: 0 }
  return { wins: Number(m[1]), losses: Number(m[2]) }
}

/** A stable key for an event we have never seen, so a second submission lands beside the first. */
export function submittedEventKey(event: string, year: number): string {
  const slug = String(event ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  return `submitted-${slug || "event"}-${year}`
}

export type BuiltResultRow = {
  ok: true
  row: Record<string, unknown>
} | {
  ok: false
  error: string
}

export function buildTournamentResultRow(input: {
  form: SubmittedResultForm
  athleteId: string
  athleteName: string
  highSchool?: string | null
  club?: string | null
  requestId: string
}): BuiltResultRow {
  const event = String(input.form.event ?? "").trim()
  if (!event) return { ok: false, error: "The submission has no tournament name." }

  const date = String(input.form.date ?? "").trim()
  const year = Number(date.slice(0, 4))
  if (!Number.isFinite(year) || year < 1990 || year > 2100) {
    return { ok: false, error: "The submission has no usable date." }
  }

  const { wins, losses } = parseSubmittedRecord(input.form.record)
  const placement = parseSubmittedPlacement(input.form.placement)

  return {
    ok: true,
    row: {
      event_key: submittedEventKey(event, year),
      event_name: event,
      event_short_name: event,
      event_state: null,
      event_date: date,
      year,
      athlete_id: input.athleteId,
      athlete_name: input.athleteName,
      high_school: input.highSchool ?? null,
      // The team they wrestled for, where they gave one — the NHSCA Duals and AAU case.
      club: String(input.form.team ?? "").trim() || input.club || null,
      weight_class: String(input.form.weight ?? "").trim() || null,
      wins,
      losses,
      record: `${wins}-${losses}`,
      placement,
      // Qualification is earned off a verified bracket, never off a submission.
      qualified: false,
      entrants: null,
      source_file: `edit_request:${input.requestId}`,
      verification_status: FAMILY_SUBMITTED,
    },
  }
}
