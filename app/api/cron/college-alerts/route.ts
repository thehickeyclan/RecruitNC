import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendToTokens } from "@/lib/push-send"
import { currentSeason } from "@/lib/college-schedules/season"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Remind the day before, so there is still time to plan around it. */
const LEAD_DAYS = 1

/** A day with more than this many meets across all twelve programs is a data problem. */
const MAX_PER_RUN = 12

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/** "2026-11-20" for the day LEAD_DAYS from now; schedule rows carry a plain date. */
function targetDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + LEAD_DAYS)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function describe(row: {
  event_type: string
  opponent: string | null
  event_name: string | null
  home_away: string
  location: string | null
  start_time: string | null
}): string {
  const who = row.opponent ?? row.event_name ?? "a meet"
  const where = row.event_type === "dual" ? (row.home_away === "away" ? `at ${who}` : `vs ${who}`) : who
  const time = row.start_time ? ` at ${formatTime(row.start_time)}` : ""
  const place = row.location ? ` · ${row.location}` : ""
  return `Tomorrow${time}: ${where}${place}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(":")
  const hour = Number(h)
  if (!Number.isFinite(hour)) return time
  const suffix = hour >= 12 ? "pm" : "am"
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return m && m !== "00" ? `${twelve}:${m}${suffix}` : `${twelve}${suffix}`
}

/**
 * Remind each team's followers about tomorrow's meet.
 *
 * Only the people who chose that team. This is why the feature is a follow rather than a switch:
 * "every college meet in North Carolina" is roughly 240 notifications a season and nobody wants
 * it, while "the eight times NC State wrestles" is the reason somebody installed the app.
 *
 * Dedupe is keyed on the meet *and* the team. `push_sent_events` keys on the event alone because
 * those go to everybody at once; a Duke-NC State dual is one row here but two audiences, and
 * keyed on the meet alone whichever fanbase came second would be silently skipped.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const day = targetDate()

  try {
    const { data: meets, error } = await admin
      .from("college_schedules")
      // Named through the column, not left to PostgREST to guess: `college_schedules` has two
      // foreign keys to `colleges` — the team and the opponent — so a bare `colleges(name)` is
      // ambiguous and errors, which would have failed every reminder before one was ever sent.
      .select(
        "id, college_id, event_type, opponent, event_name, home_away, location, start_time, status, college:college_id(name)",
      )
      .eq("event_date", day)
      .eq("season", currentSeason())
      .neq("status", "cancelled")

    if (error) {
      console.error("[college-alerts]", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!meets?.length) return NextResponse.json({ day, meets: 0, sent: 0 })

    const { data: alreadySent } = await admin.from("push_sent_college_events").select("schedule_id, college_id")
    const sentKeys = new Set((alreadySent ?? []).map((r) => `${r.schedule_id}|${r.college_id}`))

    const pending = meets.filter((m) => !sentKeys.has(`${m.id}|${m.college_id}`)).slice(0, MAX_PER_RUN)
    const results: Array<{ college: string; sent: number; followers: number }> = []

    for (const meet of pending) {
      const teamName = ((meet as { college?: { name?: string } | null }).college?.name ?? "").trim() || "Your team"

      // The follow list is the audience, intersected with the alert switch being on.
      const { data: followers } = await admin
        .from("college_follows")
        .select("push_devices(expo_push_token, alert_college)")
        .eq("college_id", meet.college_id)

      const tokens = (followers ?? [])
        .map((row) => (row as { push_devices?: { expo_push_token?: string; alert_college?: boolean } | null }).push_devices)
        .filter((device) => device?.alert_college !== false)
        .map((device) => device?.expo_push_token)
        .filter((token): token is string => Boolean(token))

      if (!tokens.length) {
        // Nobody follows this team yet. Recorded as sent all the same, so the day it passes is
        // not re-examined forever, and so a follower joining tomorrow is not told about yesterday.
        await admin.from("push_sent_college_events").insert({ schedule_id: meet.id, college_id: meet.college_id })
        results.push({ college: teamName, sent: 0, followers: 0 })
        continue
      }

      const outcome = await sendToTokens("alert_college", tokens, {
        title: teamName,
        body: describe(meet as never),
        data: { type: "college-schedule", collegeId: meet.college_id, scheduleId: meet.id },
      })

      await admin.from("push_sent_college_events").insert({ schedule_id: meet.id, college_id: meet.college_id })
      results.push({ college: teamName, sent: outcome.sent, followers: tokens.length })
    }

    return NextResponse.json({
      day,
      meets: meets.length,
      reminded: results.length,
      sent: results.reduce((sum, r) => sum + r.sent, 0),
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "College alerts failed"
    console.error("[college-alerts]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
