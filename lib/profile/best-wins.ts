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
 * Ordered by what the opponent is, then by date: nationally ranked, national champions, state
 * champions, other national placers, state placers. A national title outranks a state title
 * (Matt, 11 October 2026: an NHSCA champion had been listed under a two-time NC champion).
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
  /** The state the opponent's accolade was earned in, when it is not North Carolina's. */
  opponentState?: string | null
}

export type BestWin = { opponent: string; accolade: string; detail: string }

const TIER: Record<string, number> = { "national-ranked": 0, "state-champion": 2, "national-placer": 3, "state-placer": 4 }
/** A national placing that is a title: "2025 NHSCA Champion (113)". */
const tierOf = (win: BestWinInput, accolade: string) => (win.reason === "national-placer" && /champion/i.test(accolade) ? 1 : TIER[win.reason]!)

function dayMs(raw: string | null | undefined): number | null {
  const v = String(raw ?? "").trim()
  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const ms = Date.parse(us ? `${us[3]}-${us[1]!.padStart(2, "0")}-${us[2]!.padStart(2, "0")}T12:00:00Z` : v.length === 10 ? `${v}T12:00:00Z` : v)
  return Number.isFinite(ms) ? ms : null
}

const STATES = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" "))

/** A state named on the bout's team: "VA TEAM PREDATOR", "Tallwood (VA)", "PA". Null when none. */
function stateOnTeam(team: string | null | undefined): string | null {
  const text = String(team ?? "").trim().toUpperCase()
  const m = text.match(/^([A-Z]{2})(?:\s|$)/) ?? text.match(/\(([A-Z]{2})\)/)
  return m && STATES.has(m[1]!) ? m[1]! : null
}

/**
 * The bout puts him on one state's team and the accolade belongs to another's.
 *
 * Adam Walker's 10-1 win at the I-64 Fall Duals was over a Jackson Wells wrestling for "VA Team
 * Predator"; the accolade attached was Kentucky's Jackson Wells, the 2025 NHSCA champion and a
 * nationally ranked junior. It may be the same wrestler - travel teams carry out-of-state kids -
 * but nothing on file says so, and the top of a profile is no place for a maybe. The full list
 * keeps the win; this block does not.
 */
function stateConflicts(win: BestWinInput): boolean {
  const onTeam = stateOnTeam(win.opponentSchool)
  const earned = String(win.opponentState ?? "").trim().toUpperCase()
  return Boolean(onTeam && earned && onTeam !== earned)
}

export function bestWinsLast12Months(wins: readonly BestWinInput[], now: Date = new Date(), limit = 3): BestWin[] {
  const eligible: Array<{ win: BestWinInput; ms: number; accolade: string }> = []
  for (const win of wins) {
    if (!(win.reason in TIER) || stateConflicts(win)) continue
    const accolade = win.credential ?? win.nationalRankLabel ?? win.stateLabel ?? null
    // No accolade to print means nothing to stand behind.
    if (!accolade) continue
    const ms = dayMs(win.date)
    if (ms == null || ms > now.getTime() + 86_400_000 || now.getTime() - ms > 365 * 86_400_000) continue
    eligible.push({ win, ms, accolade })
  }
  const seen = new Set<string>()
  return eligible
    .sort((a, b) => tierOf(a.win, a.accolade) - tierOf(b.win, b.accolade) || b.ms - a.ms)
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
