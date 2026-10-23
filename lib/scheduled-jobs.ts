import { NextResponse } from "next/server"

/**
 * Scheduled jobs run in one Vercel project only (docs/RECRUITWRESTLERS-VERCEL-SPLIT.md).
 *
 * Both projects deploy this repo, and Vercel schedules every job in vercel.json in each of them;
 * without this, recruitwrestlers.com's project would send every alert and digest a second time and
 * run every import twice. The project that must not run them sets SCHEDULED_JOBS=off.
 * lib/scheduled-jobs.test.ts fails if any job in vercel.json skips this check.
 */
export function scheduledJobsOff(): boolean {
  return String(process.env.SCHEDULED_JOBS ?? "").trim().toLowerCase() === "off"
}

export function skippedJob(): NextResponse {
  return NextResponse.json({ skipped: true, reason: "SCHEDULED_JOBS=off on this deployment" })
}
