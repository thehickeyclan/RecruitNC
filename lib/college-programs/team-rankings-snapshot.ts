import { list, put } from "@vercel/blob"

import type { RankingsBuild } from "@/lib/college-programs/team-rankings-build"
import type { TeamRanking } from "@/lib/college-programs/team-rankings"

/**
 * The saved team rankings: written by the weekly job, read by a college's page. The same
 * arrangement as the other snapshots (went-here-snapshot.ts) - a page never fetches a poll.
 *
 * A build that found no rankings is not saved. A week when the NWCA's site is down must leave
 * last week's rankings standing, not blank every college's page.
 */
const SNAPSHOT_PATH = "snapshots/college-team-rankings.json"

export async function saveTeamRankings(build: RankingsBuild): Promise<{ saved: boolean; bytes: number }> {
  if (build.rankings.length === 0) return { saved: false, bytes: 0 }
  const body = JSON.stringify(build)
  await put(SNAPSHOT_PATH, body, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 })
  return { saved: true, bytes: body.length }
}

let cached: { at: number; value: RankingsBuild } | null = null
const TEN_MINUTES = 600_000

export async function readTeamRankings(): Promise<RankingsBuild | null> {
  if (cached && Date.now() - cached.at < TEN_MINUTES) return cached.value
  let value: RankingsBuild | null = null
  try {
    const { blobs } = await list({ prefix: SNAPSHOT_PATH, limit: 1 })
    const url = blobs[0]?.url
    if (url) {
      const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" })
      if (response.ok) {
        const parsed = (await response.json()) as RankingsBuild
        if (Array.isArray(parsed?.rankings)) value = parsed
      }
    }
  } catch (e) {
    console.error("[team-rankings] could not read the saved rankings:", e instanceof Error ? e.message : e)
    value = null
  }
  // A failed or empty read is not remembered: the next page tries again rather than showing no rankings for ten minutes.
  if (value) cached = { at: Date.now(), value }
  return value
}

/** A college's rankings, men's before women's. Empty when it is unranked or nothing is saved. */
export async function teamRankingsForSchool(schoolId: string): Promise<TeamRanking[]> {
  const build = await readTeamRankings()
  return (build?.rankings ?? []).filter((r) => r.schoolId === schoolId).sort((a, b) => a.gender.localeCompare(b.gender))
}
