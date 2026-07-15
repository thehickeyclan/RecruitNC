/**
 * Historical Fargo leaderboards from season aggregate rows.
 * Freestyle / Greco / combined views.
 */

import type { FargoStyle } from "@/lib/fargo-division"
import { parseFargoStyle } from "@/lib/fargo-division"

export type FargoLeaderboardRow = {
  athlete_name: string
  state?: string | null
  titles: number
  finals: number
  allAmericans: number
  wins: number
  losses: number
  record: string
}

export type FargoSeasonLike = {
  athlete_name?: string | null
  state?: string | null
  style?: string | null
  division?: string | null
  placement?: number | null
  is_all_american?: boolean | null
  wins?: number | null
  losses?: number | null
}

export type FargoLeaderboardMetric =
  | "titles"
  | "finals"
  | "allAmericans"
  | "wins"
  | "bestRecord"

function rowStyle(r: FargoSeasonLike): FargoStyle {
  if (r.style) return parseFargoStyle(r.style)
  return parseFargoStyle(r.division)
}

export function buildFargoLeaderboard(
  rows: FargoSeasonLike[],
  opts?: {
    style?: FargoStyle | "combined"
    state?: string | null
    metric?: FargoLeaderboardMetric
    limit?: number
  },
): FargoLeaderboardRow[] {
  const style = opts?.style ?? "combined"
  const state = opts?.state?.toUpperCase() ?? null
  const metric = opts?.metric ?? "allAmericans"
  const limit = opts?.limit ?? 50

  const filtered = rows.filter((r) => {
    if (state && (r.state ?? "").toUpperCase() !== state) return false
    if (style !== "combined" && rowStyle(r) !== style) return false
    return Boolean(String(r.athlete_name ?? "").trim())
  })

  const byName = new Map<string, FargoLeaderboardRow>()
  for (const r of filtered) {
    const name = String(r.athlete_name).trim()
    const cur = byName.get(name.toLowerCase()) ?? {
      athlete_name: name,
      state: r.state ?? null,
      titles: 0,
      finals: 0,
      allAmericans: 0,
      wins: 0,
      losses: 0,
      record: "0-0",
    }
    const place = r.placement != null ? Number(r.placement) : null
    if (place === 1) cur.titles += 1
    if (place === 1 || place === 2) cur.finals += 1
    if (r.is_all_american || (place != null && place >= 1 && place <= 8)) cur.allAmericans += 1
    const w = Number(r.wins)
    const l = Number(r.losses)
    if (Number.isFinite(w)) cur.wins += w
    if (Number.isFinite(l)) cur.losses += l
    if (!cur.state && r.state) cur.state = r.state
    byName.set(name.toLowerCase(), cur)
  }

  const list = [...byName.values()].map((r) => ({
    ...r,
    record: `${r.wins}-${r.losses}`,
  }))

  list.sort((a, b) => {
    if (metric === "bestRecord") {
      const pa = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0
      const pb = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0
      if (pb !== pa) return pb - pa
      return b.wins - a.wins
    }
    const key = metric
    if (b[key] !== a[key]) return b[key] - a[key]
    return b.wins - a.wins
  })

  return list.slice(0, limit)
}
