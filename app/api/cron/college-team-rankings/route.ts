import { NextResponse, type NextRequest } from "next/server"

import data from "@/lib/college-programs/programs-2026-27.json"
import type { PollSchool } from "@/lib/college-programs/team-rankings"
import { buildTeamRankings } from "@/lib/college-programs/team-rankings-build"
import { saveTeamRankings } from "@/lib/college-programs/team-rankings-snapshot"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Wednesdays and Saturdays, October to March: read the NWCA's newest coaches polls and save each
 * college's ranking (lib/college-programs/team-rankings.ts). The polls come out on different days
 * for different levels, so twice a week keeps every level within a few days of its newest poll.
 *
 * It looks back 400 days and keeps the newest table for each poll, so a level whose new-season
 * poll has not started yet still shows last season's final one, with its date.
 *
 * The response lists what it could not place and what it skipped; that is the thing to read when
 * a college's ranking is missing.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const since = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10)
    const build = await buildTeamRankings(data.schools as PollSchool[], since)
    const saved = await saveTeamRankings(build)
    return NextResponse.json({
      ok: true,
      saved: saved.saved,
      rankings: build.rankings.length,
      polls: build.polls.map((p) => ({ poll: `${p.scope} ${p.gender} ${p.kind}`, date: p.date, teams: p.teams, unplaced: p.unmatched })),
      skipped: build.skipped,
    })
  } catch (e) {
    console.error("[college-team-rankings]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 })
  }
}
