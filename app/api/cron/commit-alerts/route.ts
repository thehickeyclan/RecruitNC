import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendToSubscribers } from "@/lib/push-send"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * How far back a commitment can be dated and still be announced automatically.
 *
 * Was 14 days, which quietly decided that a commitment entered with its real date — the day the
 * wrestler actually committed, often weeks before anyone told us — was not news. Three went
 * unannounced that way, one of them by a single day. The date is when it happened; the alert is
 * about when we learned.
 */
const MAX_AGE_DAYS = 45

/**
 * Most announcements in one run.
 *
 * This is what the age window was really guarding: an import setting a hundred colleges at once
 * and every phone buzzing a hundred times. A cap says that directly, and a backlog drains over
 * the following hours instead of being thrown away.
 */
const MAX_PER_RUN = 5

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Announces newly committed athletes to devices opted into commitment alerts.
 *
 * push_sent_commits is the guard against duplicates: an athlete is announced once, ever. Relying on
 * commitmentdate alone would re-send every run, and relying on a "since last run" window would drop
 * announcements whenever a run failed.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS)
  const cutoffIso = cutoff.toISOString().slice(0, 10)

  const { data: candidates, error } = await admin
    .from("athletes")
    .select("id, name, college, commitmentdate")
    .not("college", "is", null)
    .neq("college", "")
    .gte("commitmentdate", cutoffIso)
    .order("commitmentdate", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: alreadySent } = await admin.from("push_sent_commits").select("athlete_id")
  const sentIds = new Set((alreadySent ?? []).map((r) => r.athlete_id))

  const pending = (candidates ?? []).filter((a) => a.id && a.name && a.college && !sentIds.has(a.id))

  if (pending.length === 0) {
    return NextResponse.json({ announced: 0, message: "No new commitments to announce." })
  }

  const batch = pending.slice(0, MAX_PER_RUN)
  const deferred = pending.length - batch.length

  const results: Array<Record<string, unknown>> = []

  for (const athlete of batch) {
    // Claim the athlete before sending. If the send throws, the row stays claimed and this
    // athlete is skipped next run — a missed alert is recoverable, a duplicate blast is not.
    const { error: claimError } = await admin
      .from("push_sent_commits")
      .insert({ athlete_id: athlete.id })

    if (claimError) {
      // Unique violation means a concurrent run already claimed it.
      continue
    }

    try {
      const outcome = await sendToSubscribers("alert_commits", {
        title: "New commitment",
        body: `${athlete.name} commits to ${athlete.college}`,
        data: { type: "commit", athleteId: athlete.id },
      })
      results.push({ athlete: athlete.name, college: athlete.college, ...outcome })
    } catch (sendError) {
      results.push({
        athlete: athlete.name,
        error: sendError instanceof Error ? sendError.message : "send failed",
      })
    }
  }

  return NextResponse.json({ announced: results.length, deferred, results })
}
