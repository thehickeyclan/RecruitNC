import { NextResponse, type NextRequest } from "next/server"

import { runBoutLinkGuard } from "@/lib/bout-link-guard-run"
import { scheduledJobsOff, skippedJob } from "@/lib/scheduled-jobs"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Nightly: take namesakes' bouts back off our wrestlers' profiles (lib/bout-link-guard.ts).
 *
 * Importers link bouts by name, so every import could put a Missouri Carson Owens back on the
 * Raleigh one - and did, three times, because the only cleanup was a script somebody had to
 * remember to run. This runs it every night, after the evening imports.
 */
export const maxDuration = 300

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

export async function GET(request: NextRequest) {
  if (scheduledJobsOff()) return skippedJob()
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { checked, wrong, resultsCleared, athletes } = await runBoutLinkGuard(createAdminClient(), { apply: true })
  const profiles = [...new Set(wrong.map((b) => athletes.get(b.athlete_id)?.name ?? b.athlete_id))]
  console.log(`[bout-link-guard] checked ${checked}, unlinked ${wrong.length} bouts and ${resultsCleared} results on ${profiles.length} profiles: ${profiles.join(", ")}`)
  return NextResponse.json({ checked, unlinked: wrong.length, resultsCleared, profiles })
}
