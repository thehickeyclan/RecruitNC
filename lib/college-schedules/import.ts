/**
 * Fetch every NC program's wrestling schedule and write the current season into the calendar.
 *
 * Built to run unattended through the autumn, when most schools have not posted a schedule yet.
 * Nothing here treats an empty school as a failure — through September and October that is the
 * normal, correct answer — but it does keep the two apart, because "nobody has posted it" and
 * "the page changed and we can no longer read it" look identical from a row count alone.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { parseCollegeSchedule, type SidearmScheduleEvent } from "./parse"
import { currentSeason } from "./season"

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"

export type CollegeImportOutcome =
  /** Rows written. */
  | "imported"
  /** The page read fine and holds no meet in this season — nobody has posted it yet. */
  | "not-announced"
  /** The page was fetched and yielded nothing at all: a redesign, or a URL that has moved. */
  | "unreadable"
  | "fetch-failed"

export type CollegeImportResult = {
  college: string
  collegeId: string
  outcome: CollegeImportOutcome
  /** Meets written for the season. */
  rows: number
  /** Everything the page held, whatever season it belonged to. */
  parsed: number
  layout: "nuxt" | "classic" | "none"
  detail?: string
}

export type CollegeImportSummary = {
  season: string
  results: CollegeImportResult[]
  imported: number
  notAnnounced: number
  /** The ones worth a human's attention: a page that used to parse and now does not. */
  broken: CollegeImportResult[]
}

type CollegeRow = { id: string; name: string; wrestling_schedule_url: string | null }

/** One meet, in the shape `college_schedules` holds. */
export function toScheduleRow(
  event: SidearmScheduleEvent,
  collegeId: string,
  season: string,
): Record<string, unknown> {
  return {
    college_id: collegeId,
    season,
    event_date: event.date,
    start_time: event.startTime,
    // A row with no opponent is an open or an invitational; the tri/quad case is not separable
    // from the page, so those arrive as duals and can be corrected by hand if it ever matters.
    event_type: event.opponent ? "dual" : "tournament",
    opponent: event.opponent,
    event_name: event.eventName,
    home_away: event.homeAway,
    location: event.location,
    stream_url: event.streamUrl,
    // The broadcaster is not its own column; it belongs with the note a reader sees.
    notes: event.tv ? `TV: ${event.tv}` : null,
    status: event.status,
    updated_at: new Date().toISOString(),
  }
}

async function fetchSchedule(url: string, season: string): Promise<{ html: string } | { error: string }> {
  try {
    // The season path is tried first even though it cannot be trusted — the classic sites honour
    // it, and the ones that ignore it are caught by the season filter anyway.
    const response = await fetch(`${url.replace(/\/$/, "")}/${season}`, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    })
    if (response.ok) return { html: await response.text() }

    const fallback = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow" })
    if (!fallback.ok) return { error: `HTTP ${fallback.status}` }
    return { html: await fallback.text() }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "fetch failed" }
  }
}

/**
 * Replace one school's season.
 *
 * Wholesale for that school and season only: a meet dropped from a schedule has to leave the
 * calendar, and a re-run must not double anything. Other seasons and other schools are untouched,
 * so one school failing cannot empty the calendar for the rest.
 */
async function writeSeason(
  admin: SupabaseClient,
  collegeId: string,
  season: string,
  rows: Record<string, unknown>[],
): Promise<string | null> {
  const { error: clearError } = await admin
    .from("college_schedules")
    .delete()
    .eq("college_id", collegeId)
    .eq("season", season)
  if (clearError) return clearError.message

  if (!rows.length) return null
  const { error } = await admin.from("college_schedules").insert(rows)
  return error ? error.message : null
}

export async function importCollegeSchedules({
  admin,
  season = currentSeason(),
  only,
}: {
  admin: SupabaseClient
  season?: string
  /** College ids to limit the run to; omit for every program with a schedule URL on file. */
  only?: string[]
}): Promise<CollegeImportSummary> {
  let query = admin
    .from("colleges")
    .select("id, name, wrestling_schedule_url")
    .not("wrestling_schedule_url", "is", null)
  if (only?.length) query = query.in("id", only)

  const { data, error } = await query
  if (error) throw new Error(`Could not read the college list: ${error.message}`)

  const colleges = (data ?? []) as CollegeRow[]
  const results: CollegeImportResult[] = []

  // Sequential on purpose. These are somebody else's servers, one of them sits behind bot
  // protection, and a dozen pages once a day is not worth parallelising.
  for (const college of colleges) {
    const url = college.wrestling_schedule_url
    if (!url) continue

    const fetched = await fetchSchedule(url, season)
    if ("error" in fetched) {
      results.push({
        college: college.name,
        collegeId: college.id,
        outcome: "fetch-failed",
        rows: 0,
        parsed: 0,
        layout: "none",
        detail: fetched.error,
      })
      continue
    }

    const parsed = parseCollegeSchedule(fetched.html, season)
    if (!parsed.parsedCount) {
      results.push({
        college: college.name,
        collegeId: college.id,
        outcome: "unreadable",
        rows: 0,
        parsed: 0,
        layout: parsed.layout,
        detail: "The page was fetched but no schedule could be read from it.",
      })
      continue
    }

    if (!parsed.events.length) {
      // Read cleanly, nothing in this season: the school has not posted it yet. Left alone rather
      // than cleared, so a school that posts and then briefly unposts does not lose its rows.
      results.push({
        college: college.name,
        collegeId: college.id,
        outcome: "not-announced",
        rows: 0,
        parsed: parsed.parsedCount,
        layout: parsed.layout,
        detail: `Page holds ${parsed.parsedCount} meets from another season.`,
      })
      continue
    }

    const rows = parsed.events.map((event) => toScheduleRow(event, college.id, season))
    const writeError = await writeSeason(admin, college.id, season, rows)
    results.push({
      college: college.name,
      collegeId: college.id,
      outcome: writeError ? "unreadable" : "imported",
      rows: writeError ? 0 : rows.length,
      parsed: parsed.parsedCount,
      layout: parsed.layout,
      detail: writeError ?? undefined,
    })
  }

  return {
    season,
    results,
    imported: results.filter((r) => r.outcome === "imported").length,
    notAnnounced: results.filter((r) => r.outcome === "not-announced").length,
    broken: results.filter((r) => r.outcome === "unreadable" || r.outcome === "fetch-failed"),
  }
}
