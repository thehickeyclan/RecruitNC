/**
 * Tell a team's followers how its dual meet ended: "Final: Duke 24, Princeton 12".
 *
 * Duals only. A tournament finish is a placing table, not a line anyone reads on a lock screen,
 * and the importer stores no result for one.
 *
 * Runs straight after each schedule import, because the import is where a score first appears.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { sendToTokens } from "@/lib/push-send"
import { currentSeason } from "./season"

/**
 * How far back a result still counts as news. The import runs late evening and early morning, so a
 * Saturday dual is seen within hours; the slack covers a school that posts the score a day late.
 * It is also what stops the first run after this ships from sending the whole season so far.
 */
const RECENT_DAYS = 2

/** More finals than this in one run is a data problem, not a busy weekend across twelve teams. */
const MAX_PER_RUN = 12

export type DualResult = {
  college_id: string
  event_date: string
  opponent: string
  outcome: "W" | "L"
  team_score: number | string | null
  opponent_score: number | string | null
}

function scoreText(value: number | string | null): string | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? String(n) : null
}

/** "Final: Duke 24, Princeton 12". Without both scores, the outcome alone. */
export function dualResultBody(team: string, result: Pick<DualResult, "opponent" | "outcome" | "team_score" | "opponent_score">): string {
  const ours = scoreText(result.team_score)
  const theirs = scoreText(result.opponent_score)
  if (ours !== null && theirs !== null) return `Final: ${team} ${ours}, ${result.opponent} ${theirs}`
  return result.outcome === "W" ? `Final: ${team} beat ${result.opponent}` : `Final: ${result.opponent} beat ${team}`
}

/** Today in North Carolina, as the plain date schedule rows carry. */
function easternDate(now: Date, daysBack = 0): string {
  const shifted = new Date(now.getTime() - daysBack * 86_400_000)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(shifted)
}

async function followerTokens(admin: SupabaseClient, collegeId: string): Promise<string[]> {
  const { data } = await admin
    .from("college_follows")
    .select("push_devices(expo_push_token, alert_college)")
    .eq("college_id", collegeId)
  return (data ?? [])
    .map((row) => (row as { push_devices?: { expo_push_token?: string; alert_college?: boolean } | null }).push_devices)
    .filter((device) => device?.alert_college !== false)
    .map((device) => device?.expo_push_token)
    .filter((token): token is string => Boolean(token))
}

export type DualResultAlertSummary = {
  finals: number
  alerted: Array<{ college: string; opponent: string; sent: number; followers: number }>
  skipped?: string
}

export async function alertDualResults(admin: SupabaseClient, now: Date = new Date()): Promise<DualResultAlertSummary> {
  const { data, error } = await admin
    .from("college_schedules")
    .select("college_id, event_date, opponent, outcome, team_score, opponent_score, college:college_id(name)")
    .eq("season", currentSeason(now))
    .eq("event_type", "dual")
    .not("outcome", "is", null)
    .not("opponent", "is", null)
    .gte("event_date", easternDate(now, RECENT_DAYS))
    .lte("event_date", easternDate(now))

  // Before the result columns exist this query fails; nothing to tell anyone yet.
  if (error) return { finals: 0, alerted: [], skipped: error.message }
  const finals = (data ?? []) as Array<DualResult & { college?: { name?: string } | null }>
  if (!finals.length) return { finals: 0, alerted: [] }

  const alerted: DualResultAlertSummary["alerted"] = []
  for (const final of finals.slice(0, MAX_PER_RUN)) {
    // Claimed before sending, on the meet rather than the row: rows are replaced every import, and
    // two runs racing each other must not both send. A conflict means somebody already told them.
    const { error: claimError } = await admin.from("push_sent_college_results").insert({
      college_id: final.college_id,
      event_date: final.event_date,
      opponent: final.opponent,
    })
    if (claimError) {
      // A duplicate is the normal case on every run after the first. Anything else — the table not
      // there yet — means no record can be kept, and sending without one repeats on every import.
      if (claimError.code !== "23505") return { finals: finals.length, alerted, skipped: claimError.message }
      continue
    }

    const team = (final.college?.name ?? "").trim() || "Your team"
    const tokens = await followerTokens(admin, final.college_id)
    if (!tokens.length) {
      alerted.push({ college: team, opponent: final.opponent, sent: 0, followers: 0 })
      continue
    }

    const outcome = await sendToTokens("alert_college", tokens, {
      title: team,
      body: dualResultBody(team, final),
      // `/calendar` has been a tab since the first build, so the tap lands on every installed copy.
      data: { type: "college-result", collegeId: final.college_id, path: "/calendar" },
    })
    alerted.push({ college: team, opponent: final.opponent, sent: outcome.sent, followers: tokens.length })
  }

  return { finals: finals.length, alerted }
}
