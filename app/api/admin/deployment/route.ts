import { NextResponse } from "next/server"
import { scheduledJobsOff } from "@/lib/scheduled-jobs"

export const dynamic = "force-dynamic"

/**
 * Which Vercel deployment answered: proves which project serves an address during the
 * recruitwrestlers.com move (docs/RECRUITWRESTLERS-VERCEL-SPLIT.md). Admin-only: /api/admin is
 * closed at the door by lib/admin-api-gate.ts. No secrets: Vercel's own public deployment facts.
 */
export async function GET(request: Request) {
  return NextResponse.json(
    {
      host: request.headers.get("host"),
      deploymentUrl: process.env.VERCEL_URL ?? null,
      productionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null,
      environment: process.env.VERCEL_ENV ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? null,
      scheduledJobs: scheduledJobsOff() ? "off" : "on",
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
