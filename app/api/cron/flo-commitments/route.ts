import { NextRequest, NextResponse } from "next/server"
import { scheduledJobsOff, skippedJob } from "@/lib/scheduled-jobs"
import { createAdminClient } from "@/lib/supabase/admin"
import { commitmentRunDecision } from "@/lib/college-commitments/schedule"
import { runCommitmentSync } from "@/lib/college-commitments/run"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * College commitments, read from FloWrestling's running lists.
 *
 * The cron fires daily and lib/college-commitments/schedule.ts decides whether today reads -
 * weekly most of the year, daily through a signing period and the week after a major. `?force=1`
 * overrides that, and `?dry=1` works everything out and writes nothing, which is how a change to
 * the matcher gets checked against the live lists before it is trusted.
 */
function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

export async function GET(request: NextRequest) {
  if (scheduledJobsOff()) return skippedJob()
  if (!authorizeCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const url = new URL(request.url)
  const force = url.searchParams.get("force") === "1"
  const dryRun = url.searchParams.get("dry") === "1"

  const decision = commitmentRunDecision()
  if (!decision.run && !force) return NextResponse.json({ skipped: true, ...decision })

  try {
    const result = await runCommitmentSync(createAdminClient(), { dryRun })
    return NextResponse.json({
      ...decision,
      dryRun,
      baseline: result.baseline,
      lists: result.lists,
      rowsRead: result.rowsRead,
      notCommitments: result.notCommitments,
      added: result.counts.added,
      flipped: result.counts.flipped,
      removed: result.counts.removed,
      corrected: result.counts.corrected,
      applied: result.applied.length,
      held: result.held.length,
      unresolvedColleges: result.unresolvedColleges,
      errors: result.errors,
    })
  } catch (cause) {
    /*
     * A source that has gone behind a login, or an article that is no longer a commitment list,
     * fails the run and says why. Nothing is written, so the last snapshot stands and the next
     * run picks up where this one stopped.
     */
    return NextResponse.json({ error: String((cause as Error)?.message ?? cause) }, { status: 502 })
  }
}
