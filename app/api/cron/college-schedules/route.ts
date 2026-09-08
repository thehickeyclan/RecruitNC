import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { importCollegeSchedules } from "@/lib/college-schedules/import"
import { currentSeason } from "@/lib/college-schedules/season"

export const dynamic = "force-dynamic"

/** Twelve schools fetched one at a time, on somebody else's servers. */
export const maxDuration = 120

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Refresh the NC college wrestling schedules once a day.
 *
 * Daily rather than hourly, and sequential rather than parallel: these are other people's
 * athletics sites, one of them sits behind bot protection, and a dozen pages a day is a rounding
 * error to them where a dozen an hour is a pattern. It is also enough — a schedule changes when a
 * meet is rescheduled, not by the minute.
 *
 * It runs through the autumn against schools that have posted nothing, which is the normal
 * answer, not an error. What the response separates out is the school that used to parse and now
 * does not: a redesign or a moved URL hides inside "no schedule yet" if you only count rows, and
 * that is the one thing here worth a person looking at.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const season = currentSeason()
  try {
    const summary = await importCollegeSchedules({ admin: createAdminClient(), season })

    if (summary.broken.length) {
      // Logged loudly on purpose. Everything else here is routine.
      console.error(
        "[college-schedules] unreadable:",
        summary.broken.map((r) => `${r.college} (${r.outcome}: ${r.detail ?? "no detail"})`).join("; "),
      )
    }

    return NextResponse.json({
      season,
      imported: summary.imported,
      notAnnounced: summary.notAnnounced,
      broken: summary.broken.map((r) => ({ college: r.college, outcome: r.outcome, detail: r.detail })),
      rows: summary.results.reduce((sum, r) => sum + r.rows, 0),
      schools: summary.results.map((r) => ({
        college: r.college,
        outcome: r.outcome,
        rows: r.rows,
        layout: r.layout,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "College schedule import failed"
    console.error("[college-schedules]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
