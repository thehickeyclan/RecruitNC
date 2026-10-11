/**
 * The three best wins of the last twelve months, for the top of a profile.
 *
 * Who he has beaten is the first thing a coach asks, and three names with what they have done say
 * more than a count (Matt, 11 October 2026). Being at the top of the page, a wrong one is far more
 * visible than a wrong one in a list of twenty, so only wins the matcher had evidence for are
 * eligible: a national ranking, a state title or placing, or a national placing - each of which
 * lib/significant-wins.ts checks against the opponent's school, state or weight. A win credited
 * on a North Carolina ranking alone is matched by name only, and stays in the full list below.
 *
 * Ordered by what the opponent is, then by date: nationally ranked, state champions,
 * All-Americans and national placers, state placers.
 */

export type BestWinInput = {
  opponent: string
  opponentSchool?: string | null
  event: string | null
  date: string | null
  result: string | null
  reason: string
  credential?: string | null
  nationalRankLabel?: string | null
  stateLabel?: string | null
}

export type BestWin = { opponent: string; accolade: string; detail: string }

const TIER: Record<string, number> = { "national-ranked": 0, "state-champion": 1, "national-placer": 2, "state-placer": 3 }

function dayMs(raw: string | null | undefined): number | null {
  const v = String(raw ?? "").trim()
  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const ms = Date.parse(us ? `${us[3]}-${us[1]!.padStart(2, "0")}-${us[2]!.padStart(2, "0")}T12:00:00Z` : v.length === 10 ? `${v}T12:00:00Z` : v)
  return Number.isFinite(ms) ? ms : null
}

export function bestWinsLast12Months(wins: readonly BestWinInput[], now: Date = new Date(), limit = 3): BestWin[] {
  const eligible: Array<{ win: BestWinInput; ms: number; accolade: string }> = []
  for (const win of wins) {
    if (!(win.reason in TIER)) continue
    const accolade = win.credential ?? win.nationalRankLabel ?? win.stateLabel ?? null
    // No accolade to print means nothing to stand behind.
    if (!accolade) continue
    const ms = dayMs(win.date)
    if (ms == null || ms > now.getTime() + 86_400_000 || now.getTime() - ms > 365 * 86_400_000) continue
    eligible.push({ win, ms, accolade })
  }
  const seen = new Set<string>()
  return eligible
    .sort((a, b) => TIER[a.win.reason]! - TIER[b.win.reason]! || b.ms - a.ms)
    // One line per opponent: beating the same wrestler twice is one name on a list of three.
    .filter(({ win }) => {
      const key = win.opponent.trim().toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
    .map(({ win, ms, accolade }) => ({
      opponent: win.opponent,
      accolade,
      detail: [win.result, win.event, new Date(ms).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })].filter(Boolean).join(" · "),
    }))
}
