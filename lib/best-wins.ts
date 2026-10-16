/**
 * A wrestler's three best wins, for the "Best 3" view that opens Significant Wins (Matt, 16
 * October 2026: "many kids will have a lot of significant wins.. how do we organize so not
 * overwhelming.. do we have 3 best wins anywhere?").
 *
 * Strongest first, the order Compare's best wins use (lib/athlete-comparison-rows.ts): nationally
 * ranked, state champion, All-American, NC ranked, state placer; newest first within a level. A
 * win whose credential only the family vouches for never headlines - a family-added win is in
 * only once we have confirmed the opponent's placing (lib/reported-win-state.ts).
 */

export type BestWinCandidate = {
  reason?: string | null
  stateFinish?: "champion" | "placer" | null
  source?: string | null
  date?: string | null
}

const TIERS = ["national-ranked", "state-champion", "national-placer", "ranked", "state-placer"] as const

/** Lower is stronger; null when the win cannot headline. */
export function bestWinTier(win: BestWinCandidate): number | null {
  if (win.source === "athlete-reported" && (!win.reason || win.reason === "credentialed")) return null
  if (win.reason === "national-ranked") return 0
  // A ranked opponent who won state is a state champion first.
  if (win.reason === "state-champion" || win.stateFinish === "champion") return 1
  const i = TIERS.indexOf(String(win.reason ?? "") as (typeof TIERS)[number])
  return i >= 0 ? i : null
}

const dayOf = (date: string | null | undefined): number => {
  const v = String(date ?? "").trim()
  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const ms = Date.parse(us ? `${us[3]}-${us[1]!.padStart(2, "0")}-${us[2]!.padStart(2, "0")}T12:00:00Z` : v)
  return Number.isFinite(ms) ? ms : 0
}

export function bestWins<T extends BestWinCandidate>(wins: readonly T[], count = 3): T[] {
  return wins
    .map((win) => ({ win, tier: bestWinTier(win) }))
    .filter((x): x is { win: T; tier: number } => x.tier != null)
    .sort((a, b) => a.tier - b.tier || dayOf(b.win.date) - dayOf(a.win.date))
    .slice(0, count)
    .map((x) => x.win)
}
