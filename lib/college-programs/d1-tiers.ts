import "server-only"

import { readTeamRankings } from "@/lib/college-programs/team-rankings-snapshot"

/**
 * Division I Tier 1 and Tier 2 (Matt, 20 Oct 2026): Tier 1 is the top of Division I, "Iowa, Penn
 * State, Oklahoma State, Nebraska, Ohio State, Virginia Tech"; the rest of Division I is Tier 2.
 * Read from the latest NWCA Division I coaches poll we import, so it moves each season by itself
 * and nobody keeps a list. The top 10: every program Matt named sits in the top 7, NC State 8th is
 * Tier 1, UNC 15th is Tier 2.
 *
 * Men's only: the women's poll ranks all NCAA programs together, and girls carry no star yet.
 */
export const TIER1_CUTOFF = 10

export type D1Tiers = { tier1: Array<{ schoolId: string; rank: number }>; pollDate: string | null }

export async function loadD1Tiers(): Promise<D1Tiers> {
  const build = await readTeamRankings().catch(() => null)
  const poll = (build?.rankings ?? [])
    .filter((r) => r.scope === "NCAA Division I" && r.gender === "mens" && r.rank <= TIER1_CUTOFF)
    .sort((a, b) => a.rank - b.rank)
  return { tier1: poll.map((r) => ({ schoolId: r.schoolId, rank: r.rank })), pollDate: poll[0]?.pollDate ?? null }
}

export function d1TierOf(tiers: D1Tiers, schoolId: string): { tier: 1 | 2; rank: number | null } {
  const hit = tiers.tier1.find((t) => t.schoolId === schoolId)
  return hit ? { tier: 1, rank: hit.rank } : { tier: 2, rank: null }
}
